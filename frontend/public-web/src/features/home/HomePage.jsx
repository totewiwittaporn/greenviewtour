import {useEffect, useState} from 'react'
import {useLocale} from '../../core/useLocale.js'
import {Button} from '../../core/ui/Controls.jsx'
import {safeMapUrl} from '../../../../../packages/contracts/address.js'
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
    <div className="home-location-intro"><p className="section-eyebrow">{t('เริ่มต้นการเดินทาง')}</p><h2 id="company-title">{t('พบกันที่กรีนวิว ทัวร์')}</h2><p>{t('ดูที่ตั้งและช่องทางติดต่อ เพื่อวางแผนการเดินทางกับเรา')}</p></div>
    <div className="home-location-details" aria-busy={!!state.loading}>
      {state.loading ? <p role="status">{t('กำลังโหลดข้อมูลบริษัท…')}</p> : state.error ? <div><p role="alert">{t('ยังโหลดข้อมูลบริษัทไม่ได้')}</p><Button onClick={() => setAttempt(value => value + 1)}>{t('ลองอีกครั้ง')}</Button></div> : !company ? <p>{t('ยังไม่มีข้อมูลบริษัทสำหรับแสดง')}</p> : <>
        <span className="home-location-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span>
        {coordinates && <iframe className="home-location-map" title={t('แผนที่ตั้งกรีนวิว ทัวร์')} src={`https://www.google.com/maps?q=${encodeURIComponent(coordinates)}&output=embed`} loading="lazy" referrerPolicy="no-referrer"/>}
        {company.name && <h3>{company.name}</h3>}
        {company.address && <p className="preserve-lines">{company.address}</p>}
        <div className="home-contact-links">{company.phone && <a href={`tel:${company.phone.replace(/[^+\d]/g, '')}`}>{company.phone}</a>}{company.email && <a href={`mailto:${company.email}`}>{company.email}</a>}</div>
        {map && <a className="home-text-link" href={map} target="_blank" rel="noreferrer">{t('เปิดแผนที่และเส้นทาง')} <span aria-hidden="true">↗</span></a>}
        {!company.address && !company.phone && !company.email && !map && <p>{t('ข้อมูลติดต่อจะอัปเดตเร็ว ๆ นี้')}</p>}
      </>}
    </div>
  </section>
}
export default function HomePage() {
  const {t} = useLocale()
  return <main id="content" className="home-page">
    <section className="hero"><img className="hero-image" src="/images/home/surin-hero.webp" alt={t('ทะเลและหมู่เกาะสุรินทร์')} fetchPriority="high" width="1920" height="1440"/><div className="hero-shade"/><div className="hero-copy"><p className="location-label">{t('SURIN ISLANDS · PHANG NGA')}</p><h1>{t('เริ่มต้นทริปสุรินทร์')}<br/>{t('กับกรีนวิว')}</h1><p className="hero-description">{t('น้ำทะเลใส โลกใต้ทะเลที่มีชีวิต')}<br/>{t('และวันพักผ่อนที่ได้อยู่ใกล้ธรรมชาติจริง ๆ')}</p><a href="#company" className="public-button">{t('รู้จักกรีนวิว')} <span aria-hidden="true">→</span></a></div><div className="hero-caption"><span>GREENVIEW TOUR</span><span>{t('ใช้ชีวิต ติดเกาะสุรินทร์')}</span></div></section>
    <section className="home-welcome home-container"><p className="section-eyebrow">{t('ยินดีต้อนรับสู่กรีนวิว ทัวร์')}</p><h2>{t('วันพักผ่อนที่ได้ใกล้ชิดธรรมชาติ')}</h2><p>{t('รู้จักหมู่เกาะสุรินทร์กับ Greenview Tour สำรวจเรื่องราวของเกาะ และเลือกโปรแกรมที่เหมาะกับวันพักผ่อนของคุณ')}</p><a href="#company" className="home-text-link">{t('รู้จักเรา')} <span aria-hidden="true">↓</span></a></section>
    <CompanyLocation/>
    <section className="home-surin" id="surin" aria-labelledby="surin-title"><div className="home-container home-surin-layout"><img src="/images/home/surin-hero.webp" alt={t('บรรยากาศธรรมชาติจาก Greenview Tour')} loading="lazy" width="1448" height="1086"/><div><p className="section-eyebrow">{t('MORE THAN A DAY AT SEA')}</p><h2 id="surin-title">{t('รู้จักหมู่เกาะสุรินทร์')}</h2><p>{t('สัมผัสวิถีชีวิตหมู่บ้านมอแกน เดินเล่นริมชายหาด และลงไปพบสีสันของแนวปะการัง ให้การเดินทางครั้งนี้เป็นเวลาของคุณ')}</p><div className="home-surin-topics"><span>{t('โลกใต้ทะเล')}</span><span>{t('ชายหาดและธรรมชาติ')}</span><span>{t('วิถีชีวิตมอแกน')}</span></div><a className="home-text-link" href="/tours">{t('ดูโปรแกรมทั้งหมด')} <span aria-hidden="true">→</span></a></div></div></section>
    <section className="tour-section" id="tours"><div className="section-heading"><div><p className="section-eyebrow">{t('FIND YOUR NEXT JOURNEY')}</p><h2>{t('เลือกวันพักผ่อนในแบบของคุณ')}</h2></div><a className="home-text-link" href="/tours">{t('ดูโปรแกรมทั้งหมด')} <span aria-hidden="true">→</span></a></div><PublishedHighlights/></section>
  </main>
}
