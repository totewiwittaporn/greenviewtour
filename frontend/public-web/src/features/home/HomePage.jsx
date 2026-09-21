import {useEffect, useState} from 'react'
import {useLocale} from '../../core/useLocale.js'
import {Button} from '../../core/ui/Controls.jsx'
import {safeMapUrl} from '../../../../../packages/contracts/address.js'
import './HomePage.css'
import {locationMapEmbed} from './locationMap.js'
import PublishedHighlights from '../catalog/PublishedHighlights.jsx'

function Botanical({className=''}) {
  const leaflets=[
    'M39 174C17 159 4 137 2 112C15 140 29 154 39 174Z',
    'M53 150C28 130 20 105 23 76C30 108 43 130 53 150Z',
    'M71 127C45 105 44 73 53 47C51 81 62 106 71 127Z',
    'M94 102C73 77 81 48 92 25C82 58 88 82 94 102Z',
    'M119 78C106 54 120 28 137 10C119 37 118 59 119 78Z',
    'M144 56C143 36 161 15 179 5C157 23 150 41 144 56Z',
    'M40 172C68 154 103 153 135 161C99 161 66 165 40 172Z',
    'M54 148C87 125 126 123 160 132C121 130 84 140 54 148Z',
    'M74 123C108 98 151 99 181 109C141 104 102 113 74 123Z',
    'M97 98C131 76 170 77 199 89C163 83 126 88 97 98Z',
    'M121 76C153 58 185 58 211 71C180 65 149 67 121 76Z',
    'M147 54C173 39 196 41 219 51C193 46 169 49 147 54Z',
    'M166 40C182 23 202 17 218 17C195 23 180 31 166 40Z',
  ]
  return <svg className={`home-botanical ${className}`} viewBox="0 0 220 220" aria-hidden="true"><path d="M16 218C43 144 102 85 211 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>{leaflets.map(d=><path key={d} d={d} fill="currentColor"/>)}</svg>
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
      {embed ? <iframe className="home-location-map" title={t('แผนที่ตั้งกรีนวิว ทัวร์')} src={embed} loading="eager" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/> : <div className="home-map-placeholder"><span>{t('ดูที่ตั้งและช่องทางติดต่อ เพื่อวางแผนการเดินทางกับเรา')}</span></div>}

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
