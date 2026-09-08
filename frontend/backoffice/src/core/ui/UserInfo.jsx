import { Dropdown } from './Dropdown.jsx'
export function UserInfo({ user, onEdit, onLogout, signingOut }) {
  return <Dropdown label="User menu" disabled={signingOut} heading={<><strong>{user.displayName}</strong><span>{user.email}</span></>} items={[
    { label: 'Open website', href: 'http://localhost:5173', target: '_blank' },
    { label: 'Edit profile', onSelect: onEdit },
    { label: 'Sign out', onSelect: onLogout, danger: true },
  ]}><span className="avatar">{user.displayName.slice(0,1).toUpperCase()}</span><span className="account-name">{signingOut ? 'Signing out…' : user.displayName}</span><span aria-hidden="true">⌄</span></Dropdown>
}
