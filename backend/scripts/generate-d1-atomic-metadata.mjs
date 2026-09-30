// Build-time schema metadata. This compiler reads no application records.
import {DatabaseSync} from 'node:sqlite'
import {readFile,writeFile,readdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const backend=fileURLToPath(new URL('../',import.meta.url))
const quote=name=>'"'+name.replaceAll('"','""')+'"'
const source=await readFile(path.join(backend,'prisma/schema.prisma'),'utf8')
const target=await readFile(path.join(backend,'prisma-d1/schema.prisma'),'utf8')
const hashes={source:createHash('sha256').update(source).digest('hex'),target:createHash('sha256').update(target).digest('hex')}
const enums=Object.fromEntries([...source.matchAll(/enum (\w+) \{([\s\S]*?)\n\}/g)].map(([,name,body])=>[name,[...body.matchAll(/^\s*(\w+)\s*$/gm)].map(match=>match[1])]))
const models={}
for(const [,name,body] of source.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)){
  const fields={}
  for(const line of body.split('\n')){
    const field=/^\s*(\w+)\s+([\w[\]?]+)(.*)/.exec(line)
    if(!field)continue
    const [,fieldName,kind,options]=field,native=/@db\.(\w+)(?:\(([^)]*)\))?/.exec(options)
    fields[fieldName]={kind:kind.replace(/\?$/,''),...(native?{native:native[1],nativeArgs:(native[2]||'').split(',').filter(Boolean).map(Number)}:{}),...(enums[kind.replace(/\?$/,'')]?{enum:enums[kind.replace(/\?$/,'')]}:{})}
  }
  models[name]=fields
}
const db=new DatabaseSync(':memory:')
for(const name of (await readdir(path.join(backend,'prisma-d1/migrations'))).filter(name=>name.endsWith('.sql')).sort()){
  const sql=await readFile(path.join(backend,'prisma-d1/migrations',name),'utf8')
  hashes[name]=createHash('sha256').update(sql).digest('hex');db.exec(sql)
}
const tables={}
for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()){
  if(['D1TxnRevision','D1TxnGuard'].includes(name))continue
  for(const event of ['insert','update','delete']){
    const trigger=db.prepare("SELECT sql FROM sqlite_master WHERE type='trigger' AND name=? AND tbl_name=?").get(`D1Revision_${name}_${event}`,name)
    if(!trigger?.sql.includes('"D1TxnRevision"'))throw new Error('D1_REVISION_TRIGGER_REQUIRED:'+name+':'+event)
  }
  const columns=db.prepare(`PRAGMA table_info(${quote(name)})`).all()
  const pk=columns.filter(column=>column.pk).sort((a,b)=>a.pk-b.pk).map(column=>column.name)
  const unique=pk.length?[pk]:[]
  for(const index of db.prepare(`PRAGMA index_list(${quote(name)})`).all())if(index.unique){
    const fields=db.prepare(`PRAGMA index_info(${quote(index.name)})`).all().map(column=>column.name)
    if(!unique.some(existing=>JSON.stringify(existing)===JSON.stringify(fields)))unique.push(fields)
  }
  const foreign=new Map()
  for(const row of db.prepare(`PRAGMA foreign_key_list(${quote(name)})`).all()){
    if(!foreign.has(row.id))foreign.set(row.id,[])
    foreign.get(row.id).push(row)
  }
  const foreignKeys=[...foreign.values()].map(rows=>{rows.sort((a,b)=>a.seq-b.seq);return {table:rows[0].table,fields:rows.map(row=>row.from),references:rows.map(row=>row.to),onUpdate:rows[0].on_update,onDelete:rows[0].on_delete}})
  const relations=Object.fromEntries(Object.entries(models[name]||{}).filter(([,field])=>models[field.kind.replace(/\[\]$/,'')]).map(([key,field])=>[key,field.kind.replace(/\[\]$/,'')]))
  tables[name]={relations,columns:columns.map(column=>({name:column.name,type:column.type,required:Boolean(column.notnull),default:column.dflt_value,...models[name]?.[column.name]})),pk,unique,foreignKeys}
}
db.close()
await writeFile(path.join(backend,'src/platform/database/atomic/schema.js'),`// Generated schema metadata; no application records.\nexport const schema = ${JSON.stringify({hashes,tables},null,2)}\n`)
console.log(`D1 atomic metadata: ${Object.keys(tables).length} tables`)
