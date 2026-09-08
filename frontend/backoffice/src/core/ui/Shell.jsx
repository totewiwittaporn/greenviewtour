import { useState } from 'react'
import { Icon } from './Icon.jsx'
const planned = [['Dashboard', 'grid'], ['Bookings', 'calendar'], ['Sales', 'briefcase'], ['Tour Operations', 'globe'], ['Customers', 'users'], ['Services', 'briefcase'], ['Employees', 'users'], ['Assets & Equipment', 'briefcase'], ['Fleet', 'briefcase'], ['Finance', 'briefcase'], ['Reports', 'grid']]
export function Shell({ children }) {
  const [open, setOpen] = useState(false)
  return <div className="workspace"><a className="skip-link" href="#main">Skip to content</a>
    <aside className={`sidebar ${open ? 'is-open' : ''}`} id="workspace-navigation">
      <a className="brand" href="/settings/users"><img src="https://greenviewtour.com/wp-content/uploads/2024/12/greenview-tour-logo-1.png" alt="Greenview Tour" /><span>COMPANY WORKSPACE</span></a>
      <div className="nav-label">WORKSPACE <span>LOCAL</span></div><nav aria-label="Main navigation">
        {planned.map(([label, icon]) => <span key={label} className="nav-item planned" title="Planned for a future release" aria-disabled="true"><Icon name={icon} />{label}<span className="planned-dot" /></span>)}
        <div className="nav-item settings"><Icon name="settings" />Settings</div>
        <a href="/settings/users" aria-current="page" className="nav-item selected"><Icon name="users" />Users<span>→</span></a>
      </nav>
      <div className="sidebar-foot"><span className="mode-dot" /> Local preview <span>Read only</span></div>
    </aside>
    <div className="workspace-body"><header className="topbar"><div className="breadcrumbs"><button type="button" className="icon-button menu-toggle" aria-label="Toggle navigation" aria-controls="workspace-navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" /></button><span>Settings</span><span>/</span><strong>Users</strong></div><a href="http://localhost:5173" target="_blank" rel="noreferrer" className="website-link"><Icon name="globe" />Public website <span>↗</span></a></header><main id="main">{children}</main><footer className="workspace-footer">Greenview Tour <span>Made for your everyday operations.</span></footer></div>
  </div>
}
