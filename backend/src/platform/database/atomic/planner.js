import {randomUUID} from 'node:crypto'
import {schema} from './schema.js'
import {tokens,text,quote,qualify,mutation,identifier,findTop} from './sql.js'
import {tableInfo,keyFor,normalizeRow,decimalAssignment,queryWithOverlay,databaseError,limits} from './overlay.js'
import {derivedChanges} from './derived.js'
const nativeValue=value=>value instanceof Date?value.toISOString().replace('Z','+00:00'):typeof value==='boolean'?Number(value):value
const equality=(fields,row,args)=>fields.map(field=>{args.push(row[field]);return `${quote(field)} IS ?${args.length}`}).join(' AND ')
const emptyResult=()=>({results:[],success:true,meta:{changes:0}})
export class D1AtomicPlanner {
  constructor(database,{readOnly=false,maxQueries=limits.queries}={}){
    this.database=database.withSession?.('first-primary')||database
    this.readOnly=readOnly;this.maxQueries=maxQueries;this.queries=0
    this.changes=new Map();this.statements=[];this.serial=Promise.resolve();this.closed=false
    this.binding={prepare:sql=>this.prepare(sql),batch:async statements=>{const results=[];for(const statement of statements)results.push(await statement.run());return results},withSession:()=>this.binding}
  }
  async start(){const row=await this.database.prepare('SELECT version FROM D1TxnRevision WHERE id=1').first();if(!Number.isSafeInteger(row?.version))throw databaseError('D1_ATOMIC_MIGRATION_REQUIRED',503);this.version=row.version}
  async currentVersion(){return (await this.database.prepare('SELECT version FROM D1TxnRevision WHERE id=1').first()).version}
  savepoint(){return {changes:new Map([...this.changes].map(([name,rows])=>[name,new Map([...rows].map(([key,row])=>[key,{...row}]))])),statements:this.statements.length}}
  restore(point){this.changes=point.changes;this.statements.length=point.statements}
  setRow(table,row,deleted){
    if(!this.changes.has(table))this.changes.set(table,new Map())
    this.changes.get(table).set(keyFor(table,row),{...row,__deleted:deleted?1:0})
    if([...this.changes.values()].reduce((n,rows)=>n+rows.size,0)>limits.rows)throw databaseError('D1_UNIT_ROW_LIMIT',413)
  }
  changeRow(table,before,after){this.setRow(table,after||before,!after);derivedChanges(this,table,before,after)}
  async select(sql,args=[],options={}){
    if(this.closed)throw databaseError('D1_UNIT_CLOSED')
    if(++this.queries>this.maxQueries)throw databaseError('D1_UNIT_QUERY_LIMIT',413)
    const query=queryWithOverlay(sql,args.map(nativeValue),this.changes,options)
    const [columns,...rawRows]=await this.database.prepare(query.sql).bind(...query.args).raw({columnNames:true})
    return {success:true,columns,rawRows,results:rawRows.map(values=>Object.fromEntries(columns.map((name,index)=>[name,values[index]]))),meta:{changes:0}}
  }
  queue(table,before,after){
    const info=tableInfo(table),args=[]
    let sql
    if(!before){
      args.push(...info.columns.map(column=>after[column.name]))
      sql=`INSERT INTO ${quote(table)} (${info.columns.map(column=>quote(column.name)).join(',')}) VALUES (${args.map(()=>'?').join(',')})`
    }else if(!after){sql=`DELETE FROM ${quote(table)} WHERE ${equality(info.pk,before,args)}`}
    else{
      const fields=info.columns.filter(column=>JSON.stringify(before[column.name])!==JSON.stringify(after[column.name])).map(column=>column.name)
      if(!fields.length)return
      const set=fields.map(field=>{args.push(after[field]);return `${quote(field)}=?${args.length}`}).join(',')
      sql=`UPDATE ${quote(table)} SET ${set} WHERE ${equality(info.pk,before,args)}`
    }
    this.statements.push({sql,args})
    if(this.statements.length>limits.statements)throw databaseError('D1_UNIT_STATEMENT_LIMIT',413)
  }
  prepare(sql,args=[]){
    const self=this
    return {sql,args,bind(...values){return self.prepare(sql,values)},all(){return self.execute(sql,args)},
      async run(){return self.execute(sql,args)},
      async first(column){const result=await self.execute(sql,args);const row=result.results[0]??null;return column&&row?row[column]:row},
      async raw({columnNames=false}={}){const result=await self.execute(sql,args),names=result.columns||Object.keys(result.results[0]||{});const rows=result.rawRows||result.results.map(row=>names.map(name=>row[name]));return columnNames?[names,...rows]:rows},
    }
  }
  execute(sql,args){
    const task=this.serial.then(async()=>{
      if(this.closed)throw databaseError('D1_UNIT_CLOSED')
      const write=mutation(sql)
      if(!write){
        const readTokens=tokens(sql)
        if(!['SELECT','WITH'].includes(readTokens[0]?.raw.toUpperCase())||['INSERT','UPDATE','DELETE','REPLACE'].some(kind=>findTop(readTokens,kind)>=0))throw databaseError('D1_READ_STATEMENT_REQUIRED')
        return this.select(sql,args)
      }
      if(this.readOnly)throw databaseError('D1_READ_ONLY_UNIT')
      const point=this.savepoint()
      try{return await this.mutate(write,args.map(nativeValue))}catch(error){this.restore(point);throw error}
    })
    this.serial=task.catch(()=>{})
    return task
  }
  async conflicts(table,row,keys){
    const info=tableInfo(table),args=[],alternatives=(keys?[keys]:info.unique).filter(fields=>fields.every(field=>row[field]!==null)).map(fields=>'('+equality(fields,row,args)+')')
    if(!alternatives.length)return []
    return (await this.select(`SELECT * FROM ${quote(table)} WHERE ${alternatives.join(' OR ')} LIMIT 2`,args)).results
  }
  async insert(write,args){
    const info=tableInfo(write.table),candidates=[]
    if(write.fields.some(field=>!info.columns.some(column=>column.name===field)))throw databaseError('D1_INSERT_FIELD_INVALID')
    if(write.values){
      for(const tuple of write.values){
        const expressions=new Map(write.fields.map((field,index)=>[field,text(tuple[index])]))
        const projection=info.columns.map(column=>`${expressions.get(column.name)??column.default??'NULL'} AS ${quote(column.name)}`).join(',')
        candidates.push((await this.select('SELECT '+projection,args)).results[0])
      }
    }else{
      const selected=await this.select(text(write.select),args)
      for(const values of selected.results){
        const names=Object.keys(values)
        if(names.length!==write.fields.length)throw databaseError('D1_INSERT_SELECT_ARITY')
        const row=Object.fromEntries(write.fields.map((field,index)=>[field,values[names[index]]]))
        const defaults=info.columns.filter(column=>!write.fields.includes(column.name))
        if(defaults.length)Object.assign(row,(await this.select('SELECT '+defaults.map(column=>`${column.default??'NULL'} AS ${quote(column.name)}`).join(','))).results[0])
        candidates.push(row)
      }
    }
    const returned=[]
    for(const candidate of candidates){
      const row=normalizeRow(write.table,candidate)
      const matches=write.conflict||write.conflictMode?await this.conflicts(write.table,row,write.conflict?.keys):[]
      if(matches.length){
        if(write.conflictMode==='IGNORE'||write.conflict?.action==='NOTHING')continue
        if(write.conflictMode==='REPLACE')for(const existing of matches)await this.remove(write.table,existing)
        else if(write.conflict?.action==='UPDATE'){
          if(matches.length!==1)throw databaseError('P2002')
          const before=matches[0],whereArgs=[],where=equality(info.pk,before,whereArgs)
          const replaceExcluded=input=>{
            const qualified=qualify(input),out=[]
            for(let index=0;index<qualified.length;index++){
              const token=qualified[index]
              if(['identifier','word'].includes(token.kind)&&identifier(token)==='excluded'&&qualified[index+1]?.raw==='.'){
                const field=identifier(qualified[index+2]);args.push(row[field]);out.push(...tokens('?'+args.length));index+=2
              }else out.push(token)
            }
            return out
          }
          const updates=write.conflict.assignments.map(item=>({...item,expression:replaceExcluded(item.expression)}))
          const criteria=write.conflict.where.length?'('+text(replaceExcluded(write.conflict.where))+') AND ':''
          const start=args.length;args.push(...whereArgs)
          const keys=where.replace(/\?(\d+)/g,(_,number)=>'?'+(Number(number)+start))
          const changed=await this.update({...write,kind:'UPDATE',assignments:updates,where:tokens(criteria+keys),returning:[]},args)
          returned.push(...changed.rows);continue
        }else throw databaseError('P2002')
      }
      this.queue(write.table,null,row);this.changeRow(write.table,null,row);returned.push(row)
    }
    return {rows:returned,count:returned.length}
  }
  async update(write,args){
    const info=tableInfo(write.table),where=write.where.length?' WHERE '+text(write.where):''
    if(write.assignments.some(item=>!info.columns.some(column=>column.name===item.field)))throw databaseError('D1_UPDATE_FIELD_INVALID')
    const before=(await this.select(`SELECT * FROM ${quote(write.table)}${where}`,args)).results
    if(before.length>limits.rows)throw databaseError('D1_UNIT_ROW_LIMIT',413)
    const assignments=new Map(write.assignments.map(item=>[item.field,item.expression]))
    const projection=info.columns.map(column=>`${assignments.has(column.name)?text(assignments.get(column.name)):quote(column.name)} AS ${quote(column.name)}`).join(',')
    const after=(await this.select(`SELECT ${projection} FROM ${quote(write.table)}${where}`,args)).results
    if(before.length!==after.length)throw databaseError('D1_ATOMIC_SNAPSHOT')
    const originalByKey=new Map(before.map(row=>[keyFor(write.table,row),row])),changed=[]
    for(const input of after){
      const original=originalByKey.get(keyFor(write.table,input))
      if(!original)throw databaseError('D1_PRIMARY_KEY_UPDATE_NOT_ALLOWED')
      for(const column of info.columns)if(assignments.has(column.name)&&(column.kind==='Decimal'||column.type==='DECIMAL'))input[column.name]=decimalAssignment(assignments.get(column.name),original,args)
      const row=normalizeRow(write.table,input)
      this.queue(write.table,original,row);this.changeRow(write.table,original,row);changed.push(row)
    }
    return {rows:changed,count:changed.length}
  }
  async remove(table,row,{cascade=false}={}){
    for(const [child,info] of Object.entries(schema.tables))for(const fk of info.foreignKeys.filter(fk=>fk.table===table)){
      const args=[],where=fk.fields.map((field,index)=>{args.push(row[fk.references[index]]);return `${quote(field)} IS ?${args.length}`}).join(' AND ')
      const references=(await this.select(`SELECT * FROM ${quote(child)} WHERE ${where}`,args)).results
      if(references.length&&['RESTRICT','NO ACTION'].includes(fk.onDelete))throw databaseError('P2003')
      for(const reference of references){
        if(fk.onDelete==='CASCADE')await this.remove(child,reference,{cascade:true})
        else if(fk.onDelete==='SET NULL')this.changeRow(child,reference,{...reference,...Object.fromEntries(fk.fields.map(field=>[field,null]))})
        else if(references.length)throw databaseError('D1_FOREIGN_KEY_ACTION_UNSUPPORTED')
      }
    }
    if(!cascade)this.queue(table,row,null)
    this.changeRow(table,row,null)
  }
  async mutate(write,args){
    tableInfo(write.table)
    let result
    if(write.kind==='INSERT')result=await this.insert(write,args)
    else if(write.kind==='UPDATE')result=await this.update(write,args)
    else{
      const rows=(await this.select(`SELECT * FROM ${quote(write.table)}${write.where.length?' WHERE '+text(write.where):''}`,args)).results
      for(const row of rows)await this.remove(write.table,row)
      result={rows,count:rows.length}
    }
    if(!write.returning.length)return {...emptyResult(),meta:{changes:result.count}}
    if(!result.rows.length)return emptyResult()
    const selected=await this.select(`SELECT ${text(write.returning)} FROM "__gv_return" AS ${quote(write.table)}`,args,{returns:{table:write.table,rows:result.rows}})
    return {...selected,meta:{...selected.meta,changes:result.count}}
  }
  async commit(){
    await this.serial
    if(this.closed)throw databaseError('D1_UNIT_CLOSED')
    if(!this.statements.length){const valid=await this.currentVersion()===this.version;this.closed=true;if(!valid)throw databaseError('D1_ATOMIC_SNAPSHOT');return}
    if(this.queries+this.statements.length+2>this.maxQueries)throw databaseError('D1_UNIT_QUERY_LIMIT',413)
    const token=randomUUID(),batch=[this.database.prepare('INSERT INTO D1TxnGuard(id,valid) VALUES(?,CASE WHEN (SELECT version FROM D1TxnRevision WHERE id=1)=? THEN 1 ELSE 0 END)').bind(token,this.version)]
    for(const statement of this.statements){
      const query=queryWithOverlay(statement.sql,statement.args,new Map())
      batch.push(this.database.prepare(query.sql).bind(...query.args))
    }
    batch.push(this.database.prepare('DELETE FROM D1TxnGuard WHERE id=?').bind(token))
    try{await this.database.batch(batch);this.closed=true}catch(error){
      this.closed=true
      const message=error.message||''
      if(message.includes('D1_ATOMIC_SNAPSHOT'))throw databaseError('D1_ATOMIC_SNAPSHOT')
      if(/UNIQUE constraint/i.test(message))throw databaseError('P2002')
      if(/FOREIGN KEY constraint/i.test(message))throw databaseError('P2003')
      throw error
    }
  }
}
