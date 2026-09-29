
export function paginationItems(current,total){
  const count=Math.max(1,Number(total)||1)
  const page=Math.min(count,Math.max(1,Number(current)||1))
  if(count<=5)return Array.from({length:count},(_,index)=>index+1)
  if(page<=3)return [1,2,3,'ellipsis',count]
  if(page>=count-2)return [1,'ellipsis',count-2,count-1,count]
  return [1,'ellipsis',page-1,page,page+1,'ellipsis',count]
}
