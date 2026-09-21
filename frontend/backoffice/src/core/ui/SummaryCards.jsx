import {translateLabel as bilingualLabel} from '../i18n/runtime.js'
import {useLocale} from '../i18n/locale.jsx'
import { Icon } from './Icon.jsx'

export function SummaryCards({ items, label = 'Summary' }) {
  const {t, formatNumber} = useLocale()
  return <section className="metrics" aria-label={t(label)}>{items.map(({label: title, value, detail, icon = 'grid'}) => <div className="metric" key={title}>
    <div className="metric-label">{bilingualLabel(title)}<span className="metric-icon"><Icon name={icon} /></span></div>
    <strong>{value == null ? '—' : typeof value === 'number' ? formatNumber(value) : value}</strong><span>{t(detail)}</span>
  </div>)}</section>
}
