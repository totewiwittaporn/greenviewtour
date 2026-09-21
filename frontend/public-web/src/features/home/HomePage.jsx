import Botanical from '../../core/ui/Botanical.jsx'
import {useEffect, useState} from 'react'
import {useLocale} from '../../core/useLocale.js'
import {Button} from '../../core/ui/Controls.jsx'
import {safeMapUrl} from '../../../../../packages/contracts/address.js'
import './HomePage.css'
import {locationMapEmbed, regionEmbed, verifiedPierMapUrl} from './locationMap.js'
import PublishedHighlights from '../catalog/PublishedHighlights.jsx'

function mapCoordinates(company) {
  if (!company) return null
  const {latitude, longitude} = company
  if ([latitude, longitude].some(value => value == null || String(value).trim() === '' || !Number.isFinite(Number(value)))) return null
  return Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180 ? `${Number(latitude)},${Number(longitude)}` : null
}
function CompanyLocation() {
  const {t} = useLocale()
  const [state, setState] = useState({loading: true})
  const [attempt, setAttempt] = useState(0)
  const [mapView, setMapView] = useState('region')
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => { setState({error: true}); controller.abort() }, 15000)
    setState({loading: true})
    fetch('/api/public/company', {signal: controller.signal}).then(async response => {
      if (!response.ok) throw Error()
      return response.json()
    }).then(data => { if (!controller.signal.aborted) setState({company: data.company}) })
      .catch(() => { if (!controller.signal.aborted) setState({error: true}) }).finally(() => clearTimeout(timeout))
    return () => { clearTimeout(timeout); controller.abort() }
  }, [attempt])
  const company = state.company
  const coordinates = mapCoordinates(company)
  const map = safeMapUrl(company?.mapUrl) || (coordinates ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}` : null)
  const embed = locationMapEmbed(company, coordinates)
  return <section id="company" className="home-location home-container" aria-labelledby="company-title">
    <Botanical className="botanical-location"/><div className="home-location-intro" aria-busy={!!state.loading}><p className="section-eyebrow">{t('เริ่มต้นการเดินทาง')}</p><h2 id="company-title">{t('เริ่มต้นการเดินทางที่นี่')}</h2>
      {state.loading ? <p role="status">{t('กำลังโหลดข้อมูลบริษัท…')}</p> : state.error ? <div><p role="alert">{t('ยังโหลดข้อมูลบริษัทไม่ได้')}</p><Button onClick={() => setAttempt(value => value + 1)}>{t('ลองอีกครั้ง')}</Button></div> : !company ? <p>{t('ยังไม่มีข้อมูลบริษัทสำหรับแสดง')}</p> : <>
        {company.name && <h3>{company.name}</h3>}
        <p>{t('จุดเริ่มต้นของการเดินทางสู่หมู่เกาะสุรินทร์ วางแผนเส้นทางและติดต่อเราก่อนออกเดินทาง')}</p>
        {company.address && <p className="preserve-lines">{company.address}</p>}
        <div className="home-contact-links">{company.phone && <a href={`tel:${company.phone.replace(/[^+\d]/g, '')}`}>{company.phone}</a>}{company.email && <a href={`mailto:${company.email}`}>{company.email}</a>}</div>
        {map && <a className="public-button" href={map} target="_blank" rel="noreferrer">{t('เปิดแผนที่และเส้นทาง')} <span aria-hidden="true">→</span></a>}
        {!company.address && !company.phone && !company.email && !map && <p>{t('ข้อมูลติดต่อจะอัปเดตเร็ว ๆ นี้')}</p>}
      </>}
    </div>
    <div className="home-location-visual">
      {company?.mapUrl === verifiedPierMapUrl && <div className="home-map-options" role="group" aria-label={t('แผนที่')}>{[['region','ภาพรวมเกาะและชายฝั่ง'],['pier','ตำแหน่งท่าเรือ']].map(([value,label])=><button type="button" key={value} aria-pressed={mapView===value} onClick={()=>setMapView(value)}>{t(label)}</button>)}</div>}
      {embed ? <iframe className="home-location-map" title={t('แผนที่ตั้งกรีนวิว ทัวร์')} src={company?.mapUrl === verifiedPierMapUrl && mapView === 'region' ? regionEmbed : embed} loading="eager" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/> : <div className="home-map-placeholder"><span>{t('ดูที่ตั้งและช่องทางติดต่อ เพื่อวางแผนการเดินทางกับเรา')}</span></div>}

    </div>
  </section>
}
export default function HomePage() {
  const {t} = useLocale()
  return <main id="content" className="home-page">
    <section className="hero"><img className="hero-image" src="/images/home/surin-hero.webp" alt={t('ทะเลและหมู่เกาะสุรินทร์')} fetchPriority="high" width="1920" height="1440"/><div className="hero-shade"/><div className="hero-copy"><p className="location-label">{t('SURIN ISLANDS · PHANG NGA')}</p><h1>{t('เริ่มต้นทริปสุรินทร์กับกรีนวิว')}</h1><p className="hero-description">{t('รู้จักเรา รู้จักสุรินทร์ แล้วเลือกทริปที่ใช่สำหรับคุณ')}</p><a href="#company" className="public-button">{t('รู้จักกรีนวิว')} <span aria-hidden="true">→</span></a></div><div className="hero-caption"><span>GREENVIEW TOUR</span><span className="home-handwritten">{t('ทะเลสวย')}<br/>{t('เรื่องราวดี ๆ')}<br/>{t('รอให้คุณออกไปสัมผัส')}</span></div></section>
    <section className="home-welcome home-container"><Botanical/><h2>{t('ยินดีต้อนรับสู่กรีนวิว ทัวร์')}</h2><p>{t('ออกเดินทางสู่หมู่เกาะสุรินทร์ สัมผัสทะเลใส ธรรมชาติ และวิถีชีวิตบนเกาะ ให้ทุกทริปเป็นช่วงเวลาพิเศษที่คุณจะจดจำ')}</p></section>
    <CompanyLocation/>
    <section className="home-surin" id="surin" aria-labelledby="surin-title"><Botanical className="botanical-surin"/><div className="home-container home-surin-layout"><img src="/images/home/surin-coral.webp" alt={t('ปะการังใต้ผิวน้ำและชายหาดหมู่เกาะสุรินทร์')} loading="lazy" width="1448" height="1086"/><div><p className="section-eyebrow">{t('MORE THAN A DAY AT SEA')}</p><h2 id="surin-title">{t('รู้จักหมู่เกาะสุรินทร์')}</h2><p>{t('สัมผัสวิถีชีวิตหมู่บ้านมอแกน เดินเล่นริมชายหาด และลงไปพบสีสันของแนวปะการัง ให้การเดินทางครั้งนี้เป็นเวลาของคุณ')}</p><div className="home-surin-topics">{[
        ['sea','ธรรมชาติและทะเล','สัมผัสความงามของทะเลใส และโลกใต้ทะเล'],
        ['home','วิถีชีวิตมอแกน','เรียนรู้วัฒนธรรม เรียบง่ายและงดงาม'],
        ['bag','เตรียมตัวก่อนเดินทาง','เลือกโปรแกรมและวันเดินทางที่เหมาะกับคุณ']
      ].map(([icon,title,description])=><div className="home-topic" key={icon}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{icon==='sea'?<path d="M2 12q3-4 5 0t5 0t5 0t5 0M2 18q3-4 5 0t5 0t5 0t5 0M12 2v5M9 4h6"/>:icon==='home'?<path d="m2 11 10-9 10 9M5 9v12h14V9M10 21v-7h4v7"/>:<path d="M5 6h14v16H5zM9 6V3h6v3M8 10v8M16 10v8"/>}</svg><div><h3>{t(title)}</h3><p>{t(description)}</p></div></div>)}</div><a className="home-text-link" href="/tours">{t('ดูโปรแกรมทั้งหมด')} <span aria-hidden="true">→</span></a></div></div></section>
    <section className="tour-section" id="tours"><div className="section-heading"><div><p className="section-eyebrow">{t('FIND YOUR NEXT JOURNEY')}</p><h2>{t('เลือกวันพักผ่อนในแบบของคุณ')}</h2></div></div><PublishedHighlights/></section>
  </main>
}
