/* eslint-disable react-refresh/only-export-components */
import {createContext, useContext, useEffect, useMemo, useState} from 'react'
import {key, validLocale, readLocale, activateLocale, translate, formatDate, formatNumber} from './runtime.js'
export {translate} from './runtime.js'

const LocaleContext = createContext(null)
export function LocaleProvider({children}) {
  const [locale, setLocale] = useState(readLocale)
  useEffect(() => {
    const changed = event => { const value = event.type === 'storage' ? event.newValue : event.detail; if ((event.type !== 'storage' || event.key === key) && validLocale(value)) { activateLocale(value); setLocale(value) } }
    window.addEventListener('storage', changed)
    window.addEventListener('greenview:locale', changed)
    return () => { window.removeEventListener('storage', changed); window.removeEventListener('greenview:locale', changed) }
  }, [])
  useEffect(() => { document.documentElement.lang = locale }, [locale])
  const value = useMemo(() => ({
    locale,
    setLocale(next) {
      if (!validLocale(next)) return
      try { localStorage.setItem(key, next) } catch { /* The current tab still supports a language preference when storage is unavailable. */ }
      activateLocale(next)
      setLocale(next)
      window.dispatchEvent(new CustomEvent('greenview:locale', {detail: next}))
    },
    t: (source, params) => translate(source, params, locale),
    formatDate: (date, options) => formatDate(date, options, locale),
    formatNumber: (number, options) => formatNumber(number, options, locale),
  }), [locale])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('LocaleProvider is required')
  return value
}
