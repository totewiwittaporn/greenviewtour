import {useLocale} from '../../core/useLocale.js'
import {publicInfoRoutes} from '../../core/publicRoutes.js'
import './content.css'

export default function InformationPage() {
  const {locale,t}=useLocale()
  const language=locale==='en'?'en':'th'
  return <main id="content" className="editorial-page information-page">
    <section className="editorial-container information-intro">
      <p className="section-eyebrow">GREENVIEW TOUR</p>
      <h1>{t('ข้อมูลการท่องเที่ยว')}</h1>
      <p>{t('รู้จักเรา รู้จักสุรินทร์ และเตรียมตัวก่อนออกเดินทาง')}</p>
      <div className="information-grid">
        {Object.entries(publicInfoRoutes).filter(([path])=>path!=='/information').map(([path,info])=><article key={path}>
          <h2><a href={path}>{info.title[language]}</a></h2>
          <p>{info.description[language]}</p>
          <a className="home-text-link" href={path}>{t('อ่านเพิ่มเติม')} <span aria-hidden="true">→</span></a>
        </article>)}
      </div>
      <a className="public-button" href="/tours">{t('ดูโปรแกรมทัวร์ทั้งหมด')}</a>
    </section>
  </main>
}
