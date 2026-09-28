import { useEffect, useId, useState } from 'react'
import { localizedLabel } from './locale.js'
import { useDisclosure } from './useDisclosure.js'
import { LocaleContext, useLocale } from './useLocale.js'
const normalize = value => value === 'en' ? 'en' : 'th'
export function LocaleProvider({children}) {
  const [locale, update] = useState(() => { try { return normalize(localStorage.getItem('greenview.locale')) } catch { return 'th' } })
  useEffect(() => {
    const storage = event => { if (event.key === 'greenview.locale' || event.key === null) update(normalize(event.newValue)) }
    const change = event => update(normalize(event.detail))
    window.addEventListener('storage', storage)
    window.addEventListener('greenview:locale', change)
    return () => { window.removeEventListener('storage', storage); window.removeEventListener('greenview:locale', change) }
  }, [])
  useEffect(() => { document.documentElement.lang = locale }, [locale])
  function setLocale(value) {
    const next = normalize(value)
    update(next)
    try { localStorage.setItem('greenview.locale', next) } catch { /* Session preference still works when storage is unavailable. */ }
    window.dispatchEvent(new CustomEvent('greenview:locale', {detail: next}))
  }
  const language = locale === 'th' ? 'th-TH' : 'en-GB'
  const t = value => localizedLabel(locale, value)
  const label = t
  const number = value => new Intl.NumberFormat(language).format(value)
  const money = value => value == null ? t('สอบถามราคา') : new Intl.NumberFormat(language, {style:'currency',currency:'THB'}).format(Number(value))
  const date = value => { if (!value) return '—'; const parsed = new Date(String(value).slice(0,10)+'T12:00:00+07:00'); return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat(language, {day:'numeric',month:'short',year:'numeric',calendar:'gregory',timeZone:'Asia/Bangkok'}).format(parsed) }
  return <LocaleContext.Provider value={{locale,setLocale,t,label,number,money,date}}>{children}</LocaleContext.Provider>
}
export function LanguageSelector() {
  const {locale,setLocale} = useLocale()
  const {open,setOpen,container,trigger} = useDisclosure()
  const id = useId()
  return <div className="language-selector" ref={container}>
    <button ref={trigger} type="button" aria-label={locale === 'th' ? 'ภาษา' : 'Language'} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{locale.toUpperCase()} <span aria-hidden="true">⌄</span></button>
    {open && <div className="language-options" id={id} role="group" aria-label="TH / EN">
      {[['th','TH','ไทย'],['en','EN','English']].map(([value,code,name]) => <button key={value} type="button" lang={value} aria-pressed={locale===value} onClick={() => { setLocale(value); setOpen(false); trigger.current?.focus() }}><strong>{code}</strong> {name}<span aria-hidden="true">{locale===value ? '✓' : ''}</span></button>)}
    </div>}
  </div>
}
