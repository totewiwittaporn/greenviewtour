export function MasterDetail({items,selectedId,onSelect,label,empty,renderItem,detailRef,children}) {
 const selected=items.find(item=>item.id===selectedId)
 if(!items.length)return <p className="core-form-empty">{empty}</p>
 return <div className="core-master-detail">
  <nav className="core-master-list" aria-label={label}>
   {items.map((item,index)=>{
    const active=item.id===selectedId
    return <button key={item.id} type="button" className={active?'core-master-item is-selected':'core-master-item'} aria-current={active?'true':undefined} onClick={()=>onSelect(item.id)}>{renderItem(item,index,active)}</button>
   })}
  </nav>
  <div className="core-master-pane" ref={detailRef}>{selected?children(selected,items.findIndex(item=>item.id===selectedId)):null}</div>
 </div>
}