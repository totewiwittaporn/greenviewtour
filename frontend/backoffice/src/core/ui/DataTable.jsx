export function DataTable({ columns, children, busy, label = 'Users table' }) {
  return <div className="table-scroll" tabIndex="0" role="region" aria-label={label} aria-busy={busy}><table><caption className="sr-only">{label}</caption><thead><tr>{columns.map(col => <th scope="col" key={col}>{col}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}
