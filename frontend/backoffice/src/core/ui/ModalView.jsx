import {Dialog} from './Dialog.jsx'
import {Button} from './Button.jsx'
import {useLocale} from '../i18n/locale.jsx'

export function ModalView({title,onClose,loading=false,error,onRetry,children}){
 const {t}=useLocale()
 return <Dialog title={title} onClose={onClose} variant="view">
  {loading?<p className="core-view-state" role="status">{t('Loading current record…')}</p>:error?<div className="core-view-state"><p role="alert">{t(error)}</p>{onRetry&&<Button onClick={onRetry}>Retry</Button>}</div>:children}
 </Dialog>
}
export function ModalViewHero({image,alt='',eyebrow,title,summary,badges=[]}){
 return <section className="core-view-hero">
  <div className="core-view-cover">{image?<img src={image} alt={alt}/>:<div className="core-view-cover-empty" aria-hidden="true"/>}</div>
  <div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3>{summary&&<p>{summary}</p>}{badges.length>0&&<div className="core-view-badges">{badges.filter(Boolean).map((badge,index)=><span key={`${badge}-${index}`}>{badge}</span>)}</div>}</div>
 </section>
}
export function ModalViewFields({items}){return <dl className="core-view-fields">{items.filter(item=>item.value!==undefined).map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>}
export function ModalViewStats({items}){return <section className="core-view-stats">{items.map(item=><div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</section>}
export function ModalViewSection({title,children}){return <section className="core-view-section"><h3>{title}</h3>{children}</section>}
export function ModalViewColumns({children}){return <div className="core-view-columns">{children}</div>}
export function ModalViewList({items,empty}){return items.length?<div className="core-view-list">{items.map(item=><div key={item.id}><strong>{item.title}</strong>{item.detail&&<span>{item.detail}</span>}</div>)}</div>:<p className="core-view-empty">{empty}</p>}