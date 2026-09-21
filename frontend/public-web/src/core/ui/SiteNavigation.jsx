import {useEffect, useId} from 'react'
import {useDisclosure} from '../useDisclosure.js'
import {useLocale} from '../useLocale.js'
import {LanguageSelector} from '../Locale.jsx'
const local=['localhost','127.0.0.1'].includes(location.hostname)
const customerLogin=local?'http://localhost:5175/login':'https://member.greenviewtour.com/login'
const staffLogin=local?'http://localhost:5174/login':import.meta.env.VITE_STAFF_LOGIN_URL
const links=[['/','หน้าแรก'],['/#company','รู้จักเรา'],['/#surin','รู้จักเกาะสุรินทร์'],['/tours','โปรแกรมทัวร์']]
function Brand(){
  const {t}=useLocale()
  return <a className="public-brand" href="/" aria-label={t('Greenview Tour หน้าแรก')}><img src="/images/brand/greenview-logo.png" alt="" width="1508" height="994"/></a>
}
function isCurrent(href){
  const target=new URL(href,location.origin)
  return target.pathname===location.pathname && target.hash===location.hash
}
export function SiteHeader(){
  const {t}=useLocale()
  const {open,setOpen,container,trigger}=useDisclosure()
  const id=useId()
  useEffect(() => {
    const desktop=window.matchMedia('(min-width: 1101px)')
    const close=event => { if(event.matches) setOpen(false) }
    desktop.addEventListener('change',close)
    return () => desktop.removeEventListener('change',close)
  },[setOpen])
  return <header className="site-header" ref={container}>
    <Brand/>
    <button ref={trigger} type="button" className="public-menu-toggle" aria-expanded={open} aria-controls={id} aria-label={t('เมนูหลัก')} onClick={()=>setOpen(!open)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={open?'M6 6l12 12M18 6L6 18':'M4 6h16M4 12h16M4 18h16'}/></svg></button>
    <div className={open?'public-header-content is-open':'public-header-content'}>
      <nav id={id} className="public-main-nav" aria-label={t('เมนูหลัก')} onClick={event=>{if(event.target.closest('a'))setOpen(false)}}>{links.map(([href,text])=><a key={href} href={href} aria-current={isCurrent(href)?(href.includes('#')?'location':'page'):undefined}>{t(text)}</a>)}</nav>
      <div className="public-topbar-actions"><LanguageSelector/><a className="customer-login" href={customerLogin}>{t('เข้าสู่ระบบ')}</a><a className="customer-register" href={`${customerLogin}?mode=register`}>{t('สมัครสมาชิก')}</a></div>
    </div>
  </header>
}
export function SiteFooter(){
  const {t}=useLocale()
  return <footer className="public-footer">
    <div className="public-footer-main">
      <div className="public-footer-brand"><Brand/><p>{t('ใกล้ทะเล ใกล้ธรรมชาติ กับกรีนวิว ทัวร์')}</p><p className="public-footer-location">{t('คุระบุรี · พังงา · ประเทศไทย')}</p></div>
      <nav aria-label={t('เมนูส่วนท้าย')}><h2>{t('เมนูหลัก')}</h2>{links.map(([href,text])=><a key={href} href={href}>{t(text)}</a>)}</nav>
      <nav aria-label={t('ข้อมูลที่เป็นประโยชน์')}><h2>{t('ข้อมูลที่เป็นประโยชน์')}</h2><a href="/#company">{t('ที่ตั้งและการเดินทาง')}</a><a href="/promotions">{t('โปรโมชั่น')}</a><a href="/#company">{t('ติดต่อเรา')}</a>{staffLogin&&<a className="staff-login" href={staffLogin}>{t('สำหรับพนักงาน')}</a>}</nav>
      <p className="public-footer-note">{t('ออกไปเห็น')}<br/>{t('สิ่งใหม่กว่าเดิม')}</p>
    </div>
    <div className="public-footer-bottom"><small>© {new Date().getFullYear()} GREENVIEW TOUR. {t('สงวนลิขสิทธิ์')}</small><a className="public-back-top" href="#" aria-label={t('กลับขึ้นด้านบน')}>↑</a></div>
  </footer>
}
