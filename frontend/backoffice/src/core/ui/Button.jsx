export function Button({ children, busy = false, className = '', onClick, ...props }) {
  return <button type="button" className={`button ${className}`} aria-busy={busy} onClick={onClick} {...props}>{children}</button>
}
