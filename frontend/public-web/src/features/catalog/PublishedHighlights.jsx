import {useLocale} from '../../core/useLocale.js'
import {useEffect,useState} from 'react'
import {Button} from '../../core/ui/Controls.jsx'
function HighlightGroup({ownership, title}) {
  const {t,number}=useLocale()
  const [state,setState]=useState({loading:true}),[attempt,setAttempt]=useState(0)
  useEffect(()=>{
    const controller=new AbortController()
    const timeout=setTimeout(()=>{setState({error:true});controller.abort()},15000)
    setState({loading:true})
    fetch(`/api/public/tours?page=1&ownership=${ownership}`,{signal:controller.signal}).then(async response=>{
      if(!response.ok)throw Error()
      return response.json()
    }).then(data=>{if(!controller.signal.aborted)setState(data)}).catch(()=>{if(!controller.signal.aborted)setState({error:true})}).finally(()=>clearTimeout(timeout))
    return()=>{clearTimeout(timeout);controller.abort()}
  },[ownership,attempt])
  return <section className="home-tour-group" aria-labelledby={`tours-${ownership}`} aria-busy={!!state.loading}>
    <h3 id={`tours-${ownership}`} className="home-tour-group-title">{t(title)}</h3>
    {state.loading?<p role="status">{t('กำลังโหลดโปรแกรมทัวร์…')}</p>:state.error?<div><p role="alert">{t('ยังโหลดโปรแกรมทัวร์ไม่ได้')}</p><Button onClick={()=>setAttempt(value=>value+1)}>{t('ลองอีกครั้ง')}</Button></div>:!state.rows?.length?<p className="home-empty">{t('ยังไม่มีโปรแกรมเผยแพร่ในหมวดนี้')}</p>:<div className="tour-grid">{state.rows.slice(0,3).map(tour=><article className="tour-card" key={tour.id}>
      <a className="tour-image-link" href={'/tours?tour='+encodeURIComponent(tour.slug)} aria-label={t('ดูรายละเอียด')+' '+tour.name}>
        {tour.imageUrls?<img src={tour.imageUrls.split('\n')[0]} alt={tour.name} loading="lazy" width="600" height="400"/>:<div className="home-tour-no-image">Greenview Tour</div>}
        {tour.durationDays!=null&&<span className="duration">{number(tour.durationDays)} {t('วัน')}</span>}
      </a><div className="tour-content"><h4>{tour.name}</h4>{tour.description&&<p>{tour.description}</p>}<a href={'/tours?tour='+encodeURIComponent(tour.slug)}>{t('ดูรายละเอียดและวันเดินทาง →')}</a></div>
    </article>)}</div>}
    <a className="home-text-link" href={`/tours?ownership=${ownership}`}>{t('ดูโปรแกรมในหมวดนี้')} <span aria-hidden="true">→</span></a>
  </section>
}
export default function PublishedHighlights() {
  return <><HighlightGroup ownership="GREENVIEW" title="ทัวร์ของกรีนวิว"/><HighlightGroup ownership="PARTNER" title="ทัวร์จากพันธมิตร"/></>
}
