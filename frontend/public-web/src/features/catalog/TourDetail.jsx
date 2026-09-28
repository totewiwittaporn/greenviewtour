[Reading 94 lines from start (total: 94 lines, 0 remaining)]

import {useEffect,useMemo,useState} from 'react'
import {useLocale} from '../../core/useLocale.js'
import {Button} from '../../core/ui/Controls.jsx'
import TourAvailability from './TourAvailability.jsx'
import {badgeText,faqs,highlights,itinerary,tourContent,tourCover,tourMedia,typeText} from './tourPresentation.js'
import './TourDetail.css'

const memberOrigin=()=>['localhost','127.0.0.1'].includes(location.hostname)?'http://localhost:5175':'https://member.greenviewtour.com'
const lines=value=>(value||'').split('\n').map(item=>item.trim()).filter(Boolean)

function RelatedCard({tour,locale,t,money}){
  const content=tourContent(tour,locale),cover=tourCover(tour,locale)
  const href='/tours?tour='+encodeURIComponent(tour.slug)
  return <article className="tour-related-card"><a href={href}>{cover&&<img src={cover.url} alt={cover.alt||content.name} loading="lazy"/>}<div><strong>{content.name}</strong><span>{tour.durationDays!=null?tour.durationDays+' '+t('วัน'):typeText(tour.tourType,t)}</span><b>{money(tour.adultPrice)}</b></div></a></article>
}

export default function TourDetail({slug,search=''}){
  const {locale,t,label,number,money,date}=useLocale()
  const [state,setState]=useState({loading:true}),[attempt,setAttempt]=useState(0),[related,setRelated]=useState([])
  const params=useMemo(()=>new URLSearchParams(search),[search])
  useEffect(()=>{
    const controller=new AbortController();setState({loading:true})
    fetch('/api/public/tours?'+new URLSearchParams({slug,view:'detail'}),{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();return response.json()})
      .then(data=>{if(!controller.signal.aborted)setState({tour:data.rows?.[0]||null})}).catch(()=>{if(!controller.signal.aborted)setState({error:true})})
    return()=>controller.abort()
  },[slug,attempt])
  const tour=state.tour,content=tour?tourContent(tour,locale):null
  useEffect(()=>{
    if(!tour)return
    const controller=new AbortController()
    fetch('/api/public/tours?'+new URLSearchParams({view:'cards',ownership:tour.ownership,page:'1'}),{signal:controller.signal}).then(async r=>r.ok?r.json():{rows:[]}).then(data=>{if(!controller.signal.aborted)setRelated((data.rows||[]).filter(row=>row.id!==tour.id).slice(0,3))}).catch(()=>{})
    return()=>controller.abort()
  },[tour])
  useEffect(()=>{
    if(!content)return
    document.title=content.seoTitle||(content.name+' | Greenview Tour')
    const meta=document.createElement('meta')
    meta.name='description'
    meta.content=content.metaDescription||content.summary||content.introduction||content.name
    meta.dataset.tourDetail='true'
    const ogTitle=document.createElement('meta'),ogDescription=document.createElement('meta')
    ogTitle.setAttribute('property','og:title');ogTitle.content=content.ogTitle||content.seoTitle||content.name;ogTitle.dataset.tourDetail='true'
    ogDescription.setAttribute('property','og:description');ogDescription.content=content.ogDescription||meta.content;ogDescription.dataset.tourDetail='true'
    document.head.append(meta,ogTitle,ogDescription)
    return()=>{meta.remove();ogTitle.remove();ogDescription.remove()}
  },[content])
  if(state.loading)return <main id="content" className="tour-detail-v2"><p className="tour-detail-state" role="status">{t('กำลังโหลด…')}</p></main>
  if(state.error||!tour)return <main id="content" className="tour-detail-v2"><section className="tour-detail-state" role="alert"><p>{t('โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง')}</p><Button onClick={()=>setAttempt(n=>n+1)}>{t('ลองอีกครั้ง')}</Button></section></main>
  const media=tourMedia(tour,locale),cover=tourCover(tour,locale),thumbs=media.slice(0,5)
  const highlightRows=highlights(tour,locale),steps=itinerary(tour,locale),faqRows=faqs(tour,locale),badge=badgeText(tour.homeBadge,t)
  const season=tour.seasons?.[0],included=lines(content.inclusions),excluded=lines(content.exclusions)
  const initialDate=params.get('date')||'',initialAdults=params.get('pax')||'1'
  return <main id="content" className="tour-detail-v2">
    <nav className="tour-breadcrumb" aria-label={t('เส้นทางหน้าเว็บ')}><a href="/">{t('หน้าแรก')}</a><span>›</span><a href="/tours">{t('โปรแกรมทัวร์')}</a><span>›</span><strong>{content.name}</strong></nav>
    <section className="tour-detail-top">
      <div className="tour-gallery-hero">{cover?<img className="tour-hero-image" src={cover.url} alt={cover.alt||content.name} fetchPriority="high"/>:<div className="tour-photo-empty">{content.name}</div>}<span className="tour-gallery-count">{t('ดูรูปทั้งหมด')} ({media.length})</span>
        <div className="tour-thumb-row">{thumbs.map(item=><img key={item.id} src={item.url} alt={item.alt||''} loading="lazy"/>)}</div>
      </div>
      <div className="tour-detail-summary">
        <div className="tour-detail-badges">{badge&&<span className="tour-marketing-badge">{badge}</span>}{typeText(tour.tourType,t)&&<span>{typeText(tour.tourType,t)}</span>}{tour.durationDays!=null&&<span>◷ {number(tour.durationDays)} {t('วัน')}</span>}</div>
        <h1>{content.name}</h1>{content.summary&&<p className="tour-summary-copy">{content.summary}</p>}
        <dl className="tour-quick-facts">
          {tour.durationDays!=null&&<><dt>{t('ระยะเวลา')}</dt><dd>{number(tour.durationDays)} {t('วัน')}</dd></>}
          {typeText(tour.tourType,t)&&<><dt>{t('รูปแบบ')}</dt><dd>{typeText(tour.tourType,t)}</dd></>}
          {content.meetingPoint&&<><dt>{t('จุดออกเดินทาง')}</dt><dd>{content.meetingPoint}</dd></>}
          {season&&<><dt>{t('ช่วงให้บริการ')}</dt><dd>{date(season.onlineStartsOn)} – {date(season.onlineEndsOn)}</dd></>}
          {content.suitableFor&&<><dt>{t('เหมาะสำหรับ')}</dt><dd>{content.suitableFor}</dd></>}
          {tour.ownership==='PARTNER'&&tour.operator?.name&&<><dt>{t('ผู้จัดโปรแกรม')}</dt><dd>{tour.operator.name}</dd></>}
        </dl>
        <aside className="tour-booking-panel"><p>{t('เริ่มต้นเพียง')}</p><div className="tour-start-price"><strong>{money(tour.adultPrice)}</strong><span>/ {t('ผู้ใหญ่')}</span></div>{tour.childPrice!=null&&<small>{t('เด็ก')} {money(tour.childPrice)}</small>}<TourAvailability tour={tour} memberOrigin={memberOrigin()} initialDate={initialDate} initialAdults={initialAdults}/></aside>
      </div>
    </section>
    <section className="tour-detail-main">
      <article className="tour-copy-section"><h2>{t('ภาพรวมโปรแกรม')}</h2>{content.introduction&&<p>{content.introduction}</p>}{content.longDescription&&<p>{content.longDescription}</p>}</article>
      {!!highlightRows.length&&<section><h2>{t('ไฮไลต์ของโปรแกรม')}</h2><div className="tour-highlight-grid">{highlightRows.map((row,index)=><article key={row.id}><span>{['♢','⌁','▧','▱','◎'][index%5]}</span><h3>{row.title}</h3>{row.description&&<p>{row.description}</p>}</article>)}</div></section>}
      {!!steps.length&&<section><h2>{t('กำหนดการเดินทาง')}</h2><div className="tour-itinerary">{steps.map(step=><article key={step.id}><time>{step.timeLabel||('Day '+step.day)}</time><div><h3>{step.title||step.location}</h3>{step.location&&step.title&&<span>{step.location}</span>}{step.description&&<p>{step.description}</p>}</div></article>)}</div>{content.specialConditions&&<p className="tour-section-note">{content.specialConditions}</p>}</section>}
      {(included.length||excluded.length)&&<section className="tour-package-grid"><article className="included"><h2>✓ {t('รวมในราคา')}</h2><ul>{included.map(item=><li key={item}>{item}</li>)}</ul></article><article className="excluded"><h2>− {t('ไม่รวมในราคา')}</h2><ul>{excluded.map(item=><li key={item}>{item}</li>)}</ul>{content.fees&&<p>{content.fees}</p>}</article></section>}
      <section><h2>{t('ข้อมูลสำคัญ')}</h2><div className="tour-info-grid">{[
        [t('เวลาออกเดินทาง'),content.departureTimes],
        [t('อาหาร'),content.meals],
        [t('เงื่อนไขเด็ก'),content.childPolicy],
        [t('ปิดรับจอง'),content.bookingCutoff],
        [t('สิ่งที่ต้องเตรียม'),content.preparationNotes],
        [t('เหมาะสำหรับ'),content.suitableFor],
        [t('เงื่อนไขการยกเลิก'),content.cancellationTerms],
        [t('สภาพอากาศ'),content.weatherNotes],
      ].filter(([,value])=>value).map(([title,value])=><article key={title}><h3>{title}</h3><p className="preserve-lines">{value}</p></article>)}</div></section>
      {media.length>1&&<section><div className="tour-section-heading"><h2>{t('ภาพความประทับใจ')}</h2><span>{media.length} {t('ภาพ')}</span></div><div className="tour-gallery-strip">{media.slice(0,6).map(item=><figure key={item.id}><img src={item.url} alt={item.alt||content.name} loading="lazy"/>{item.caption&&<figcaption>{item.caption}</figcaption>}</figure>)}</div></section>}
      {!!faqRows.length&&<section><h2>{t('คำถามที่พบบ่อย')}</h2><div className="tour-faq-grid">{faqRows.map(row=><details key={row.id}><summary>{row.question}</summary><p>{row.answer}</p></details>)}</div></section>}
      {!!related.length&&<section><div className="tour-section-heading"><h2>{t('โปรแกรมทัวร์อื่น ๆ ที่คุณอาจสนใจ')}</h2><a href="/tours">{t('ดูโปรแกรมทัวร์ทั้งหมด')} →</a></div><div className="tour-related-grid">{related.map(row=><RelatedCard key={row.id} tour={row} locale={locale} t={t} money={money}/>)}</div></section>}
    </section>
    <section className="tour-detail-cta"><h2>{t('พร้อมออกเดินทางไปเกาะสุรินทร์แล้วหรือยัง?')}</h2><p>{t('ให้ Greenview Tour ดูแลการเดินทางของคุณ')}</p><a href="/tours">{label('ดูโปรแกรมทัวร์ทั้งหมด')} →</a></section>
  </main>
}

[executed on device: Wutcharapongs-MacBook-Air.local (df69a579-c325-4180-ad88-edccd35dfdc1)]