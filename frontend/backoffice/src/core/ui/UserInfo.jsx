import {useLocale} from '../i18n/locale.jsx'
import { Dropdown } from './Dropdown.jsx'
export function UserInfo({ user, onEdit, onLogout, signingOut }) {
  const {t, locale, setLocale} = useLocale()
  return <Dropdown label="User menu" disabled={signingOut} heading={<><strong>{user.displayName}</strong><span>{user.email}</span></>} items={[
    { label: 'Open website', icon: 'globe', href: 'http://localhost:5173', target: '_blank' },
    { label: 'Edit profile', icon: 'edit', onSelect: onEdit },
    { section: 'ภาษา / Language' },
    { label: 'TH ไทย', literal: true, lang: 'th', checked: locale === 'th', onSelect: () => setLocale('th') },
    { label: 'EN English', literal: true, lang: 'en', checked: locale === 'en', onSelect: () => setLocale('en') },
    { label: 'Sign out', icon: 'logout', onSelect: onLogout, danger: true },
  ]}><span className="avatar">{user.displayName.slice(0,1).toUpperCase()}</span><span className="account-name">{signingOut ? t('Signing out…') : user.displayName}</span><span aria-hidden="true">⌄</span></Dropdown>
}
