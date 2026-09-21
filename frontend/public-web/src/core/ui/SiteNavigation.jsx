import {useEffect, useId} from 'react'
import {useDisclosure} from '../useDisclosure.js'
import {useLocale} from '../useLocale.js'
import {LanguageSelector} from '../Locale.jsx'
const base='https://greenviewtour.com'
const local=['localhost','127.0.0.1'].includes(location.hostname)
const customerLogin=local?'http://localhost:5175/login':'https://member.greenviewtour.com/login'
const staffLogin=local?'http://localhost:5174/login':import.meta.env.VITE_STAFF_LOGIN_URL
export function SiteHeader(){
  const {t,label}=useLocale()
  const {open,setOpen,container,trigger}=useDisclosure()
  const id=useId()
  useEffect(() => {
    const desktop=window.matchMedia('(min-width: 1101px)')
    const close=event => { if(event.matches) setOpen(false) }
    desktop.addEventListener('change',close)
    return () => desktop.removeEventListener('change',close)
  },[setOpen])
  return <>
    <div className="public-topbar">
      <p>{t("ออกเดินทางจากคุระบุรี จังหวัดพังงา")} <span className="public-topbar-location">{t("หมู่เกาะสุรินทร์ · ทะเลอันดามัน")}</span></p>
      <div className="public-topbar-actions"><LanguageSelector/><a className="customer-login" href={customerLogin}>{label("เข้าสู่ระบบ / สมัครสมาชิก")}</a></div>
    </div>
    <header className="site-header" ref={container}>
      <a href="/" aria-label={t("Greenview Tour หน้าแรก")}><img className="logo" src={`${base}/wp-content/uploads/2024/12/greenview-tour-logo-1.png`} alt="Greenview Tour"/></a>
      <button ref={trigger} type="button" className="public-menu-toggle" aria-expanded={open} aria-controls={id} aria-label={t("เมนูหลัก")} onClick={()=>setOpen(!open)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={open?'M6 6l12 12M18 6L6 18':'M4 6h16M4 12h16M4 18h16'}/></svg></button>
      <nav id={id} className={open?'public-main-nav is-open':'public-main-nav'} aria-label={t("เมนูหลัก")} onClick={event=>{if(event.target.closest('a'))setOpen(false)}}><a href="/">{label("หน้าแรก")}</a><a href="/#company">{label("รู้จักเรา")}</a><a href="/#surin">{label("รู้จักเกาะสุรินทร์")}</a><a href="/tours">{label("โปรแกรมทัวร์")}</a></nav>
    </header>
  </>
}
export function SiteFooter(){const {t,label}=useLocale();return <footer className="public-footer"><a href="/" aria-label={t("Greenview Tour หน้าแรก")}><img className="logo" src={`${base}/wp-content/uploads/2024/12/greenview-tour-logo-1.png`} alt="Greenview Tour"/></a><span>{t("คุระบุรี · พังงา · ประเทศไทย")}</span>{staffLogin&&<a className="staff-login" href={staffLogin}>{label("สำหรับพนักงาน")}</a>}</footer>}
