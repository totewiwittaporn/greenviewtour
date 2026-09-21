import {useLocale} from '../../core/useLocale.js'
import {useEffect,useState} from 'react'
import {Button} from '../../core/ui/Controls.jsx'
import './Catalog.css'
import Botanical from '../../core/ui/Botanical.jsx'
const memberOrigin=()=>['localhost','127.0.0.1'].includes(location.hostname)?'http://localhost:5175':'https://member.greenviewtour.com'
function LegacyCatalog({pathname,search}){const {t,label,number,money,date}=useLocale();const promotionPage=pathname==='/promotions',slug=new URLSearchParams(search).get('tour'),ownership=new URLSearchParams(search).get('ownership'),[page,setPage]=useState(1),[attempt,setAttempt]=useState(0),[state,setState]=useState({loading:true});useEffect(()=>{const c=new AbortController();setState({loading:true});fetch('/api/public/tours?'+new URLSearchParams({page,...(promotionPage?{promotionsOnly:'true'}:{}),...(slug?{slug}:{}),...(['GREENVIEW','PARTNER'].includes(ownership)?{ownership}:{})}),{signal:c.signal}).then(async r=>{if(!r.ok)throw Error();return r.json()}).then(r=>{if(!c.signal.aborted)setState(r)}).catch(()=>{if(!c.signal.aborted)setState({error:true})});return()=>c.abort()},[page,slug,attempt,promotionPage,ownership]);return <><main id="content" className="public-catalog"><p className="section-eyebrow">GREENVIEW TOUR</p><h1>{promotionPage?label("โปรโมชั่นทัวร์"):label("โปรแกรมทัวร์")}</h1>{state.loading?<p role="status">{t("กำลังโหลด…")}</p>:state.error?<section role="alert"><p>{t("โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง")}</p><Button onClick={()=>setAttempt(n=>n+1)}>{t("ลองอีกครั้ง")}</Button></section>:<>{!state.rows.length&&<p>{t("ยังไม่มีทัวร์เปิดเผยแพร่ กรุณาติดต่อบริษัทเพื่อสอบถาม")}</p>}<div className={slug?'tour-detail':'tour-grid'}>{state.rows.map(tour=><article className="tour-card" key={tour.id}>{tour.imageUrls&&<img className="catalog-cover" src={tour.imageUrls.split('\n')[0]} alt={tour.name}/>}<div className="tour-content"><p>{tour.durationDays ? number(tour.durationDays) : '—'} {t("วัน")} · {tour.ownership==='GREENVIEW'?t("จัดโดย Greenview Tour"):t("ทัวร์พันธมิตร")}</p><h2>{tour.name}</h2><p>{tour.description}</p><p>{t("ผู้ใหญ่")} {money(tour.adultPrice)} · {t("เด็ก")} {money(tour.childPrice)}</p>{tour.promotions.map(p=><section className="promotion-offer" key={p.id}><h3>{p.name}</h3><p>{t("ราคาพิเศษผู้ใหญ่")} {money(p.adultPrice)} · {t("เด็ก")} {money(p.childPrice)}</p><p>{t("รับจอง")} {date(p.startsOn)} {t("ถึง")} {date(p.endsOn)}</p><p>{t("เดินทาง")} {date(p.serviceStartsOn)} {t("ถึง")} {date(p.serviceEndsOn)}</p><p>{p.remaining===null?t("ไม่จำกัดโควตาโปรโมชั่น"):`${t("เหลือ")} ${number(p.remaining)} ${p.quotaUnit==='SEAT'?t("ที่นั่ง"):t("การจอง")}`} · {t("รอทีมงานยืนยันที่ว่าง")}</p>{p.terms&&<p>{p.terms}</p>}{p.remaining!==0&&<a className="public-button" href={`${memberOrigin()}/tours?tour=${encodeURIComponent(tour.slug)}&promotion=${p.id}`}>{label("เลือกโปรโมชั่นนี้")}</a>}</section>)}{slug?<>{[[label("จุดเด่น"),tour.highlights],[label("โปรแกรมเดินทาง"),tour.route],[label("เวลาออกเดินทาง"),tour.departureTimes],[label("อาหาร"),tour.meals],[label("ค่าธรรมเนียม"),tour.fees],[label("รวมในราคา"),tour.inclusions],[label("ไม่รวมในราคา"),tour.exclusions],[label("เงื่อนไขเด็ก"),tour.childPolicy],[label("สิ่งที่ต้องเตรียม"),tour.preparationNotes],[label("การยกเลิก"),tour.cancellationTerms]].map(([label,value])=>value&&<section key={label}><h3>{label}</h3><p className="preserve-lines">{value}</p></section>)}<div className="tour-grid">{(tour.imageUrls||'').split('\n').slice(1).filter(Boolean).map((src,i)=><img className="catalog-cover" key={src} src={src} alt={`${tour.name} ${t("ภาพ")} ${number(i+2)}`} loading="lazy"/>)}</div><h3>{label("ช่วงวันเดินทางที่รับจองออนไลน์")}</h3>{tour.seasons.length?tour.seasons.map((s,i)=><p key={i}>{date(s.onlineStartsOn)} {t("ถึง")} {date(s.onlineEndsOn)} · {t("ปิดรับก่อนเดินทาง")} {number(s.cutoffDays)} {t("วัน")}</p>):<p>{t("ยังไม่เปิดรับจองออนไลน์ กรุณาติดต่อบริษัท")}</p>}<a className="public-button" href={`${memberOrigin()}/tours?tour=${encodeURIComponent(tour.slug)}`}>{label("เลือกวันและส่งคำขอจอง")}</a></>:<a href={'/tours?tour='+encodeURIComponent(tour.slug)}>{label("รายละเอียดทัวร์ →")}</a>}</div></article>)}</div><div className="catalog-pages"><Button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>{t("ก่อนหน้า")}</Button><span>{t("หน้า")} {number(state.page)}</span><Button disabled={page*12>=state.total} onClick={()=>setPage(p=>p+1)}>{t("ถัดไป")}</Button></div></>}</main></>}

export default function Catalog({pathname,search}) {
  const params = new URLSearchParams(search)
  return pathname === '/promotions' || params.get('tour')
    ? <LegacyCatalog key={pathname + search} pathname={pathname} search={search}/>
    : <TourList key={search} search={search}/>
}

function TourList({search}) {
  const {t,label,number,money} = useLocale()
  const params = new URLSearchParams(search)
  const ownership = params.get('ownership') === 'PARTNER' ? 'PARTNER' : 'GREENVIEW'
  const duration = ['day','overnight'].includes(params.get('duration')) ? params.get('duration') : ''
  const [page,setPage] = useState(1)
  const [attempt,setAttempt] = useState(0)
  const [state,setState] = useState({loading:true})
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setState({loading:true})
    const timeout = setTimeout(() => {
      controller.abort()
      if (active) setState({error:true})
    }, 15000)
    fetch('/api/public/tours?' + new URLSearchParams({page,ownership,...(duration ? {duration} : {})}), {signal:controller.signal})
      .then(async response => {
        if (!response.ok) throw new Error('Tour request failed')
        const result = await response.json()
        if (!Array.isArray(result.rows)) throw new Error('Invalid tour response')
        return result
      })
      .then(result => {if (active && !controller.signal.aborted) setState(result)})
      .catch(() => {if (active) setState({error:true})})
      .finally(() => clearTimeout(timeout))
    return () => {active = false; clearTimeout(timeout); controller.abort()}
  }, [page,attempt,ownership,duration])
  const filterLink = (nextOwnership,nextDuration) => '/tours?' + new URLSearchParams({ownership:nextOwnership,...(nextDuration ? {duration:nextDuration} : {})})
  return <main id="content" className="public-catalog catalog-explore">
    <section className="catalog-banner" aria-label={t('เลือกทริปสุรินทร์ในแบบของคุณ')}>
      <img src="/images/home/surin-hero.webp" alt="" fetchPriority="high" width="1448" height="1086"/>
      <div className="catalog-banner-copy"><p>{t('เลือกทริปสุรินทร์ในแบบของคุณ')}</p><span>{t('ทะเลใส ธรรมชาติ และช่วงเวลาที่คุณเลือกได้')}</span></div>
      <p className="catalog-banner-note" aria-hidden="true">{t('สุรินทร์… มากกว่าการเดินทาง')}</p>
    </section>
    <Botanical className="catalog-frond catalog-frond-left"/><Botanical className="catalog-frond catalog-frond-right"/>
    <div className="catalog-list-wrap">
      <div className="catalog-list-heading"><h1>{label('โปรแกรมทัวร์')}</h1>
        <nav className="catalog-ownership" aria-label={t('ผู้ให้บริการทัวร์')}>
          {[['GREENVIEW','ทัวร์ของกรีนวิว'],['PARTNER','ทัวร์พันธมิตร']].map(([value,title]) => <a key={value} href={filterLink(value,duration)} aria-current={ownership===value?'true':undefined}>{t(title)}</a>)}
        </nav>
      </div>
      <nav className="catalog-duration" aria-label={t('ระยะเวลาทริป')}>
        {[['','ทั้งหมด'],['day','วันเดียว'],['overnight','ค้างคืน']].map(([value,title]) => <a key={value} href={filterLink(ownership,value)} aria-current={duration===value?'true':undefined}>{t(title)}</a>)}
      </nav>
      <div className="catalog-results" aria-busy={state.loading || undefined}>
        {state.loading ? <p className="catalog-message" role="status">{t('กำลังโหลด…')}</p> : state.error ? <section className="catalog-message" role="alert"><p>{t('โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง')}</p><Button onClick={()=>setAttempt(value=>value+1)}>{t('ลองอีกครั้ง')}</Button></section> : <>
          {!state.rows.length && <div className="catalog-message"><p>{t('ยังไม่มีทัวร์เปิดเผยแพร่ กรุณาติดต่อบริษัทเพื่อสอบถาม')}</p><a className="catalog-outline-link" href="/#company">{t('ติดต่อเรา')} <span aria-hidden="true">→</span></a></div>}
          <div className="catalog-tour-grid">
            {state.rows.map(tour => {
              const cover = tour.imageUrls?.split('\n').map(value=>value.trim()).find(Boolean)
              const href = '/tours?tour=' + encodeURIComponent(tour.slug)
              return <article className="catalog-trip" key={tour.id}>
                <a className="catalog-trip-photo" href={href} aria-label={tour.name}>{cover ? <img src={cover} alt="" loading="lazy" width="640" height="380"/> : <div className="catalog-photo-placeholder">{t('ภาพโปรแกรมทัวร์')}</div>}</a>
                <div className="catalog-trip-content">
                  <h2><a href={href}>{tour.name}</a></h2>
                  {tour.durationDays != null && <p className="catalog-trip-duration"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>{number(tour.durationDays)} {t('วัน')}</p>}
                  {(tour.highlights || tour.description) && <p className="catalog-trip-description">{tour.highlights || tour.description}</p>}
                  <div className="catalog-trip-bottom"><p className="catalog-trip-provider">{tour.ownership==='GREENVIEW' ? t('จัดโดย Greenview Tour') : t('ทัวร์พันธมิตร')}</p>
                    {tour.adultPrice != null && <p className="catalog-trip-price">{t('ผู้ใหญ่')} <strong>{money(tour.adultPrice)}</strong></p>}
                    <a className="catalog-outline-link" href={href}>{label('รายละเอียดทัวร์ →')}</a>
                  </div>
                </div>
              </article>
            })}
          </div>
          {(state.total > 12 || page > 1) && <div className="catalog-pages"><Button disabled={page<=1} onClick={()=>setPage(value=>value-1)}>{t('ก่อนหน้า')}</Button><span>{t('หน้า')} {number(state.page)}</span><Button disabled={page*12>=state.total} onClick={()=>setPage(value=>value+1)}>{t('ถัดไป')}</Button></div>}
        </>}
      </div>
      <aside className="catalog-help"><svg width="34" height="34" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3C8.8 3 3 8 3 14.2c0 3 1.3 5.6 3.5 7.7L5 29l7-4c1.3.3 2.6.5 4 .5 7.2 0 13-5 13-11.3S23.2 3 16 3Z"/><path d="M10 11h12M10 16h9" stroke="white" strokeWidth="1.4"/></svg><div><h2>{t('ยังไม่แน่ใจว่าจะเลือกทริปไหน?')}</h2><p>{t('ให้เราช่วยแนะนำทริปที่เหมาะกับคุณ')}</p></div><a className="catalog-outline-link" href="/#company">{t('ติดต่อเรา')} <span aria-hidden="true">→</span></a></aside>
    </div>
  </main>
}
