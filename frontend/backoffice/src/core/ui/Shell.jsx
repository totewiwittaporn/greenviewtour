import { settingsGroups } from '../../features/settings/shared/settingsGroups.js'
import { useNavigation } from '../navigation/Navigation.jsx'
import { useState } from 'react'
import { UserInfo } from './UserInfo.jsx'
import { Icon } from './Icon.jsx'
const planned = [['Dashboard', 'grid'], ['Bookings', 'calendar'], ['Sales', 'briefcase'], ['Tour Operations', 'globe'], ['Customers', 'users'], ['Services', 'briefcase'], ['Employees', 'users'], ['Assets & Equipment', 'briefcase'], ['Fleet', 'briefcase'], ['Finance', 'briefcase'], ['Reports', 'grid']]
export function Shell({ children, user, onLogout, signingOut, canReadUsers, logoutError, onEditProfile, pageTitle }) {
  const [open, setOpen] = useState(false)
  const navigation = useNavigation()
  const entity = navigation.location.pathname.split('/').at(-1)
  return <div className="workspace"><a className="skip-link" href="#main">Skip to content</a>
    <aside className={`sidebar ${open ? 'is-open' : ''}`} id="workspace-navigation">
      <a className="brand" href="/"><img src="https://greenviewtour.com/wp-content/uploads/2024/12/greenview-tour-logo-1.png" alt="Greenview Tour" /><span>COMPANY WORKSPACE</span></a>
      <div className="nav-label">WORKSPACE <span>LOCAL</span></div><nav aria-label="Main navigation">
        {planned.map(([label, icon]) => <span key={label} className="nav-item planned" title="Planned for a future release" aria-disabled="true"><Icon name={icon} />{label}<span className="planned-dot" /></span>)}
        <div className="nav-item settings"><Icon name="settings" />Settings</div>
        {user?.management?.company && settingsGroups.map(group => <a key={group.id} href={navigation.hrefFor(`/settings/${group.entities[0]}`)} aria-current={group.entities.includes(entity) ? 'page' : undefined} className={`nav-item ${group.entities.includes(entity) ? 'selected' : ''}`}><Icon name="briefcase" />{group.label}</a>)}
        {canReadUsers && <a href="/settings/users" aria-current={pageTitle === 'Users' ? 'page' : undefined} className={`nav-item ${pageTitle === 'Users' ? 'selected' : ''}`}><Icon name="users" />Users<span>→</span></a>}
      </nav>
      <div className="sidebar-foot"><span className="mode-dot" /> Local workspace</div>
    </aside>
    <div className="workspace-body"><header className="topbar"><div className="breadcrumbs"><button type="button" className="icon-button menu-toggle" aria-label="Toggle navigation" aria-controls="workspace-navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" /></button><span>{pageTitle === 'Edit profile' ? 'Account' : 'Settings'}</span><span>/</span><strong>{pageTitle}</strong></div>{user && <div className="account-menu"><UserInfo user={user} onEdit={onEditProfile} onLogout={onLogout} signingOut={signingOut} /></div>}</header><main id="main">{children}</main><footer className="workspace-footer">Greenview Tour <span>Made for your everyday operations.</span></footer></div>
    {logoutError && <p className="workspace-notice" role="alert">{logoutError}</p>}
  </div>
}
