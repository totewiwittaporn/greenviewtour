import Botanical from '../../core/ui/Botanical.jsx'
import {useLocale} from '../../core/useLocale.js'
import './HomePage.css'
import CompanyLocation from '../company/CompanyLocation.jsx'
import PublishedHighlights from '../catalog/PublishedHighlights.jsx'

export default function HomePage() {
  const {t}=useLocale()
  return <main id="content" className="home-page">
    <section className="hero home-hero"><img className="hero-image" src="/images/home/surin-hero.webp" alt={t('ทะเลและหมู่เกาะสุรินทร์')} fetchPriority="high" width="1920" height="1440"/><div className="hero-shade"/><div className="hero-copy"><p className="home-kicker">SURIN ISLANDS</p><h1>{t('เที่ยวหมู่เกาะสุรินทร์กับ Greenview Tour')}</h1><p className="hero-description">{t('สัมผัสทะเลสวย น้ำใส ธรรมชาติอุดมสมบูรณ์ ออกเดินทางจากคุระบุรี')}</p><div className="home-hero-actions"><a href="/tours" className="public-button">{t('ดูโปรแกรมทัวร์')} <span aria-hidden="true">→</span></a><a href="/surin-islands" className="home-secondary-button">{t('รู้จักเกาะสุรินทร์')}</a></div></div><div className="hero-caption"><span className="home-handwritten">{t('ทะเลสวย')}<br/>{t('เรื่องราวดี ๆ')}<br/>{t('รอให้คุณออกไปสัมผัส')}</span></div></section>
    <form className="home-trip-finder" action="/tours" method="get"><label><span>{t('วันที่เดินทาง')}</span><input type="date" name="date"/></label><label><span>{t('จำนวนผู้เดินทาง')}</span><input type="number" name="pax" min="1" max="100" defaultValue="2"/></label><label><span>{t('ประเภทโปรแกรม')}</span><select name="duration" defaultValue=""><option value="">{t('ทุกโปรแกรม')}</option><option value="day">{t('วันเดียว')}</option><option value="overnight">{t('ค้างคืน')}</option></select></label><button type="submit">{t('ค้นหาโปรแกรม')}</button></form>
    <section className="home-featured tour-section" id="tours"><div className="section-heading"><div><p className="section-eyebrow">FEATURED TOURS</p><h2>{t('โปรแกรมทัวร์ยอดนิยม')}</h2><p>{t('ทริปที่คัดมาให้เห็นภาพก่อน แล้วค่อยเลือกดูโปรแกรมทั้งหมดได้ในหน้ารวม')}</p></div><a className="home-all-tours" href="/tours">{t('ดูโปรแกรมทัวร์ทั้งหมด')} →</a></div><PublishedHighlights/></section>
    <section className="home-welcome home-container"><Botanical/><h2>{t('ยินดีต้อนรับสู่กรีนวิว ทัวร์')}</h2><p>{t('ออกเดินทางสู่หมู่เกาะสุรินทร์ สัมผัสทะเลใส ธรรมชาติ และวิถีชีวิตบนเกาะ ให้ทุกทริปเป็นช่วงเวลาพิเศษที่คุณจะจดจำ')}</p></section>
    <section className="home-surin" id="surin" aria-labelledby="surin-title"><Botanical className="botanical-surin"/><div className="home-container home-surin-layout"><img src="/images/home/surin-coral.webp" alt={t('ปะการังใต้ผิวน้ำและชายหาดหมู่เกาะสุรินทร์')} loading="lazy" width="1448" height="1086"/><div><p className="section-eyebrow">MORE THAN A DAY AT SEA</p><h2 id="surin-title">{t('รู้จักหมู่เกาะสุรินทร์')}</h2><p>{t('สัมผัสวิถีชีวิตหมู่บ้านมอแกน เดินเล่นริมชายหาด และลงไปพบสีสันของแนวปะการัง ให้การเดินทางครั้งนี้เป็นเวลาของคุณ')}</p><a className="home-text-link" href="/surin-islands">{t('อ่านเรื่องราวของสุรินทร์')} <span aria-hidden="true">→</span></a></div></div></section>
    <CompanyLocation/>
    <section className="home-final-cta"><div><p>MORE TO EXPLORE</p><h2>{t('ยังมีอีกหลายโปรแกรมรอให้คุณค้นพบ')}</h2><span>{t('ทริปวันเดียว พักค้างคืน เรือเหมาลำ หรือแพ็กเกจสำหรับครอบครัว เลือกได้ตามสไตล์การเดินทางของคุณ')}</span><a href="/tours">{t('ดูโปรแกรมทัวร์ทั้งหมด')} →</a></div></section>
  </main>
}
