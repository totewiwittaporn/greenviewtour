import {translateLabel as bilingualLabel} from '../i18n/runtime.js'
import {useLocale} from '../i18n/locale.jsx'
import { useId, useRef } from 'react'
import { Icon } from './Icon.jsx'
export function SearchField({ value, onChange, onCompositionChange = () => {}, label = 'Search', placeholder = 'Search…' }) {
  const {t} = useLocale()
  const input = useRef(null), id = useId()
  return <div className="search-field"><Icon name="search" /><label className="sr-only" htmlFor={id}>{bilingualLabel(label)}</label>
    <input ref={input} id={id} type="search" placeholder={t(placeholder)} value={value} maxLength={100} onChange={e => onChange(e.target.value)} onCompositionStart={() => onCompositionChange(true)} onCompositionEnd={() => onCompositionChange(false)} />
    {value && <button type="button" className="icon-button" aria-label={t("Clear search")} onClick={() => { onChange(''); input.current?.focus() }}><Icon name="close" /></button>}
  </div>
}
