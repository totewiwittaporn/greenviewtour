import Botanical from '../../core/ui/Botanical.jsx'
import ContactButton from './ContactButton.jsx'
import ContactLinks from './ContactLinks.jsx'
import {useCompanyContact} from './useCompanyContact.js'
import {useState} from 'react'
import {useLocale} from '../../core/useLocale.js'
import {Button} from '../../core/ui/Controls.jsx'
import {safeMapUrl} from '../../../../../packages/contracts/address.js'
import '../home/HomePage.css'
import {locationMapEmbed, regionEmbed, verifiedPierMapUrl} from '../home/locationMap.js'

function mapCoordinates(company) {
  if (!company) return null
  const {latitude, longitude} = company
  if ([latitude, longitude].some(value => value == null || String(value).trim() === '' || !Number.isFinite(Number(value)))) return null
  return Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180 ? `${Number(latitude)},${Number(longitude)}` : null
}
export default function CompanyLocation() {
  const {t} = useLocale()
  const {state, refresh} = useCompanyContact()
  const [mapView, setMapView] = useState('region')
  const company = state.company
  const coordinates = mapCoordinates(company)
  const map = safeMapUrl(company?.mapUrl) || (coordinates ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}` : null)
  const embed = locationMapEmbed(company, coordinates)
  return <section id="company" className="home-location home-container" aria-labelledby="company-title">
    <Botanical className="botanical-location"/><div className="home-location-intro" aria-busy={!!state.loading}><p className="section-eyebrow">{t('เริ่มต้นการเดินทาง')}</p><h2 id="company-title">{t('เริ่มต้นการเดินทางที่นี่')}</h2>
      {state.loading ? <p role="status">{t('กำลังโหลดข้อมูลบริษัท…')}</p> : state.error ? <div><p role="alert">{t('ยังโหลดข้อมูลบริษัทไม่ได้')}</p><Button onClick={refresh}>{t('ลองอีกครั้ง')}</Button></div> : !company ? <p>{t('ยังไม่มีข้อมูลบริษัทสำหรับแสดง')}</p> : <>
        {company.name && <h3>{company.name}</h3>}
        <p>{t('จุดเริ่มต้นของการเดินทางสู่หมู่เกาะสุรินทร์ วางแผนเส้นทางและติดต่อเราก่อนออกเดินทาง')}</p>
        {company.address && <p className="preserve-lines">{company.address}</p>}
        <ContactLinks company={company}/>
        {map && <a className="public-button" href={map} target="_blank" rel="noreferrer">{t('เปิดแผนที่และเส้นทาง')} <span aria-hidden="true">→</span></a>}
        {!company.address && !company.phone && !company.email && !company.lineId && !company.instagramUrl && !map && <p>{t('ข้อมูลติดต่อจะอัปเดตเร็ว ๆ นี้')}</p>}
      </>}
      <ContactButton/>
    </div>
    <div className="home-location-visual">
      {company?.mapUrl === verifiedPierMapUrl && <div className="home-map-options" role="group" aria-label={t('แผนที่')}>{[['region','ภาพรวมเกาะและชายฝั่ง'],['pier','ตำแหน่งท่าเรือ']].map(([value,label])=><button type="button" key={value} aria-pressed={mapView===value} onClick={()=>setMapView(value)}>{t(label)}</button>)}</div>}
      {embed ? <iframe className="home-location-map" title={t('แผนที่ตั้งกรีนวิว ทัวร์')} src={company?.mapUrl === verifiedPierMapUrl && mapView === 'region' ? regionEmbed : embed} loading="eager" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/> : <div className="home-map-placeholder"><span>{t('ดูที่ตั้งและช่องทางติดต่อ เพื่อวางแผนการเดินทางกับเรา')}</span></div>}

    </div>
  </section>
}
