import Botanical from '../../core/ui/Botanical.jsx'
import {useLocale} from '../../core/useLocale.js'
import './HomePage.css'
import CompanyLocation from '../company/CompanyLocation.jsx'
import PublishedHighlights from '../catalog/PublishedHighlights.jsx'

export default function HomePage() {
  const {t} = useLocale()
  return <main id="content" className="home-page">
    <section className="hero"><img className="hero-image" src="/images/home/surin-hero.webp" alt={t('ทะเลและหมู่เกาะสุรินทร์')} fetchPriority="high" width="1920" height="1440"/><div className="hero-shade"/><div className="hero-copy"><p className="location-label">{t('SURIN ISLANDS · PHANG NGA')}</p><h1>{t('เริ่มต้นทริปสุรินทร์กับกรีนวิว')}</h1><p className="hero-description">{t('รู้จักเรา รู้จักสุรินทร์ แล้วเลือกทริปที่ใช่สำหรับคุณ')}</p><a href="/about" className="public-button">{t('รู้จักกรีนวิว')} <span aria-hidden="true">→</span></a></div><div className="hero-caption"><span>GREENVIEW TOUR</span><span className="home-handwritten">{t('ทะเลสวย')}<br/>{t('เรื่องราวดี ๆ')}<br/>{t('รอให้คุณออกไปสัมผัส')}</span></div></section>
    <section className="home-welcome home-container"><Botanical/><h2>{t('ยินดีต้อนรับสู่กรีนวิว ทัวร์')}</h2><p>{t('ออกเดินทางสู่หมู่เกาะสุรินทร์ สัมผัสทะเลใส ธรรมชาติ และวิถีชีวิตบนเกาะ ให้ทุกทริปเป็นช่วงเวลาพิเศษที่คุณจะจดจำ')}</p></section>
    <CompanyLocation/>
    <section className="home-surin" id="surin" aria-labelledby="surin-title"><Botanical className="botanical-surin"/><div className="home-container home-surin-layout"><img src="/images/home/surin-coral.webp" alt={t('ปะการังใต้ผิวน้ำและชายหาดหมู่เกาะสุรินทร์')} loading="lazy" width="1448" height="1086"/><div><p className="section-eyebrow">{t('MORE THAN A DAY AT SEA')}</p><h2 id="surin-title">{t('รู้จักหมู่เกาะสุรินทร์')}</h2><p>{t('สัมผัสวิถีชีวิตหมู่บ้านมอแกน เดินเล่นริมชายหาด และลงไปพบสีสันของแนวปะการัง ให้การเดินทางครั้งนี้เป็นเวลาของคุณ')}</p><div className="home-surin-topics">{[
        ['sea','ธรรมชาติและทะเล','สัมผัสความงามของทะเลใส และโลกใต้ทะเล'],
        ['home','วิถีชีวิตมอแกน','เรียนรู้วัฒนธรรม เรียบง่ายและงดงาม'],
        ['bag','เตรียมตัวก่อนเดินทาง','เลือกโปรแกรมและวันเดินทางที่เหมาะกับคุณ']
      ].map(([icon,title,description])=><div className="home-topic" key={icon}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{icon==='sea'?<path d="M2 12q3-4 5 0t5 0t5 0t5 0M2 18q3-4 5 0t5 0t5 0t5 0M12 2v5M9 4h6"/>:icon==='home'?<path d="m2 11 10-9 10 9M5 9v12h14V9M10 21v-7h4v7"/>:<path d="M5 6h14v16H5zM9 6V3h6v3M8 10v8M16 10v8"/>}</svg><div><h3>{t(title)}</h3><p>{t(description)}</p></div></div>)}</div><a className="home-text-link" href="/surin-islands">{t('อ่านเรื่องราวของสุรินทร์')} <span aria-hidden="true">→</span></a></div></div></section>
    <section className="tour-section" id="tours"><div className="section-heading"><div><p className="section-eyebrow">{t('FIND YOUR NEXT JOURNEY')}</p><h2>{t('เลือกวันพักผ่อนในแบบของคุณ')}</h2></div></div><PublishedHighlights/></section>
  </main>
}
