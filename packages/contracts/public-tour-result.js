// A successful empty catalogue means absent; malformed/unrelated data means unavailable.
export function publicTourResult(data,slug){
 if(!data||!Array.isArray(data.rows)||!Number.isInteger(data.total)||data.total<0)return {status:503}
 if(data.rows.length===0)return {status:data.total===0?404:503}
 if(data.total===0)return {status:503}
 const tour=data.rows.find(row=>row?.slug===slug)
 return tour?{status:200,tour}:{status:503}
}
