import {useLocale,t as msg,formatNumber} from './locale.js'
import {Button} from './ui.jsx'
export function Pagination({page=1,pageSize=12,total,busy=false,onPageChange}){
 useLocale()
 const pages=Number.isInteger(total)&&total>=0?Math.max(1,Math.ceil(total/pageSize)):null
 const current=pages?Math.min(page,pages):page
 return <div className="actions" aria-label={msg('แบ่งหน้า')}>
  <Button disabled={busy||current<=1} onClick={()=>onPageChange(current-1)}>{msg('ก่อนหน้า')}</Button>
  <span>{msg('หน้า')} {formatNumber(current)} / {pages===null?'—':formatNumber(pages)}</span>
  <Button disabled={busy||pages===null||current>=pages} onClick={()=>onPageChange(current+1)}>{msg('ถัดไป')}</Button>
 </div>
}
