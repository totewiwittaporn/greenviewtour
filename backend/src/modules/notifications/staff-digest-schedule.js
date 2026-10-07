import {bangkokSchedule} from '../operations/notifications.js'
import {prepareStaffDailyDigests,deliverStaffDailyDigest} from './staff-digest.js'
import {staffLineSettings} from '../../platform/line/staff-config.js'

export const DAILY_WORK_ASSIGNMENT_CRON='0 16 * * *'
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

export function staffDigestTickPlan({now=new Date(),localTime}={}){
 if(!(now instanceof Date)||!Number.isFinite(+now))throw new Error('INVALID_DATE')
 if(typeof localTime!=='string'||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(localTime))throw new Error('STAFF_DIGEST_TIME_REQUIRED')
 const local=new Date(+now+7*3600000)
 const minutes=local.getUTCHours()*60+local.getUTCMinutes()
 const [hour,minute]=localTime.split(':').map(Number)
 const localDate=local.toISOString().slice(0,10)
 const {serviceDate}=bangkokSchedule(now)
 return {timezone:'Asia/Bangkok',localDate,serviceDate,localTime,due:minutes>=hour*60+minute,schedulerEnabled:false,deliveryEnabled:false}
}

export async function prepareStaffDigestTick(db,{actorId,config,localTime,now=new Date()},prepare=prepareStaffDailyDigests){
 const plan=staffDigestTickPlan({now,localTime})
 if(!plan.due)return {...plan,status:'NOT_DUE',rows:[]}
 if(typeof prepare!=='function')throw new Error('STAFF_DIGEST_PREPARER_REQUIRED')
 const result=await prepare(db,{actorId,config,serviceDate:plan.serviceDate,mode:'simulation',now})
 return {...plan,status:'PREPARED',result}
}

export function automaticStaffDigestGate(env={},config=staffLineSettings(env),cron=DAILY_WORK_ASSIGNMENT_CRON){
 if(env.APP_ENV!=='production')return {enabled:false,reason:'PRODUCTION_ONLY'}
 if(env.PRODUCTION_ENABLED!=='true')return {enabled:false,reason:'PRODUCTION_DISABLED'}
 if(env.DAILY_WORK_ASSIGNMENT_AUTO_SEND!=='true')return {enabled:false,reason:'AUTO_SEND_DISABLED'}
 if(cron!==DAILY_WORK_ASSIGNMENT_CRON)return {enabled:false,reason:'UNEXPECTED_CRON'}
 if(!uuid(env.DAILY_WORK_ASSIGNMENT_ACTOR_ID))return {enabled:false,reason:'ACTOR_REQUIRED'}
 if(config?.enabled!==true||config?.mode!=='live'||typeof config.accessToken!=='string'||!config.accessToken)return {enabled:false,reason:'LINE_NOT_LIVE'}
 return {enabled:true,reason:null,actorId:env.DAILY_WORK_ASSIGNMENT_ACTOR_ID}
}

export async function runAutomaticStaffDigests(db,{env={},cron=DAILY_WORK_ASSIGNMENT_CRON,now=new Date(),transport=fetch,prepare=prepareStaffDailyDigests,deliver=deliverStaffDailyDigest,lineConfig}={}){
 if(!(now instanceof Date)||!Number.isFinite(+now))throw new Error('INVALID_DATE')
 const line=lineConfig||staffLineSettings(env)
 const gate=automaticStaffDigestGate(env,line,cron)
 const plan=staffDigestTickPlan({now,localTime:'23:00'})
 if(!gate.enabled)return {...plan,status:'DISABLED',reason:gate.reason,prepared:0,delivered:0}
 const config={...line,liveEnabled:true,automaticEnabled:true,baseUrl:line.origin||env.BACKOFFICE_ORIGIN}
 const prepared=await prepare(db,{actorId:gate.actorId,serviceDate:plan.serviceDate,config,mode:'live',now})
 const delivered=[]
 for(const row of prepared.rows||[])delivered.push(await deliver(db,{actorId:gate.actorId,id:row.id,config,mode:'live',enabled:true,scope:'scheduled',now,transport}))
 return {...plan,status:'COMPLETE',reason:null,prepared:(prepared.rows||[]).length,skipped:prepared.skipped||[],delivered:delivered.length,results:delivered}
}
