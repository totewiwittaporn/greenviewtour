import {id,code,NAME,day,date,stamp} from './common.mjs'
export function dailyBookings(n){
 const row=(j,pax,tour='D1',status='CONFIRMED',transfer=false)=>({n,j,pax,tour,status,transfer,wait:false})
 if(n===0)return [10,8,7,5,10,8,7,5,6,4].map((pax,j)=>row(j,pax,[0,8].includes(j)?'N2':j===9?'N3':['D1','D1P','D1F'][j%3],'CONFIRMED',[0,1,3].includes(j)))
 if(n===10)return [row(0,35),row(1,35,'D1P')]
 if(n===20)return [row(0,65,'D1')]
 if(n===25)return [25,30,30,45,15].map((p,j)=>({...row(j,p,'D1',j===4?'DRAFT':'CONFIRMED'),wait:j===4}))
 const list=Array.from({length:11},(_,j)=>{
  const tour=j===8?(n%2?'N3':'N2'):j===6&&n%3===0?'OUT':j===7&&n%3===1?'RET':j===5&&n%10===5?'OPEN':['D1','D1P','D1F'][j%3]
  return row(j,2+(n*3+j*5)%8,tour,j===9?'DRAFT':j===10?'CANCELLED':'CONFIRMED',j<2)
 })
 if(n%9===3)list.push({...row(11,68,'D1','DRAFT'),wait:true})
 return list
}
export function windows(n){const d=day(n),pool=(key,kind,direction,from,to,vehicles)=>({id:id(key),code:code(key),name:NAME+(kind==='BOAT'?'Boat':'Vehicle')+' readiness '+d+' '+direction,kind,serviceDate:date(d),direction,startsAt:stamp(d,from),endsAt:stamp(d,to),resourceIds:[id(kind==='BOAT'?'res-SEA':'res-VAN')],status:'ACTIVE',holdMinutes:30,overnightLoadTenths:12,notes:'DEMO ONLY — explicitly available synthetic vehicles; not real fleet readiness',offers:vehicles})
 const boats=[30,45,65].map((capacity,i)=>({vehicleId:id('boat-'+(i+1)),capacity,status:n===34&&i===2?'UNAVAILABLE':'READY'}))
 const van=i=>({vehicleId:id('van-'+i),capacity:12,status:'READY'})
 const result=[pool('BO-'+n,'BOAT','OUTBOUND','09:00','11:00',boats),pool('BR-'+n,'BOAT','RETURN','15:00','17:00',boats)]
 if(n===0){for(const [i,from,to,v]of [[0,'06:00','06:45',1],[1,'06:50','07:35',2],[2,'07:40','08:25',1]])result.push(pool('VO-0-'+i,'VEHICLE','OUTBOUND',from,to,[van(v)]));for(const[i,from,to,v]of [[0,'17:00','17:45',1],[1,'17:50','18:35',2]])result.push(pool('VR-0-'+i,'VEHICLE','RETURN',from,to,[van(v)]))}
 else result.push(pool('VO-'+n,'VEHICLE','OUTBOUND','06:00','08:30',[van(1),van(2)]),pool('VR-'+n,'VEHICLE','RETURN','17:00','19:00',[van(1),van(2)]))
 return result
}
export function chosenWindows(spec,journey){const out=[];for(const [direction,d] of [['OUTBOUND',journey.outboundDate],['RETURN',journey.returnStatus==='OUR'?journey.returnDate:null]]){if(!d)continue;const n=Math.round((Date.parse(d)-Date.parse(day(0)))/86400000);out.push({resourceId:id('res-SEA'),direction,serviceDate:d,poolId:id((direction==='OUTBOUND'?'BO-':'BR-')+n)});if(spec.transfer){let key=(direction==='OUTBOUND'?'VO-':'VR-')+n;if(n===0){const slot=direction==='OUTBOUND'?{0:0,1:1,3:2}[spec.j]:{1:0,3:1}[spec.j];if(slot!==undefined)key+='-'+slot}out.push({resourceId:id('res-VAN'),direction,serviceDate:d,poolId:id(key)})}}return out}
