import {translateLabel as bilingualLabel} from '../i18n/runtime.js'
import {useLocale} from '../i18n/locale.jsx'
import {companyRoutes} from '../../../../../packages/contracts/company-routes.js'
import { WorkspaceNavigation } from './WorkspaceNavigation.jsx'
import { useNavigation } from '../navigation/Navigation.jsx'
import { useState } from 'react'
import { UserInfo } from './UserInfo.jsx'
import { Icon } from './Icon.jsx'
import { Dialog } from './Dialog.jsx'
import './Shell.css'
export function Shell({ children, user, onLogout, signingOut, canReadUsers, logoutError, onEditProfile, pageTitle }) {
  const {t} = useLocale()
  const [open, setOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const navigation = useNavigation()
  return <div className="workspace workspace-refined"><a className="skip-link" href="#main">{t("Skip to content")}</a>
    <aside className={`sidebar ${open ? 'is-open' : ''}`} id="workspace-navigation" onClick={event => { if (event.target.closest('a[href]')) setOpen(false) }} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); document.querySelector('.menu-toggle')?.focus() } }}>
      <a className="brand" href="/"><img src="/images/brand/greenview-logo.png" alt="Greenview Tour" /><span>BACKOFFICE</span></a>
      <div className="nav-label">{t("WORKSPACE")} <span>{t("LOCAL")}</span></div><WorkspaceNavigation user={user} canReadUsers={canReadUsers} pageTitle={pageTitle}/>
      <div className="sidebar-foot"><span className="mode-dot" /> {t("Local workspace")}</div>
    </aside>
    <div className="workspace-body"><header className="topbar"><div className="breadcrumbs"><button type="button" className="icon-button menu-toggle" aria-label={t("Toggle navigation")} aria-controls="workspace-navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" /></button><Icon name="grid"/><span>{bilingualLabel(pageTitle === 'Dashboard' ? 'Workspace' : pageTitle === 'Edit profile' ? 'Account' : navigation.location.pathname.startsWith('/company/') ? companyRoutes[navigation.location.pathname.split('/')[2]]?.section || 'Company' : navigation.location.pathname.startsWith('/operations/') ? 'Operations' : 'Settings')}</span><span>/</span><strong>{bilingualLabel(pageTitle)}</strong></div><div className="workspace-topbar-actions"><button type="button" className="icon-button workspace-help" aria-label={t("Dashboard help")} title={t("Dashboard help")} onClick={()=>setHelpOpen(true)}><span aria-hidden="true">?</span></button>{user && <div className="account-menu"><UserInfo user={user} onEdit={onEditProfile} onLogout={onLogout} signingOut={signingOut} /></div>}</div></header><main id="main">{children}</main><footer className="workspace-footer">Greenview Tour <span>{t("Made for your everyday operations.")}</span></footer></div>
    {helpOpen && <Dialog title={t('Dashboard help')} onClose={()=>setHelpOpen(false)}><div className="workspace-help-copy"><p>{t('Dashboard shows the work and summaries your account is allowed to access.')}</p><p>{t('Select a calendar date to review customer totals, or open a work area to continue there.')}</p><p>{t('Use the navigation to change work areas. Your profile, language and sign-out options are in the user menu.')}</p></div></Dialog>}
    {logoutError && <p className="workspace-notice" role="alert">{t(logoutError)}</p>}
  </div>
}
