// Read-only readiness probe. Fixed loopback target; no credentials or redirects.
import {localPreflight} from './local-cloudflare-safety.js'
try{
 if(process.argv.length!==2)throw new Error('LOCAL_HEALTH_ARGUMENTS_FORBIDDEN')
 await localPreflight()
 const results={environment:'local'}
 for(const [name,endpoint] of [['worker','live'],['D1','db'],['R2','storage']]){
  const response=await fetch('http://127.0.0.1:8787/health/'+endpoint,{redirect:'error',signal:AbortSignal.timeout(5000)})
  if(!response.ok)throw new Error('LOCAL_HEALTH_UNAVAILABLE')
  const body=await response.json()
  if(body.status!=='UP'||endpoint==='live'&&body.environment!=='local')throw new Error('LOCAL_HEALTH_TARGET_INVALID')
  results[name]='UP'
 }
 console.log('LOCAL_HEALTH_PASS',JSON.stringify(results))
}catch(error){console.error('LOCAL_HEALTH_FAILED',/^[A-Z_]+$/.test(error.message)?error.message:'START_NPM_RUN_DEV_AND_RETRY');process.exitCode=1}
