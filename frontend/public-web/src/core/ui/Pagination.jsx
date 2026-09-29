
import {useLocale} from '../useLocale.js'
import {paginationItems} from './pagination.js'

export default function Pagination({page=1,total=0,pageSize=12,onPageChange,label}){
  const {t,number}=useLocale()
  const totalPages=Math.max(1,Math.ceil((Number(total)||0)/Math.max(1,Number(pageSize)||1)))
  if(totalPages<=1)return null
  const current=Math.min(totalPages,Math.max(1,Number(page)||1))
  const change=next=>{if(next!==current&&!Number.isNaN(next))onPageChange?.(next)}
  return <nav className="public-pagination" aria-label={label}>
    <button type="button" className="public-pagination-nav" disabled={current<=1} aria-label={t('ก่อนหน้า')} onClick={()=>change(current-1)}><span aria-hidden="true">‹</span></button>
    <div className="public-pagination-pages">
      {paginationItems(current,totalPages).map((item,index)=>item==='ellipsis'
        ?<span className="public-pagination-ellipsis" aria-hidden="true" key={`ellipsis-${index}`}>…</span>
        :<button type="button" className="public-pagination-page" aria-current={item===current?'page':undefined} onClick={()=>change(item)} key={item}>{number(item)}</button>)}
    </div>
    <button type="button" className="public-pagination-nav" disabled={current>=totalPages} aria-label={t('ถัดไป')} onClick={()=>change(current+1)}><span aria-hidden="true">›</span></button>
  </nav>
}
