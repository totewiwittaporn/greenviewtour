import {useEffect, useState} from 'react'
import {LocaleContext, useLocale, storedLocale, activateLocale, localeStorageKey, validLocale} from './locale.js'
export function LocaleProvider({children}) {
 const [locale, setLocale] = useState(storedLocale)
 activateLocale(locale)
 useEffect(() => { document.documentElement.lang = locale }, [locale])
 useEffect(() => {
  const sync = event => {
   const next = event.type === 'storage' ? event.key === localeStorageKey || event.key === null ? storedLocale() : null : event.detail
   if (validLocale(next)) setLocale(next)
  }
  window.addEventListener('storage', sync)
  window.addEventListener('greenview:locale', sync)
  return () => { window.removeEventListener('storage', sync); window.removeEventListener('greenview:locale', sync) }
 }, [])
 function changeLocale(next) {
  if (!validLocale(next)) return
  try { localStorage.setItem(localeStorageKey, next) } catch { /* Continue in memory when storage is unavailable. */ }
  setLocale(next)
  window.dispatchEvent(new CustomEvent('greenview:locale', {detail: next}))
 }
 return <LocaleContext.Provider value={{locale, changeLocale}}>{children}</LocaleContext.Provider>
}
export function LanguageOptions({onSelect}) {
 const {locale, changeLocale} = useLocale()
 return <div className="language-options" role="group" aria-label="ภาษา / Language"><p>ภาษา / Language</p>{[['th', 'TH', 'ไทย', 'Thai / ภาษาไทย'], ['en', 'EN', 'English', 'English']].map(([value, code, name, accessible]) => <button key={value} type="button" lang={value} aria-label={accessible} aria-pressed={locale === value} onClick={() => {changeLocale(value); onSelect?.()}}><strong>{code}</strong><span>{name}</span><span aria-hidden="true">{locale === value ? '✓' : ''}</span></button>)}</div>
}
