import {companyRoutes} from '../../../../../packages/contracts/company-routes.js'
import { WorkspaceNavigation } from './WorkspaceNavigation.jsx'
import { useNavigation } from '../navigation/Navigation.jsx'
import { useState } from 'react'
import { UserInfo } from './UserInfo.jsx'
import { Icon } from './Icon.jsx'
export function Shell({ children, user, onLogout, signingOut, canReadUsers, logoutError, onEditProfile, pageTitle }) {
  const [open, setOpen] = useState(false)
  const navigation = useNavigation()
  return <div className="workspace"><a className="skip-link" href="#main">Skip to content</a>
    <aside className={`sidebar ${open ? 'is-open' : ''}`} id="workspace-navigation">
      <a className="brand" href="/"><img src="https://greenviewtour.com/wp-content/uploads/2024/12/greenview-tour-logo-1.png" alt="Greenview Tour" /><span>COMPANY WORKSPACE</span></a>
      <div className="nav-label">WORKSPACE <span>LOCAL</span></div><WorkspaceNavigation user={user} canReadUsers={canReadUsers} pageTitle={pageTitle}/>
      <div className="sidebar-foot"><span className="mode-dot" /> Local workspace</div>
    </aside>
    <div className="workspace-body"><header className="topbar"><div className="breadcrumbs"><button type="button" className="icon-button menu-toggle" aria-label="Toggle navigation" aria-controls="workspace-navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" /></button><span>{pageTitle === 'Edit profile' ? 'Account' : navigation.location.pathname.startsWith('/company/') ? companyRoutes[navigation.location.pathname.split('/')[2]]?.section || 'Company' : navigation.location.pathname.startsWith('/operations/') ? 'Operations' : 'Settings'}</span><span>/</span><strong>{pageTitle}</strong></div>{user && <div className="account-menu"><UserInfo user={user} onEdit={onEditProfile} onLogout={onLogout} signingOut={signingOut} /></div>}</header><main id="main">{children}</main><footer className="workspace-footer">Greenview Tour <span>Made for your everyday operations.</span></footer></div>
    {logoutError && <p className="workspace-notice" role="alert">{logoutError}</p>}
  </div>
}
