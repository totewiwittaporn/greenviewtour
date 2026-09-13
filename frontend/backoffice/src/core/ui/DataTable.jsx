import { Button } from './Button.jsx'
import { Icon } from './Icon.jsx'

export function DataTable({ columns, children, busy, label = 'Data table', error, onRetry, isEmpty = false, empty, loadingLabel = 'Loading records…', layout = 'dataset' }) {
  const state = busy ? <div className="empty-state" role="status"><span className="spinner" />{loadingLabel}</div>
    : error ? <div className="empty-state" role="alert"><Icon name="globe" /><h3>Records are temporarily unavailable</h3><p>{error}</p>{onRetry && <Button onClick={onRetry}>Retry</Button>}</div>
    : isEmpty ? <div className="empty-state"><span className="empty-icon"><Icon name="users" width="30" height="30" /></span>{empty || <><h3>No records yet</h3><p>Add a record to get started.</p></>}</div> : null
  return <div className="table-scroll" data-layout={layout} tabIndex="0" role="region" aria-label={label} aria-busy={busy}><table><caption className="sr-only">{label}</caption><thead><tr>{columns.map(col => <th scope="col" key={col}>{col}</th>)}</tr></thead><tbody>{state ? <tr><td colSpan={columns.length}>{state}</td></tr> : children}</tbody></table></div>
}
