import {readFile,realpath,lstat} from 'node:fs/promises'
import path from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {root,localEnvironment} from '../local-cloudflare-policy.js'
import {fileObjectKey} from '../../backend/src/platform/files/keys.js'
import {fail,hash,parseExact,exactJSON,keyFor,sameNames,schemaModels,convertValue,decodeCopy,decimalSum} from './values.js'
const run=promisify(execFile)
const fileModels={DocumentAsset:['documentAsset','key'],EvidenceAttachment:['evidenceAttachment','id'],WebsiteImage:['websiteImage','id']}
export function copyNulls(text,models){
  const result=new Map();let table=null,columns=null
  for(const line of text.split('\n')){
    const header=line.match(/^COPY app_private\."?([A-Za-z_][A-Za-z0-9_]*)"? \((.*)\) FROM stdin;$/)
    if(header){table=models.has(header[1])?header[1]:null;columns=header[2].split(',').map(name=>name.trim().replaceAll('"',''));if(table)result.set(table,new Map());continue}
    if(line==='\\.'){table=null;continue}
    if(!table)continue
    const fields=line.split('\t');if(fields.length!==columns.length)fail('COPY_COLUMN_COUNT:'+table)
    const values=Object.fromEntries(columns.map((name,index)=>[name,decodeCopy(fields[index])]))
    const model=models.get(table)
    for(const name of model.primary)if(model.fields.find(field=>field.name===name).type==='Int')values[name]=Number(values[name])
    const key=keyFor(values,model.primary),entries=result.get(table)
    if(entries.has(key))fail('DUPLICATE_COPY_PRIMARY_KEY:'+table)
    entries.set(key,new Set(columns.filter((_name,index)=>fields[index]==='\\N')))
  }
  return result
}
export async function loadSource(sourcePath,workdir){
  const directory=await realpath(sourcePath)
  if(directory===root||directory.startsWith(root+path.sep))fail('SOURCE_BACKUP_MUST_BE_OUTSIDE_REPOSITORY')
  const parent=path.dirname(directory),checksums=new Map()
  for(const line of (await readFile(path.join(parent,'SHA256SUMS'),'utf8')).trim().split('\n')){
    const match=line.match(/^([0-9a-f]{64}) {2}(.+)$/);if(!match)fail('INVALID_BACKUP_CHECKSUM_LIST');checksums.set(match[2],match[1])
  }
  async function verified(relative){
    const absolute=path.join(parent,relative)
    if(!absolute.startsWith(parent+path.sep)||(await lstat(absolute)).isSymbolicLink()||await realpath(absolute)!==absolute)fail('UNSAFE_BACKUP_PATH')
    const data=await readFile(absolute)
    if(!checksums.has(relative)||hash(data)!==checksums.get(relative))fail('BACKUP_CHECKSUM_MISMATCH')
    return data
  }
  const prefix=path.basename(directory)+'/',manifestBytes=await verified(prefix+'manifest.json')
  const manifest=JSON.parse(manifestBytes),metadata=JSON.parse(await verified(prefix+'columns.json'))
  if(manifest.formatVersion!==1||manifest.sourceRef!=='qplzgpyidszxbtbyknjc'||manifest.readOnly!==true||manifest.consistentSnapshot!==true)fail('VERIFIED_GREENVIEW_SNAPSHOT_REQUIRED')
  const dump=await verified('source-database.private.dump')
  if(hash(dump)!==manifest.archiveSha256)fail('DUMP_MANIFEST_MISMATCH')
  const pgText=await readFile(path.join(root,'backend/prisma/schema.prisma'),'utf8')
  const d1Text=await readFile(path.join(root,'backend/prisma-d1/schema.prisma'),'utf8')
  const models=schemaModels(pgText),d1Models=schemaModels(d1Text)
  const copyFile=path.join(workdir,'source-copy.private.sql')
  await run('/opt/homebrew/opt/libpq/bin/pg_restore',['--data-only','--schema=app_private','--file='+copyFile,path.join(parent,'source-database.private.dump')],{env:localEnvironment(),timeout:30000,maxBuffer:1048576})
  await verified('source-database.private.dump')
  const nulls=copyNulls(await readFile(copyFile,'utf8'),models)
  const records=manifest.tables.filter(table=>table.schema==='app_private'&&table.name!=='_prisma_migrations')
  if(!sameNames(records.map(table=>table.name),models.keys())||!sameNames(nulls.keys(),models.keys()))fail('SOURCE_MODEL_SET_MISMATCH')
  const tables=[],files=[],money=[],stats={timestamps:0,dateOnly:0,jsonValues:0,jsonNull:0,sqlNull:0,scalarArrays:0}
  for(const record of records){
    if(record.file!=='app_private/'+record.name+'.jsonl')fail('INVALID_SOURCE_TABLE_PATH')
    const bytes=await verified(prefix+record.file)
    if(hash(bytes)!==record.sha256)fail('TABLE_MANIFEST_MISMATCH:'+record.name)
    const originals=bytes.toString().trim()?bytes.toString().trimEnd().split('\n').map(parseExact):[]
    const model=models.get(record.name),target=d1Models.get(record.name)
    const columns=metadata.filter(column=>column.table_schema==='app_private'&&column.table_name===record.name)
    if(!sameNames(columns.map(column=>column.column_name),model.fields.map(field=>field.name)))fail('SOURCE_SCHEMA_DRIFT:'+record.name)
    if(originals.length!==record.rows||nulls.get(record.name).size!==record.rows)fail('SOURCE_ROW_COUNT_MISMATCH:'+record.name)
    const expected=model.fields.map(field=>field.type==='Bytes'?'objectKey':field.name)
    if(!target||!sameNames(expected,target.fields.map(field=>field.name))||!sameNames(model.primary,target.primary))fail('D1_MODEL_DRIFT:'+record.name)
    const converted=[],keys=new Set()
    for(const row of originals){
      if(!sameNames(Object.keys(row),model.fields.map(field=>field.name)))fail('SOURCE_ROW_SHAPE:'+record.name)
      const key=keyFor(row,model.primary),sqlNulls=nulls.get(record.name).get(key)
      if(!sqlNulls||keys.has(key))fail('SOURCE_COPY_IDENTITY_MISMATCH:'+record.name)
      keys.add(key);const output={}
      for(const field of model.fields){
        const value=row[field.name],sqlNull=sqlNulls.has(field.name)
        if(sqlNull&&value!==null)fail('SOURCE_NULL_MISMATCH:'+record.name)
        if(field.type==='Bytes'){
          const spec=fileModels[record.name];if(!spec||typeof value!=='string'||!/^\\x(?:[0-9a-f]{2})*$/i.test(value))fail('INVALID_FILE_BYTES')
          const content=Buffer.from(value.slice(2),'hex'),objectKey=fileObjectKey(spec[0],row[spec[1]])
          if(hash(content)!==row.sha256||(row.size!==undefined&&Number(row.size.text)!==content.length))fail('SOURCE_FILE_INTEGRITY:'+record.name)
          files.push({objectKey,content,sha256:row.sha256,mimeType:row.mimeType,size:content.length});output.objectKey=objectKey;continue
        }
        output[field.name]=convertValue(value,field,{sqlNull})
        if((field.type==='Json'||field.array)&&output[field.name]!==null&&exactJSON(JSON.parse(output[field.name]))!==output[field.name])fail('APPLICATION_JSON_PRECISION_REVIEW:'+record.name+'.'+field.name)
        if(sqlNull)stats.sqlNull++
        if(field.type==='Json'&&!sqlNull){stats.jsonValues++;if(value===null)stats.jsonNull++}
        if(field.array&&!sqlNull)stats.scalarArrays++
        if(field.type==='DateTime'&&!sqlNull){if(/@db\.Date(?:\s|$)/.test(field.attributes))stats.dateOnly++;else stats.timestamps++}
      }
      if(Object.keys(output).length>100)fail('D1_PARAMETER_LIMIT:'+record.name)
      if(Buffer.byteLength(JSON.stringify(output))>1500000)fail('D1_ROW_SIZE_REVIEW:'+record.name)
      converted.push(output)
    }
    for(const field of model.fields.filter(field=>field.type==='Decimal'))money.push({table:record.name,column:field.name,rows:originals.filter(row=>row[field.name]!==null).length,sum:decimalSum(originals.map(row=>row[field.name]))})
    tables.push({...model,columns:target.fields.map(field=>field.name),originals,rows:converted,sourceHash:record.sha256})
  }
  if(new Set(files.map(file=>file.objectKey)).size!==files.length)fail('DUPLICATE_R2_OBJECT_KEY')
  const authRecord=manifest.tables.find(table=>table.schema==='auth'&&table.name==='users')
  if(!authRecord||authRecord.file!=='auth/users.jsonl')fail('AUTH_IDENTITY_SNAPSHOT_REQUIRED')
  const authBytes=await verified(prefix+authRecord.file)
  if(hash(authBytes)!==authRecord.sha256)fail('AUTH_SNAPSHOT_HASH_MISMATCH')
  const authIds=new Set(authBytes.toString().trimEnd().split('\n').filter(Boolean).map(line=>JSON.parse(line).id))
  const profiles=tables.find(table=>table.name==='UserProfile').rows,customers=tables.find(table=>table.name==='CustomerProfile').rows
  const identity={sourceAuthUsers:authIds.size,staffProfiles:profiles.length,customerProfiles:customers.length,missingStaffAuth:profiles.filter(row=>!authIds.has(row.id)).length,missingCustomerAuth:customers.filter(row=>!authIds.has(row.authUserId)).length,authCredentialsImported:false}
  identity.readyForAuthCutover=identity.missingStaffAuth===0&&identity.missingCustomerAuth===0
  // Preserve source orphan profiles unchanged; never invent an Auth account or discard business rows.
  const fingerprint=hash([hash(manifestBytes),hash(pgText),hash(d1Text)].join(':'))
  const summary={sourceRef:manifest.sourceRef,sourceSnapshotAt:manifest.completedAt,fingerprint,tables:tables.length,rows:tables.reduce((n,table)=>n+table.rows.length,0),files:files.length,moneyFields:money.length,identity,stats}
  const identityIssues={staff:profiles.filter(row=>!authIds.has(row.id)).map(row=>({id:row.id,status:row.status})),customers:customers.filter(row=>!authIds.has(row.authUserId)).map(row=>({id:row.id,authUserId:row.authUserId,status:row.status})),action:'PRESERVED_UNCHANGED_AUTH_CUTOVER_BLOCKED'}
  return {directory,tables,files,money,summary,identityIssues}
}
