import {useEffect} from 'react'
import {useLocale} from '../core/locale.js'
import './member-paused.css'

export default function MemberPaused(){
  const {locale,changeLocale}=useLocale(),english=locale==='en'
  const home=['localhost','127.0.0.1'].includes(location.hostname)?'http://localhost:5173':'https://greenviewtour.com'
  const title=english?'Please contact our team to book':'จองโปรแกรมทัวร์ผ่านเจ้าหน้าที่'
  useEffect(()=>{document.title=title+' | Greenview Tour'},[title])
  return <main id="content" className="member-paused">
    <a href={home}><img src="/images/brand/greenview-logo.webp" width="160" alt="Greenview Tour"/></a>
    <div role="group" aria-label="ภาษา / Language"><button type="button" aria-pressed={!english} onClick={()=>changeLocale('th')}>ไทย</button><button type="button" aria-pressed={english} onClick={()=>changeLocale('en')}>English</button></div>
    <section className="panel"><h1>{title}</h1>
      <p>{english?'Member registration, online booking and online payment are not available at this time. Our team can help you choose a programme and confirm the details.':'ขณะนี้ยังไม่เปิดสมัครสมาชิก จองและชำระเงินออนไลน์ กรุณาติดต่อทีมงานเพื่อเลือกโปรแกรมและยืนยันรายละเอียดการเดินทาง'}</p>
      <div className="actions"><a href={home+'/tours'}>{english?'View tour programmes':'ดูโปรแกรมทัวร์'}</a><a href={home+'/contact-us'}>{english?'Contact Greenview Tour':'ติดต่อ Greenview Tour'}</a></div>
    </section>
  </main>
}
