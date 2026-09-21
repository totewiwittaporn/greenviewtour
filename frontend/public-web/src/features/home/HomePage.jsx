import {useEffect, useState} from 'react'
import {useLocale} from '../../core/useLocale.js'
import {Button} from '../../core/ui/Controls.jsx'
import {safeMapUrl} from '../../../../../packages/contracts/address.js'
import './HomePage.css'
import PublishedHighlights from '../catalog/PublishedHighlights.jsx'

function Botanical({className=''}) {
  return <svg className={`home-botanical ${className}`} viewBox="0 0 220 220" aria-hidden="true"><path d="M15 210Q80 100 203 20" fill="none" stroke="currentColor" strokeWidth="3"/>{[0,1,2,3,4].map(i=><g key={i} transform={`translate(${i*32} ${-i*31})`}><path d="M35 183Q-7 165 5 117Q49 136 35 183ZM40 177Q62 119 109 132Q91 173 40 177Z" fill="currentColor"/></g>)}</svg>
}
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
      <div className="home-route-art" role="img" aria-label={t('ภาพประกอบเส้นทางจากคุระบุรีสู่หมู่เกาะสุรินทร์ ไม่ใช่แผนที่นำทาง')}>
        <svg viewBox="0 0 600 330" aria-hidden="true"><defs><linearGradient id="route-sea" x2="1" y2="1"><stop stopColor="#91d5e3"/><stop offset="1" stopColor="#48a8c3"/></linearGradient></defs><rect width="600" height="330" fill="url(#route-sea)"/><path d="M420 0 399 42 413 76 384 113 400 150 372 183 394 218 368 256 380 290 360 330H600V0Z" fill="#d5dfc3"/><path d="m472 0-18 57 11 42-27 44 5 48-23 51 11 39-20 49" fill="none" stroke="#f8faf1" strokeWidth="5"/><path d="m115 104 22-21 26 14 6 30-18 21-29-13ZM138 166l20-11 21 19-5 26-24 7-17-21Z" fill="#608f70" stroke="#c8e1bd" strokeWidth="4"/><path d="M170 153Q286 245 404 145" stroke="white" strokeWidth="2.5" strokeDasharray="7 7" fill="none"/><circle cx="404" cy="145" r="11" fill="#ee842f" stroke="white" strokeWidth="4"/><path d="m277 191 27 0-6 7h-17zM289 174v17m0-14 12 10h-12" fill="white" stroke="white" strokeWidth="2"/></svg>
        <strong className="route-islands">{t('หมู่เกาะสุรินทร์')}</strong><strong className="route-mainland">{t('คุระบุรี')}<small>GREENVIEW TOUR</small></strong><span className="route-note">{t('ภาพประกอบเส้นทาง · เปิดแผนที่เพื่อดูตำแหน่งจริง')}</span>
      </div>
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
