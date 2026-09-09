import { workspaceRoute, canUseOperation } from '../navigation/workspaceRoutes.js'
import { operationGroups } from '../../features/operations/operationGroups.js'
import { settingsGroups } from '../../features/settings/shared/settingsGroups.js'
import { useNavigation } from '../navigation/Navigation.jsx'
import { useState } from 'react'
import { UserInfo } from './UserInfo.jsx'
import { Icon } from './Icon.jsx'
const planned = [['Dashboard', 'grid'], ['Sales', 'briefcase'], ['Customers', 'users'], ['Employees', 'users'], ['Fleet', 'briefcase'], ['Finance', 'briefcase'], ['Reports', 'grid']]
export function Shell({ children, user, onLogout, signingOut, canReadUsers, logoutError, onEditProfile, pageTitle }) {
  const [open, setOpen] = useState(false)
  const navigation = useNavigation()
  const route = workspaceRoute(navigation.location.pathname)
  const entity = route?.entity
  const active = (kind, group) => route?.kind === kind && group.entities.includes(entity)
  return <div className="workspace"><a className="skip-link" href="#main">Skip to content</a>
    <aside className={`sidebar ${open ? 'is-open' : ''}`} id="workspace-navigation">
      <a className="brand" href="/"><img src="https://greenviewtour.com/wp-content/uploads/2024/12/greenview-tour-logo-1.png" alt="Greenview Tour" /><span>COMPANY WORKSPACE</span></a>
      <div className="nav-label">WORKSPACE <span>LOCAL</span></div><nav aria-label="Main navigation">
        {operationGroups.filter(group => canUseOperation(user, group)).map(group => <a key={group.id} href={navigation.hrefFor(`/operations/${group.entities[0]}`)} aria-current={active('operations', group) ? 'page' : undefined} className={`nav-item ${active('operations', group) ? 'selected' : ''}`}><Icon name={group.icon} />{group.label}</a>)}
        {planned.map(([label, icon]) => <span key={label} className="nav-item planned" title="Planned for a future release" aria-disabled="true"><Icon name={icon} />{label}<span className="planned-dot" /></span>)}
        <div className="nav-item settings"><Icon name="settings" />Settings</div>
        {user?.management?.company && settingsGroups.map(group => <a key={group.id} href={navigation.hrefFor(`/settings/${group.entities[0]}`)} aria-current={active('settings', group) ? 'page' : undefined} className={`nav-item ${active('settings', group) ? 'selected' : ''}`}><Icon name="briefcase" />{group.label}</a>)}
        {canReadUsers && <a href="/settings/users" aria-current={pageTitle === 'Users' ? 'page' : undefined} className={`nav-item ${pageTitle === 'Users' ? 'selected' : ''}`}><Icon name="users" />Users<span>→</span></a>}
      </nav>
      <div className="sidebar-foot"><span className="mode-dot" /> Local workspace</div>
    </aside>
    <div className="workspace-body"><header className="topbar"><div className="breadcrumbs"><button type="button" className="icon-button menu-toggle" aria-label="Toggle navigation" aria-controls="workspace-navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" /></button><span>{pageTitle === 'Edit profile' ? 'Account' : navigation.location.pathname.startsWith('/operations/') ? 'Operations' : 'Settings'}</span><span>/</span><strong>{pageTitle}</strong></div>{user && <div className="account-menu"><UserInfo user={user} onEdit={onEditProfile} onLogout={onLogout} signingOut={signingOut} /></div>}</header><main id="main">{children}</main><footer className="workspace-footer">Greenview Tour <span>Made for your everyday operations.</span></footer></div>
    {logoutError && <p className="workspace-notice" role="alert">{logoutError}</p>}
  </div>
}
