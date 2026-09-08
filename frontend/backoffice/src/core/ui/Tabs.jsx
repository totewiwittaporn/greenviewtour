import { useRef } from 'react'

// Manual keyboard activation avoids discarding a draft while exploring tab labels.
export function Tabs({ items, value, onChange, label, idPrefix }) {
  const refs = useRef(new Map())
  function move(event, index) {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
    refs.current.get(items[next].id)?.focus()
  }
  return <div className="core-tabs" role="tablist" aria-label={label}>
    {items.map((item, index) => <button key={item.id} ref={node => { if (node) refs.current.set(item.id, node); else refs.current.delete(item.id) }} id={`${idPrefix}-tab-${item.id}`} type="button" role="tab" aria-selected={value === item.id} aria-controls={`${idPrefix}-panel-${item.id}`} tabIndex={value === item.id ? 0 : -1} onKeyDown={event => move(event, index)} onClick={() => onChange(item.id)}>{item.label}</button>)}
  </div>
}
