import {useEffect,useMemo,useState} from 'react'
import NotFound from '../content/NotFound.jsx'
import {useLocale} from '../../core/useLocale.js'
import {Button} from '../../core/ui/Controls.jsx'
import ImageGallery from '../../core/ui/ImageGallery.jsx'
import TourAvailability from './TourAvailability.jsx'
import {badgeText,componentBasisText,componentSelectionText,faqs,highlights,itinerary,journeyText,packageComponents,tourContent,tourCover,tourMedia,typeText} from './tourPresentation.js'
import './TourDetail.css'

const lines=value=>(value||'').split('\n').map(item=>item.trim()).filter(Boolean)

function RelatedCard({tour,locale,t,money}){
  const content=tourContent(tour,locale),cover=tourCover(tour,locale)
  const href='/tours?tour='+encodeURIComponent(tour.slug)
  return <article className="tour-related-card"><a href={href}>{cover&&<img src={cover.url} alt={cover.alt||content.name} loading="lazy"/>}<div><strong>{content.name}</strong><span>{tour.durationDays!=null?tour.durationDays+' '+t('วัน'):typeText(tour.tourType,t)}</span><b>{money(tour.adultPrice)}</b></div></a></article>
}
function ComponentList({rows,t,number,money,showPrice=false}){
  return <ul className="tour-component-list">{rows.map(row=>{
    const basis=componentBasisText(row.basis,t)
    const meta=[componentSelectionText(row.selection,t),row.quantity!=null&&basis?number(row.quantity)+' · '+basis:'',row.day? t('วันที่ในโปรแกรม')+' '+number(row.day):''].filter(Boolean)
    const price=showPrice?(row.resource?.salePrice!=null?money(row.resource.salePrice):t('สอบถามราคา')):''
    return <li key={row.id}><div><strong>{row.resource?.name}</strong>{meta.length>0&&<span>{meta.join(' · ')}</span>}</div>{price&&<b>{price}</b>}</li>
  })}</ul>
}

export default function TourDetail({slug,search=''}){
  const {locale,t,label,number,money,date}=useLocale()
  const [state,setState]=useState({loading:true}),[attempt,setAttempt]=useState(0),[related,setRelated]=useState([])
  const params=useMemo(()=>new URLSearchParams(search),[search])
  useEffect(()=>{
    const controller=new AbortController();setState({loading:true})
    fetch('/api/public/tours?'+new URLSearchParams({slug,view:'detail'}),{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();return response.json()})
      .then(data=>{if(!Array.isArray(data.rows))throw Error();if(!controller.signal.aborted)setState({tour:data.rows[0]||null})}).catch(()=>{if(!controller.signal.aborted)setState({error:true})})
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
  if(!state.error&&!tour)return <NotFound/>
  if(state.error)return <main id="content" className="tour-detail-v2"><section className="tour-detail-state" role="alert"><p>{t('โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง')}</p><Button onClick={()=>setAttempt(n=>n+1)}>{t('ลองอีกครั้ง')}</Button></section></main>
  const media=tourMedia(tour,locale),cover=tourCover(tour,locale)
  const highlightRows=highlights(tour,locale),steps=itinerary(tour,locale),faqRows=faqs(tour,locale),badge=badgeText(tour.homeBadge,t)
  const season=tour.seasons?.[0],included=lines(content.inclusions),excluded=lines(content.exclusions),components=packageComponents(tour)
  const initialDate=params.get('date')||'',initialAdults=params.get('pax')||'1'
  return <main id="content" className="tour-detail-v2">
    <nav className="tour-breadcrumb" aria-label={t('เส้นทางหน้าเว็บ')}><a href="/">{t('หน้าแรก')}</a><span>›</span><a href="/tours">{t('โปรแกรมทัวร์')}</a><span>›</span><strong>{content.name}</strong></nav>
    <section className="tour-detail-top">
      <ImageGallery items={media} initialId={cover?.id} title={content.name}/>
      <div className="tour-detail-summary">
        <div className="tour-detail-badges">{badge&&<span className="tour-marketing-badge">{badge}</span>}{typeText(tour.tourType,t)&&<span>{typeText(tour.tourType,t)}</span>}{tour.durationDays!=null&&<span>◷ {number(tour.durationDays)} {t('วัน')}</span>}</div>
        <h1>{content.name}</h1>{content.summary&&<p className="tour-summary-copy">{content.summary}</p>}
        <dl className="tour-quick-facts">
          {tour.durationDays!=null&&<><dt>{t('ระยะเวลา')}</dt><dd>{number(tour.durationDays)} {t('วัน')}</dd></>}
          {typeText(tour.tourType,t)&&<><dt>{t('รูปแบบ')}</dt><dd>{typeText(tour.tourType,t)}</dd></>}
          {journeyText(tour.journeyMode,t)&&<><dt>{t('รูปแบบการเดินทาง')}</dt><dd>{journeyText(tour.journeyMode,t)}</dd></>}
          {content.meetingPoint&&<><dt>{t('จุดออกเดินทาง')}</dt><dd>{content.meetingPoint}</dd></>}
          {season&&<><dt>{t('ช่วงให้บริการ')}</dt><dd>{date(season.onlineStartsOn)} – {date(season.onlineEndsOn)}</dd></>}
          {content.suitableFor&&<><dt>{t('เหมาะสำหรับ')}</dt><dd>{content.suitableFor}</dd></>}
          {tour.ownership==='PARTNER'&&tour.operator?.name&&<><dt>{t('ผู้จัดโปรแกรม')}</dt><dd>{tour.operator.name}</dd></>}
        </dl>
        <aside className="tour-booking-panel"><p>{t('เริ่มต้นเพียง')}</p><div className="tour-start-price"><strong>{money(tour.adultPrice)}</strong><span>/ {t('ผู้ใหญ่')}</span></div>{tour.childPrice!=null&&<small>{t('เด็ก')} {money(tour.childPrice)}</small>}<TourAvailability tour={tour} initialDate={initialDate} initialAdults={initialAdults}/></aside>
      </div>
    </section>
    <section className="tour-detail-main">
      <article className="tour-copy-section"><h2>{t('ภาพรวมโปรแกรม')}</h2>{content.introduction&&<p>{content.introduction}</p>}{content.longDescription&&<p>{content.longDescription}</p>}</article>
      {!!highlightRows.length&&<section><h2>{t('ไฮไลต์ของโปรแกรม')}</h2><div className="tour-highlight-grid">{highlightRows.map((row,index)=><article key={row.id}><span>{['♢','⌁','▧','▱','◎'][index%5]}</span><h3>{row.title}</h3>{row.description&&<p>{row.description}</p>}</article>)}</div></section>}
      {!!steps.length&&<section><h2>{t('กำหนดการเดินทาง')}</h2><div className="tour-itinerary">{steps.map(step=><article key={step.id}><time>{step.timeLabel||('Day '+step.day)}</time><div><h3>{step.title||step.location}</h3>{step.location&&step.title&&<span>{step.location}</span>}{step.description&&<p>{step.description}</p>}</div></article>)}</div>{content.specialConditions&&<p className="tour-section-note">{content.specialConditions}</p>}</section>}
      {(components.included.length||components.optional.length||components.excluded.length||included.length||excluded.length||content.fees)&&<section className="tour-package-grid">
        {(components.included.length||included.length)&&<article className="included"><h2>✓ {t('รวมในราคา')}</h2>{components.included.length>0&&<ComponentList rows={components.included} t={t} number={number} money={money}/>} {included.length>0&&<div className={components.included.length?'tour-package-notes':''}>{components.included.length>0&&<h3>{t('รายละเอียดเพิ่มเติม')}</h3>}<ul>{included.map(item=><li key={item}>{item}</li>)}</ul></div>}</article>}
        {(components.excluded.length||excluded.length||content.fees)&&<article className="excluded"><h2>− {t('ไม่รวมในราคา')}</h2>{components.excluded.length>0&&<ComponentList rows={components.excluded} t={t} number={number} money={money} showPrice/>}{excluded.length>0&&<div className={components.excluded.length?'tour-package-notes':''}>{components.excluded.length>0&&<h3>{t('รายละเอียดเพิ่มเติม')}</h3>}<ul>{excluded.map(item=><li key={item}>{item}</li>)}</ul></div>}{content.fees&&<p>{content.fees}</p>}</article>}
        {components.optional.length>0&&<article className="optional"><h2>+ {t('บริการเสริม')}</h2><ComponentList rows={components.optional} t={t} number={number} money={money} showPrice/></article>}
      </section>}
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
