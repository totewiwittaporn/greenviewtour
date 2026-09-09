import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button.jsx'
import { Icon } from './Icon.jsx'
// Shared action menu: anchored outside overflow containers, with keyboard navigation.
export function Dropdown({ label, children, items, heading, disabled = false }) {
  const [keyboard, setKeyboard] = useState(false)
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
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    const options = popup.current.querySelectorAll('[role="menuitem"]:not(:disabled)')
    options[initial.current < 0 ? options.length - 1 : 0]?.focus({ preventScroll: true })
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open])
  useEffect(() => {
    if (!open) return
    const outside = event => { if (!popup.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside) }
  }, [open])
  function keydown(event) {
    setKeyboard(true)
    if (event.key === 'Escape') { event.preventDefault(); close(true); return }
    if (event.key === 'Tab') { close(true); return }
    const options = [...popup.current.querySelectorAll('[role="menuitem"]:not(:disabled)')]
    const index = options.indexOf(document.activeElement)
    const next = event.key === 'ArrowDown' ? (index + 1) % options.length : event.key === 'ArrowUp' ? (index - 1 + options.length) % options.length : event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : -1
    if (next >= 0) { event.preventDefault(); options[next]?.focus({ preventScroll: true }) }
  }
  return <><span ref={trigger} className="dropdown-anchor" tabIndex={-1}><Button aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} disabled={disabled} onClick={event => { setKeyboard(event.detail === 0); initial.current = 0; setOpen(!open) }} onKeyDown={event => {
    if (['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); setKeyboard(true); initial.current = event.key === 'ArrowUp' ? -1 : 0; setOpen(true) }
  }}>{children}</Button></span>{open && createPortal(<div id={id} ref={popup} role="menu" aria-label={label} className="core-dropdown" data-keyboard={keyboard || undefined} style={position} onKeyDown={keydown} onPointerMove={() => setKeyboard(false)}>
    {heading && <div className="dropdown-heading" role="presentation">{heading}</div>}
    {items.map(item => item.href ? <a key={item.label} role="menuitem" tabIndex={-1} href={item.href} target={item.target} rel={item.target ? 'noreferrer' : undefined} onClick={() => close(true)}>{item.icon && <Icon name={item.icon} className="menu-icon" />}<span>{item.label}</span></a> : <button key={item.label} type="button" role="menuitem" tabIndex={-1} className={item.danger ? 'menu-danger' : ''} disabled={item.disabled} onClick={() => { close(true); item.onSelect() }}>{item.icon && <Icon name={item.icon} className="menu-icon" />}<span>{item.label}</span></button>)}
  </div>, document.body)}</>
}
