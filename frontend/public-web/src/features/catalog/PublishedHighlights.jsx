import {useLocale} from '../../core/useLocale.js'
import {useEffect,useState} from 'react'
import {Button} from '../../core/ui/Controls.jsx'
import {badgeText,tourContent,tourCover,typeText} from './tourPresentation.js'
import './PublishedHighlights.css'

export default function PublishedHighlights() {
  const {locale,t,number,money}=useLocale()
  const [state,setState]=useState({loading:true}),[attempt,setAttempt]=useState(0)
  useEffect(()=>{
    const controller=new AbortController()
    const timeout=setTimeout(()=>{setState({error:true});controller.abort()},15000)
    setState({loading:true})
    fetch('/api/public/tours?'+new URLSearchParams({view:'highlights',pageSize:'3',page:'1',featuredOnly:'true'}),{signal:controller.signal})
      .then(async response=>{if(!response.ok)throw Error();return response.json()})
      .then(data=>{if(!controller.signal.aborted)setState(data)})
      .catch(()=>{if(!controller.signal.aborted)setState({error:true})})
      .finally(()=>clearTimeout(timeout))
    return()=>{clearTimeout(timeout);controller.abort()}
  },[attempt])
  if(state.loading)return <p role="status">{t('กำลังโหลดโปรแกรมทัวร์…')}</p>
  if(state.error)return <div><p role="alert">{t('ยังโหลดโปรแกรมทัวร์ไม่ได้')}</p><Button onClick={()=>setAttempt(value=>value+1)}>{t('ลองอีกครั้ง')}</Button></div>
  if(!state.rows?.length)return <p className="home-empty">{t('ยังไม่มีโปรแกรมแนะนำสำหรับหน้าแรก')}</p>
  return <div className="featured-tour-grid">{state.rows.slice(0,3).map(tour=>{
    const content=tourContent(tour,locale),cover=tourCover(tour,locale)
    const href='/tours?tour='+encodeURIComponent(tour.slug),badge=badgeText(tour.homeBadge,t)
    return <article className="featured-tour-card" key={tour.id}>
      <a className="featured-tour-image" href={href} aria-label={t('ดูรายละเอียด')+' '+content.name}>
        {cover?<img src={cover.url} alt={cover.alt||content.name} loading="lazy" width="720" height="480"/>:<div className="home-tour-no-image">Greenview Tour</div>}
        {badge&&<span className={'featured-tour-badge badge-'+tour.homeBadge.toLowerCase()}>{badge}</span>}
      </a>
      <div className="featured-tour-body"><h3><a href={href}>{content.name}</a></h3>
        <div className="featured-tour-meta">
          {tour.durationDays!=null&&<span>◷ {number(tour.durationDays)} {t('วัน')}</span>}
          {typeText(tour.tourType,t)&&<span>◎ {typeText(tour.tourType,t)}</span>}
          <span>⌖ {t('คุระบุรี')}</span>
        </div>
        {content.summary&&<p>{content.summary}</p>}
        <div className="featured-tour-bottom">
          <div><small>{t('เริ่มต้น')}</small><strong>{money(tour.adultPrice)}</strong><span> / {t('ผู้ใหญ่')}</span></div>
          <a className="featured-tour-cta" href={href}>{t('ดูรายละเอียด')} <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </article>
  })}</div>
}
