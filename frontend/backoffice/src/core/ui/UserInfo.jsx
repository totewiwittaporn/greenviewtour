import { Dialog } from './Dialog.jsx'
import { Button } from './Button.jsx'
import { Icon } from './Icon.jsx'
export function UserInfo({ user, onClose, onLogout, signingOut, error }) {
  return <Dialog title="User info" onClose={onClose} busy={signingOut}>
    <div className="profile-identity"><span className="profile-avatar">{user.displayName.slice(0,1).toUpperCase()}</span><div><h3>{user.displayName}</h3><p>{user.email}</p></div></div>
    <dl className="profile-details"><dt>Status</dt><dd>{user.status}</dd><dt>Department</dt><dd>{user.department || 'Not assigned'}</dd><dt>Roles</dt><dd>{user.roles.map(role => <span className="badge verified" key={`${role.code}-${role.scope}`}>{role.name} · {role.scope}</span>)}</dd></dl>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <div className="profile-links"><a href="http://localhost:5173" target="_blank" rel="noreferrer"><Icon name="globe" />Open public website ↗</a><Button onClick={onLogout} busy={signingOut} disabled={signingOut}>Sign out</Button></div>
  </Dialog>
}
