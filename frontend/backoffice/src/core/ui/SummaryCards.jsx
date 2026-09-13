import { Icon } from './Icon.jsx'

export function SummaryCards({ items, label = 'Summary' }) {
  return <section className="metrics" aria-label={label}>{items.map(({label: title, value, detail, icon = 'grid'}) => <div className="metric" key={title}>
    <div className="metric-label">{title}<span className="metric-icon"><Icon name={icon} /></span></div>
    <strong>{value == null ? '—' : typeof value === 'number' ? value.toLocaleString('en-GB') : value}</strong><span>{detail}</span>
  </div>)}</section>
}
