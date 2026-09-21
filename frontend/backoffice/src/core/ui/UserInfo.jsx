import {useLocale} from '../i18n/locale.jsx'
import {translateLabel} from '../i18n/runtime.js'
import {formatAddress, safeMapUrl} from '../../../../../packages/contracts/address.js'
import {Dropdown} from './Dropdown.jsx'
export function UserInfo({user, onEdit, onLogout, signingOut}) {
  const {t, locale, setLocale} = useLocale()
  const identity = user.nickname?.trim() || user.displayName
  const map = safeMapUrl(user.mapUrl)
  const details = [
    ['Display name', user.displayName],
    ['Nickname', user.nickname],
    ['Primary phone', user.primaryPhone],
    ['Emergency phone', user.emergencyPhone],
    ['Line ID', user.lineId],
    ['Address', formatAddress(user)],
  ]
  return <Dropdown label="User menu" variant="user-info" disabled={signingOut} heading={<>
    <strong>{identity}</strong>
    <dl className="user-info-details">{details.map(([label, value]) => <div key={label}><dt>{translateLabel(label)}</dt><dd>{value || '—'}</dd></div>)}</dl>
  </>} items={[
    ...(map ? [{label:'Map location', icon:'globe', href:map, target:'_blank'}] : []),
    {label:'Edit profile', icon:'edit', onSelect:onEdit},
    {label:'Open website', icon:'globe', href:'http://localhost:5173', target:'_blank'},
    {section:locale === 'th' ? 'ภาษา / Language' : 'Language'},
    {label:'TH ไทย', literal:true, lang:'th', checked:locale === 'th', onSelect:() => setLocale('th')},
    {label:'EN English', literal:true, lang:'en', checked:locale === 'en', onSelect:() => setLocale('en')},
    {label:'Sign out', icon:'logout', onSelect:onLogout, danger:true},
  ]}><span className="avatar">{Array.from(identity)[0]?.toUpperCase()}</span><span className="account-name">{signingOut ? t('Signing out…') : identity}</span><span aria-hidden="true">⌄</span></Dropdown>
}
