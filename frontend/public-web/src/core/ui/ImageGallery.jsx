import {useLayoutEffect,useRef,useState} from 'react'
import {useLocale} from '../useLocale.js'

export default function ImageGallery({items=[],initialId,title=''}){
 const {t}=useLocale()
 const initial=Math.max(0,items.findIndex(item=>item.id===initialId))
 const [index,setIndex]=useState(initial),[open,setOpen]=useState(false)
 const active=items[index]||items[0]
 const select=next=>setIndex(Math.max(0,Math.min(items.length-1,next)))
 if(!active)return <div className="public-image-gallery-empty">{title}</div>
 return <div className="public-image-gallery">
  <button type="button" className="public-image-gallery-main" onClick={()=>setOpen(true)} aria-label={`${t('ดูภาพขนาดใหญ่')} ${index+1} / ${items.length}`}>
   <img src={active.url} alt={active.alt||title} fetchPriority="high"/>
   <span>{t('ดูรูปทั้งหมด')} ({items.length})</span>
  </button>
  {items.length>1&&<div className="public-image-gallery-thumbs" role="tablist" aria-label={t('แกลเลอรีโปรแกรมทัวร์')}>
   {items.map((item,itemIndex)=><button key={item.id} type="button" role="tab" aria-selected={itemIndex===index} aria-label={`${item.alt||title} ${itemIndex+1}`} onClick={()=>select(itemIndex)}><img src={item.url} alt="" loading="lazy"/></button>)}
  </div>}
  {open&&<ImagePreview items={items} index={index} onIndex={select} onClose={()=>setOpen(false)} title={title}/>} 
 </div>
}

function ImagePreview({items,index,onIndex,onClose,title}){
 const {t}=useLocale(),ref=useRef(null),touch=useRef(null),active=items[index]
 const move=delta=>onIndex((index+delta+items.length)%items.length)
 useLayoutEffect(()=>{
  const previous=document.activeElement,dialog=ref.current
  dialog.showModal()
  return()=>{dialog.close();previous?.isConnected&&previous.focus({preventScroll:true})}
 },[])
 const keydown=event=>{if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}else if(event.key==='ArrowRight'){event.preventDefault();move(1)}else if(event.key==='Home'){event.preventDefault();onIndex(0)}else if(event.key==='End'){event.preventDefault();onIndex(items.length-1)}}
 return <dialog ref={ref} className="public-image-preview" aria-label={t('แกลเลอรีโปรแกรมทัวร์')} onCancel={event=>{event.preventDefault();onClose()}} onKeyDown={keydown}>
  <button type="button" className="public-image-preview-close" aria-label={t('ปิดรูปภาพ')} onClick={onClose}>×</button>
  <div className="public-image-preview-stage" onTouchStart={event=>{touch.current=event.changedTouches[0].clientX}} onTouchEnd={event=>{const start=touch.current;if(start===null)return;const delta=event.changedTouches[0].clientX-start;touch.current=null;if(Math.abs(delta)>45)move(delta>0?-1:1)}}>
   {items.length>1&&<button type="button" className="public-image-preview-nav previous" aria-label={t('รูปก่อนหน้า')} onClick={()=>move(-1)}>‹</button>}
   <figure><img src={active.url} alt={active.alt||title}/>{active.caption&&<figcaption>{active.caption}</figcaption>}</figure>
   {items.length>1&&<button type="button" className="public-image-preview-nav next" aria-label={t('รูปถัดไป')} onClick={()=>move(1)}>›</button>}
  </div>
  <div className="public-image-preview-footer"><span>{index+1} / {items.length}</span>{items.length>1&&<div className="public-image-preview-thumbs">{items.map((item,itemIndex)=><button type="button" key={item.id} aria-current={itemIndex===index?'true':undefined} onClick={()=>onIndex(itemIndex)}><img src={item.url} alt=""/></button>)}</div>}</div>
 </dialog>
}