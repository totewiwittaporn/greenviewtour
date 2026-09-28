// Retained owner-authorized fixtures. Never load a production target.
import assert from 'node:assert/strict'
import {createHash,randomBytes} from 'node:crypto'
import {loadEnvFile} from 'node:process'
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {createDatabasePool} from '../../src/platform/database/pool.js'
import {createPrisma} from '../../src/platform/database/prisma.js'
export {assert,randomBytes,readFileSync,writeFileSync,mkdirSync,existsSync}
loadEnvFile(new URL('../../.env',import.meta.url))
assert.equal(process.env.APP_ENV,'preview');assert.equal(process.env.SUPABASE_PROJECT_REF,'qplzgpyidszxbtbyknjc');assert.equal(process.env.SUPABASE_URL,'https://qplzgpyidszxbtbyknjc.supabase.co');assert.notEqual(process.env.NODE_ENV,'production')
export const PREFIX='D45-260925',NAME='DEMO 45D · ',TAG='greenview-demo45-20260925',OUT='/Users/tootee/Downloads/Greenview-DEMO-45D-2026-09-25'
export const pool=createDatabasePool(),db=createPrisma(pool)
export const day=n=>new Date(Date.UTC(2026,8,26+n)).toISOString().slice(0,10)
export const date=s=>new Date(s+'T00:00:00Z'),stamp=(d,t)=>new Date(d+'T'+t+':00+07:00')
export const id=key=>{const h=createHash('sha256').update(TAG+':'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`}
export const code=k=>{const v=PREFIX+'-'+k.toUpperCase();assert.ok(v.length<=40,'Fixture code length');return v}
export const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
export const nested=tx=>new Proxy(tx,{get(target,key){if(key==='$transaction')return fn=>fn(target);return target[key]}})
export const roles=[['captain','CAPTAIN','CAPTAIN',3,28000],['guide','GUIDE','GUIDE',3,24000],['assistant-guide','ASSISTANT_TOUR_GUIDE','GUIDE',6,16000],['assistant-captain','ASSISTANT_CAPTAIN','CAPTAIN',6,17000],['driver','DRIVER','DRIVER',1,18000],['booking-manager','HEAD_BOOKING','BOOKING',1,26000],['booking','BOOKING','BOOKING',3,18000],['head-housekeeping','HEAD_HOUSEKEEPING','HOUSEKEEPING',1,18000],['housekeeping','HOUSEKEEPING','HOUSEKEEPING',2,14000]]
export const staff=roles.flatMap(([key,role,department,count,salary])=>Array.from({length:count},(_,i)=>({key:key+'-'+(i+1),id:id('staff-'+key+'-'+(i+1)),role,department,salary,displayName:NAME+role.replaceAll('_',' ')+' '+String(i+1).padStart(2,'0'),email:`d45.${key}${i+1}@greenviewtour.test`})))
export const customers=Array.from({length:3},(_,i)=>({key:'member-'+(i+1),id:id('member-auth-'+(i+1)),customerId:id('member-profile-'+(i+1)),displayName:NAME+'Customer '+(i+1),email:`d45.member${i+1}@greenviewtour.test`,role:'MEMBER'}))
export async function actor(){const u=await db.userProfile.findFirst({where:{status:'ACTIVE',roles:{some:{roleCode:'ADMIN_MANAGER',scope:'COMPANY'}}}});assert.ok(u,'Existing company administrator required');return u.id}
export async function marker(tx,key,result){await tx.operationCommand.create({data:{id:id('stage-'+key),requestHash:hash({TAG,key}),result:JSON.parse(JSON.stringify(result))}})}
export async function stage(key,fn,{timeout=600000}={}){return db.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(7082027)`;const old=await tx.operationCommand.findUnique({where:{id:id('stage-'+key)}});if(old){console.log(JSON.stringify({stage:key,status:'PRESERVED'}));return old.result}const result=await fn(tx,nested(tx));await marker(tx,key,result??{ok:true});console.log(JSON.stringify({stage:key,status:'PERSISTED',...result}));return result},{timeout,maxWait:20000})}
export async function close(){await db.$disconnect();await pool.end()}
export function requireApply(){assert.ok(process.argv.includes('--apply'),'This persistent seed requires --apply. No changes made.');mkdirSync(OUT,{recursive:true,mode:0o700})}
export function saveReport(name,data){writeFileSync(OUT+'/'+name+'.json',JSON.stringify(data,null,2),{mode:0o600})}
export function safeError(e,stage){console.error(JSON.stringify({stage,result:'FAILED',code:e.code||e.name,reason:e.name==='AssertionError'?e.message:undefined}));process.exitCode=1}
