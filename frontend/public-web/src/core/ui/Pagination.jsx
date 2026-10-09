
import {useLocale} from '../useLocale.js'
import {paginationItems} from './pagination.js'

export default function Pagination({page=1,total=0,pageSize=12,onPageChange,hrefForPage,label}){
  const {t,number}=useLocale()
  const totalPages=Math.max(1,Math.ceil((Number(total)||0)/Math.max(1,Number(pageSize)||1)))
  if(totalPages<=1)return null
  const current=Math.min(totalPages,Math.max(1,Number(page)||1))
  const change=next=>{if(next!==current&&!Number.isNaN(next))onPageChange?.(next)}
 const item=(next,className,label,children,disabled=false)=>hrefForPage&&!disabled
  ? <a className={className} href={hrefForPage(next)} aria-label={label} aria-current={next===current?'page':undefined}>{children}</a>
  : <button type="button" className={className} disabled={disabled} aria-label={label} aria-current={next===current?'page':undefined} onClick={()=>change(next)}>{children}</button>
 return <nav className="public-pagination" aria-label={label}>
  {item(current-1,'public-pagination-nav',t('ก่อนหน้า'),<span aria-hidden="true">‹</span>,current<=1)}
  <div className="public-pagination-pages">{paginationItems(current,totalPages).map((value,index)=>value==='ellipsis'
   ? <span className="public-pagination-ellipsis" aria-hidden="true" key={`ellipsis-${index}`}>…</span>
   : <span key={value}>{item(value,'public-pagination-page',undefined,number(value))}</span>)}</div>
  {item(current+1,'public-pagination-nav',t('ถัดไป'),<span aria-hidden="true">›</span>,current>=totalPages)}
 </nav>
}
