import {translateLabel as bilingualLabel} from '../i18n/runtime.js'
import {useLocale} from '../i18n/locale.jsx'
import {roleNames} from '../../../../../packages/contracts/access.js'
import { WorkspaceNavigation } from './WorkspaceNavigation.jsx'
import { useNavigation } from '../navigation/Navigation.jsx'
import { useRef, useState } from 'react'
import { UserInfo } from './UserInfo.jsx'
import { Icon } from './Icon.jsx'
import { Dialog } from './Dialog.jsx'
import { SearchField } from './SearchField.jsx'
import { dashboardPersona } from './dashboardPersona.js'
import './Shell.css'
export function Shell({ children, user, onLogout, signingOut, canReadUsers, logoutError, onEditProfile, pageTitle }) {
  const {t} = useLocale()
  const [open, setOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const sidebar = useRef(null)
  const navigation = useNavigation()
  const persona = dashboardPersona(user)
  const roleLabel = {programmer:'Programmer / System Administrator',gm:'General Manager','booking-manager':'Booking Manager','booking-assistant':'Booking Assistant'}[persona] || (user?.roles||[]).map(role=>t(roleNames[role.roleCode||role.code]||role.roleCode||role.code)).join(' / ') || t('Workspace')
  const search = value => {
    setQuery(value)
    // Reuse the canonical navigation's permitted destinations, never a parallel access model.
    const links = Array.from(sidebar.current?.querySelectorAll('nav a[href]') || [])
    setResults(links.filter(link => link.textContent.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase())).map(link => ({href: link.getAttribute('href'), label: link.textContent})))
    setSearchOpen(Boolean(value.trim()))
  }
  const brand = <a className="reference-brand" href="/dashboard"><img src="/images/brand/greenview-logo.png" alt="Greenview Tour" /></a>
  const toggle = <button type="button" className="icon-button menu-toggle" aria-label={t('Toggle navigation')} aria-controls="workspace-navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" /></button>
  return <div className="workspace workspace-refined workspace-reference"><a className="skip-link" href="#main">{t('Skip to content')}</a>
    <aside ref={sidebar} className={`sidebar ${open ? 'is-open' : ''}`} id="workspace-navigation" onClick={event => { if (event.target.closest('a[href]')) setOpen(false) }} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); document.querySelector('.menu-toggle')?.focus() } }}>
      <WorkspaceNavigation user={user} canReadUsers={canReadUsers} pageTitle={pageTitle}/>
      {<div className="reference-sidebar-card"><span>{t(roleLabel)}</span><img src="/images/dashboard/island-hero.png" alt="" /><p>{persona === 'programmer' ? 'Keep The System Running' : 'More Happy Customers'}<small>{persona === 'programmer' ? 'For Better Journeys' : 'A Brighter Tomorrow'}</small></p></div>}
    </aside>
    <div className="workspace-body"><header className="topbar">
      <div className="reference-brand-wrap">{toggle}{brand}</div>
      <div className="workspace-topbar-actions">
        {<div className="reference-search" onFocus={event => { if (event.target.tagName === 'INPUT' && !event.currentTarget.contains(event.relatedTarget) && query.trim()) search(query) }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false) }} onKeyDown={event => {
          if (event.key === 'Escape') { setSearchOpen(false); event.stopPropagation() }
          if (event.key === 'Enter' && event.target.tagName === 'INPUT' && !event.nativeEvent.isComposing && searchOpen && results[0]) { event.preventDefault(); navigation.navigate(results[0].href); setSearchOpen(false); setQuery('') }
          if (event.key === 'ArrowDown' && event.target.tagName === 'INPUT' && searchOpen) { event.preventDefault(); event.currentTarget.querySelector('.reference-search-results a')?.focus() }
        }}><SearchField value={query} onChange={search} label="Search navigation" placeholder="Search…" />{searchOpen && <div className="reference-search-results" aria-label={t('Search results')}><p>{t('Search results')}</p>{results.length ? results.map(item => <a key={item.href} href={item.href} onClick={() => { setSearchOpen(false); setQuery('') }}><Icon name="arrow" />{item.label}</a>) : <p role="status">{t('No matching work areas.')}</p>}</div>}</div>}
        {<button type="button" className="icon-button workspace-notifications" aria-label={t('Notifications')} title={t('Notifications')} onClick={() => setNotificationsOpen(true)}><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a2 2 0 0 1 2 2v.3a7 7 0 0 1 5 6.7v4l2 3H3l2-3v-4a7 7 0 0 1 5-6.7V4a2 2 0 0 1 2-2m-3 18h6a3 3 0 0 1-6 0" /></svg></button>}
        <button type="button" className="icon-button workspace-help" aria-label={t('Dashboard help')} title={t('Dashboard help')} onClick={() => setHelpOpen(true)}><span aria-hidden="true">?</span></button>
        {user && <div className="account-menu"><UserInfo user={user} onEdit={onEditProfile} onLogout={onLogout} signingOut={signingOut} subtitle={t(roleLabel)} /></div>}
      </div></header><main id="main" tabIndex={-1}><div className="workspace-page">{children}{logoutError && <p className="workspace-notice" role="alert">{t(logoutError)}</p>}</div><footer className="workspace-footer">{<>{brand}<span>{persona === 'programmer' ? '“ Stable System · Happy Team · Better Journeys ”' : '“ Clear Data · Better Decisions · Greater Journeys ”'}</span></>}</footer></main></div>
    {notificationsOpen && <Dialog title={t('Notifications')} onClose={() => setNotificationsOpen(false)}><div className="workspace-help-copy"><p>{t('Notifications are not connected yet.')}</p><p>{t('Review the dashboard for available work summaries and items needing attention.')}</p><a href="/dashboard" onClick={() => setNotificationsOpen(false)}>{bilingualLabel('Dashboard')}</a></div></Dialog>}
    {helpOpen && <Dialog title={t('Dashboard help')} onClose={() => setHelpOpen(false)}><div className="workspace-help-copy"><p>{t('Dashboard shows the work and summaries your account is allowed to access.')}</p><p>{t('Use the navigation to change work areas. Your profile, language and sign-out options are in the user menu.')}</p><a className="button" href="/manuals" onClick={()=>setHelpOpen(false)}>{t('User guides')}</a></div></Dialog>}
  </div>
}
