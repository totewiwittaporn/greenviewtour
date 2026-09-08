import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button.jsx'
// Shared action menu: anchored outside overflow containers, with keyboard navigation.
export function Dropdown({ label, children, items, heading, disabled = false }) {
  const [open, setOpen] = useState(false), [position, setPosition] = useState({ top: 0, left: 0 })
  const trigger = useRef(null), popup = useRef(null), initial = useRef(0), id = useId()
  function close(restore = false) { setOpen(false); if (restore) trigger.current?.querySelector('button')?.focus() }
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const rect = trigger.current.getBoundingClientRect(), menu = popup.current.getBoundingClientRect()
      setPosition({ left: Math.max(8, Math.min(rect.right - menu.width, window.innerWidth - menu.width - 8)), top: Math.max(8, rect.bottom + menu.height + 6 <= window.innerHeight ? rect.bottom + 6 : rect.top - menu.height - 6) })
    }
    place()
    const options = popup.current.querySelectorAll('[role="menuitem"]:not(:disabled)')
    options[initial.current < 0 ? options.length - 1 : 0]?.focus()
  }, [open])
  useEffect(() => {
    if (!open) return
    const outside = event => { if (!popup.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false) }
    const movement = event => { if (!popup.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    window.addEventListener('resize', movement)
    window.addEventListener('scroll', movement, true)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); window.removeEventListener('resize', movement); window.removeEventListener('scroll', movement, true) }
  }, [open])
  function keydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(true); return }
    if (event.key === 'Tab') { close(true); return }
    const options = [...popup.current.querySelectorAll('[role="menuitem"]:not(:disabled)')]
    const index = options.indexOf(document.activeElement)
    const next = event.key === 'ArrowDown' ? (index + 1) % options.length : event.key === 'ArrowUp' ? (index - 1 + options.length) % options.length : event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : -1
    if (next >= 0) { event.preventDefault(); options[next]?.focus() }
  }
  return <><span ref={trigger} className="dropdown-anchor" tabIndex={-1}><Button aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} disabled={disabled} onClick={() => { initial.current = 0; setOpen(!open) }} onKeyDown={event => {
    if (['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); initial.current = event.key === 'ArrowUp' ? -1 : 0; setOpen(true) }
  }}>{children}</Button></span>{open && createPortal(<div id={id} ref={popup} role="menu" aria-label={label} className="core-dropdown" style={position} onKeyDown={keydown}>
    {heading && <div className="dropdown-heading" role="presentation">{heading}</div>}
    {items.map(item => item.href ? <a key={item.label} role="menuitem" tabIndex={-1} href={item.href} target={item.target} rel={item.target ? 'noreferrer' : undefined} onClick={() => close(true)}>{item.label}</a> : <button key={item.label} type="button" role="menuitem" tabIndex={-1} className={item.danger ? 'menu-danger' : ''} disabled={item.disabled} onClick={() => { close(true); item.onSelect() }}>{item.label}</button>)}
  </div>, document.body)}</>
}
