// Read-only Local schedule preview. Does not read configuration, open a DB or send.
import {staffDigestTickPlan} from '../backend/src/modules/notifications/staff-digest-schedule.js'
try {
 const args=process.argv.slice(2),values={}
 for(let i=0;i<args.length;i+=2){if(!['--at','--now'].includes(args[i])||!args[i+1]||values[args[i]])throw new Error('USAGE: --at HH:mm [--now ISO_TIMESTAMP]');values[args[i]]=args[i+1]}
 if(process.env.APP_ENV==='production'||process.env.NODE_ENV==='production')throw new Error('LOCAL_ONLY')
 console.log(JSON.stringify(staffDigestTickPlan({localTime:values['--at'],now:values['--now']?new Date(values['--now']):new Date()}),null,2))
}catch(error){console.error(error.message);process.exitCode=1}
