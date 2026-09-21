import {translateLabel as bilingualLabel} from '../i18n/runtime.js'
import {useLocale} from '../i18n/locale.jsx'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button.jsx'
import { Icon } from './Icon.jsx'
// Shared action menu: escape content overflow while remaining in the owning modal layer.
export function Dropdown({ label, children, items, heading, disabled = false, rowActions = false, variant }) {
  const {t} = useLocale()
  const [host, setHost] = useState(null)
  const [keyboard, setKeyboard] = useState(false)
  const [open, setOpen] = useState(false), [position, setPosition] = useState({ top: 0, left: 0 })
  const trigger = useRef(null), popup = useRef(null), initial = useRef(0), id = useId()
  const mount = useCallback(node => { trigger.current = node; if (node) setHost(node.closest('dialog') || document.body) }, [])
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
    const options = popup.current.querySelectorAll('[role^="menuitem"]:not(:disabled)')
    const first = options[initial.current < 0 ? options.length - 1 : 0]
    first?.focus({ preventScroll: true })
    if (popup.current.dataset.keyboard) first?.scrollIntoView({block:'nearest', inline:'nearest'})
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
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return }
    if (event.key === 'Tab') { close(true); return }
    const options = [...popup.current.querySelectorAll('[role^="menuitem"]:not(:disabled)')]
    const index = options.indexOf(document.activeElement)
    const next = event.key === 'ArrowDown' ? (index + 1) % options.length : event.key === 'ArrowUp' ? (index - 1 + options.length) % options.length : event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : -1
    if (next >= 0) { event.preventDefault(); options[next]?.focus({ preventScroll: true }); options[next]?.scrollIntoView({block:'nearest', inline:'nearest'}) }
  }
  return <><span ref={mount} className="dropdown-anchor" tabIndex={-1}><Button className={rowActions?'button-row-actions':''} aria-label={t(label)} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} disabled={disabled} onClick={event => { setKeyboard(event.detail === 0); initial.current = 0; setOpen(!open) }} onKeyDown={event => {
    if (['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); setKeyboard(true); initial.current = event.key === 'ArrowUp' ? -1 : 0; setOpen(true) }
  }}>{rowActions?<Icon name="more"/>:children}</Button></span>{open && createPortal(<div id={id} ref={popup} role="menu" aria-label={t(label)} className="core-dropdown" data-variant={variant} data-keyboard={keyboard || undefined} style={position} onKeyDown={keydown} onPointerMove={() => setKeyboard(false)}>
    {heading && <div className="dropdown-heading" role="presentation">{heading}</div>}
    {items.map(item => item.section ? <div key={item.section} className="dropdown-section" role="presentation">{item.section}</div> : item.href ? <a key={item.label} role="menuitem" tabIndex={-1} href={item.href} target={item.target} rel={item.target ? 'noreferrer' : undefined} onClick={() => close(true)}>{item.icon && <Icon name={item.icon} className="menu-icon" />}<span>{bilingualLabel(item.label)}</span></a> : <button key={item.label} type="button" role={item.checked === undefined ? "menuitem" : "menuitemradio"} aria-checked={item.checked} lang={item.lang} tabIndex={-1} className={[item.danger ? 'menu-danger' : '', item.checked ? 'menu-selected' : ''].filter(Boolean).join(' ')} disabled={item.disabled} onClick={() => { close(true); item.onSelect() }}>{item.icon && <Icon name={item.icon} className="menu-icon" />}<span>{item.literal ? item.label : bilingualLabel(item.label)}</span>{item.checked && <span className="menu-check" aria-hidden="true">✓</span>}</button>)}
  </div>, host || document.body)}</>
}
