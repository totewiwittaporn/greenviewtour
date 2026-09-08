// Core owns active/inactive accessibility, content motion and optional space reservation.
export function TabPanel({ active, id, labelledBy, preserveLayout = false, className = '', children, ...props }) {
  return <section {...props} id={id} role={labelledBy ? 'tabpanel' : undefined} aria-labelledby={labelledBy} aria-hidden={!active} inert={!active} hidden={!active && !preserveLayout} data-active={active} className={`core-tab-panel ${className}`}>
    {children}
  </section>
}
