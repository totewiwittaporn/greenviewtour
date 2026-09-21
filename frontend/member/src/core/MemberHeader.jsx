import {useEffect, useRef, useState} from 'react'
import {LanguageOptions} from './LocaleProvider.jsx'
import {useLocale, label} from './locale.js'
import {Button} from './ui.jsx'

export default function MemberHeader({customer, recovery, onLogout}) {
 const {locale} = useLocale()
 const [open, setOpen] = useState(null)
 const header = useRef(null), navigationTrigger = useRef(null), accountTrigger = useRef(null)
 function close(restoreFocus = false) {
  if (restoreFocus) (open === 'navigation' ? navigationTrigger : accountTrigger).current?.focus()
  setOpen(null)
 }
 useEffect(() => {
  if (!open) return
  function outside(event) {if (!header.current?.contains(event.target)) setOpen(null)}
  function escape(event) {
   if (event.key === 'Escape') {
    event.preventDefault()
    ;(open === 'navigation' ? navigationTrigger : accountTrigger).current?.focus()
    setOpen(null)
   }
  }
  document.addEventListener('pointerdown', outside)
  document.addEventListener('focusin', outside)
  document.addEventListener('keydown', escape)
  return () => {
   document.removeEventListener('pointerdown', outside)
   document.removeEventListener('focusin', outside)
   document.removeEventListener('keydown', escape)
  }
 }, [open])
 useEffect(() => {
  const media = window.matchMedia('(max-width: 1100px)')
  const reset = () => setOpen(null)
  media.addEventListener('change', reset)
  return () => media.removeEventListener('change', reset)
 }, [])
 const identity = customer?.displayName || 'Member'
 return <header className="member-header" ref={header}>
  <a className="brand" href="/">GREENVIEW <span>MEMBER</span></a>
  <Button ref={navigationTrigger} className="secondary member-menu-toggle" aria-label={locale === 'th' ? 'เมนู / Menu' : 'Menu'} aria-controls="member-navigation" aria-expanded={open === 'navigation'} onClick={() => setOpen(open === 'navigation' ? null : 'navigation')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></Button>
  <nav id="member-navigation" className={open === 'navigation' ? 'member-navigation is-open' : 'member-navigation'} aria-label={label('เมนูสมาชิก')} onClick={() => setOpen(null)}>
   <a href="/tours" aria-current={location.pathname === '/tours' ? 'page' : undefined}>{label('โปรแกรมทัวร์')}</a>
   {customer && !recovery && <><a href="/" aria-current={location.pathname === '/' ? 'page' : undefined}>{label('ทริปของฉัน')}</a><a href="/profile" aria-current={location.pathname === '/profile' ? 'page' : undefined}>{label('ข้อมูลของฉัน')}</a></>}
   {!customer && <a href="/login" aria-current={location.pathname === '/login' ? 'page' : undefined}>{label('เข้าสู่ระบบ')}</a>}
  </nav>
  <div className="member-account">
   <Button ref={accountTrigger} className="secondary member-account-trigger" aria-label={customer ? (locale === 'th' ? 'ข้อมูลผู้ใช้ / User Info' : 'User Info') : 'ภาษา / Language'} aria-expanded={open === 'account'} aria-controls="member-account-panel" onClick={() => setOpen(open === 'account' ? null : 'account')}>
    {customer ? <><span className="member-avatar" aria-hidden="true">{Array.from(identity)[0]?.toUpperCase()}</span><span className="member-account-name">{identity}</span></> : <span>{locale.toUpperCase()}</span>}<span aria-hidden="true">⌄</span>
   </Button>
   {open === 'account' && <div id="member-account-panel" className="member-account-panel">
    {customer && <div className="member-identity"><strong>{identity}</strong><dl className="member-contact-details"><div><dt>{label('โทรศัพท์')}</dt><dd>{customer.phone || '—'}</dd></div><div><dt>LINE ID</dt><dd>{customer.lineId || '—'}</dd></div></dl>{!recovery && <a className="member-edit-profile" href="/profile" onClick={() => close()}>{label('แก้ไขข้อมูลส่วนตัว')}</a>}</div>}
    <LanguageOptions onSelect={() => close(true)} />
    {customer && <Button className="member-signout" onClick={() => {close(true); onLogout()}}>{label('ออกจากระบบ')}</Button>}
   </div>}
  </div>
 </header>
}
