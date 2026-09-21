import {useLocale} from '../i18n/locale.jsx'
import { Dropdown } from './Dropdown.jsx'
export function UserInfo({ user, onEdit, onLogout, signingOut }) {
  const {t} = useLocale()
  return <Dropdown label="User menu" disabled={signingOut} heading={<><strong>{user.displayName}</strong><span>{user.email}</span></>} items={[
    { label: 'Open website', icon: 'globe', href: 'http://localhost:5173', target: '_blank' },
    { label: 'Edit profile', icon: 'edit', onSelect: onEdit },
    { label: 'Sign out', icon: 'logout', onSelect: onLogout, danger: true },
  ]}><span className="avatar">{user.displayName.slice(0,1).toUpperCase()}</span><span className="account-name">{signingOut ? t('Signing out…') : user.displayName}</span><span aria-hidden="true">⌄</span></Dropdown>
}
