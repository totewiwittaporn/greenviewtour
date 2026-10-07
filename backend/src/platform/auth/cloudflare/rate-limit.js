import {createHash} from 'node:crypto'
import {AccessError} from '../../../modules/identity-access/membership.js'
// Native D1 UPSERT: this counter remains atomic across Worker instances/restarts.
export async function consumeRate(database,label,{maximum=120,seconds=60}={}){
 const now=Math.floor(Date.now()/1000),window=Math.floor(now/seconds)*seconds
 const key=createHash('sha256').update(label).digest('hex')
 const row=await database.prepare('INSERT INTO AuthRate(key,window,hits) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window=excluded.window,hits=CASE WHEN AuthRate.window=excluded.window THEN AuthRate.hits+1 ELSE 1 END RETURNING hits').bind(key,window).first()
 if(row.hits>maximum){
  const error=new AccessError('AUTH_RATE_LIMITED',429)
  error.retryAfterSeconds=window+seconds-now
  throw error
 }
}
