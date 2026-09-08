export function DataTable({ columns, children, busy }) {
  return <div className="table-scroll" tabIndex="0" role="region" aria-label="Users table" aria-busy={busy}><table><caption className="sr-only">User accounts from Greenview Tour Preview</caption><thead><tr>{columns.map(col => <th scope="col" key={col}>{col}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}
