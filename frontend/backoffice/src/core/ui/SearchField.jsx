import { useId, useRef } from 'react'
import { Icon } from './Icon.jsx'
export function SearchField({ value, onChange, onCompositionChange = () => {}, label = 'Search', placeholder = 'Search…' }) {
  const input = useRef(null), id = useId()
  return <div className="search-field"><Icon name="search" /><label className="sr-only" htmlFor={id}>{label}</label>
    <input ref={input} id={id} type="search" placeholder={placeholder} value={value} maxLength={100} onChange={e => onChange(e.target.value)} onCompositionStart={() => onCompositionChange(true)} onCompositionEnd={() => onCompositionChange(false)} />
    {value && <button type="button" className="icon-button" aria-label="Clear search" onClick={() => { onChange(''); input.current?.focus() }}><Icon name="close" /></button>}
  </div>
}
