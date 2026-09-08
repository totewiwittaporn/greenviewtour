import { useRef } from 'react'
import { Icon } from './Icon.jsx'
export function SearchField({ value, onChange, onCompositionChange }) {
  const input = useRef(null)
  return <div className="search-field"><Icon name="search" /><label className="sr-only" htmlFor="user-search">Search users by email</label>
    <input ref={input} id="user-search" type="search" placeholder="Search by email…" value={value} maxLength={100} onChange={e => onChange(e.target.value)} onCompositionStart={() => onCompositionChange(true)} onCompositionEnd={() => onCompositionChange(false)} />
    {value && <button type="button" className="icon-button" aria-label="Clear search" onClick={() => { onChange(''); input.current?.focus() }}><Icon name="close" /></button>}
  </div>
}
