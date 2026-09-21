import {createContext, useContext} from 'react'
import {messages} from './messages.js'

export const localeStorageKey = 'greenview.locale'
export const validLocale = value => value === 'en' || value === 'th'
export function storedLocale() {
 try { const value = localStorage.getItem(localeStorageKey); return validLocale(value) ? value : 'th' } catch { return 'th' }
}
let activeLocale = storedLocale()
const englishSources = new Map(Object.entries(messages).map(([thai, english]) => [english, thai]))
export function t(value, locale = activeLocale) {
 if (typeof value !== 'string') return value
 const source = englishSources.get(value) || value
 return locale === 'en' ? messages[source] ?? value : source
}
export const formatNumber = value => new Intl.NumberFormat(activeLocale === 'th' ? 'th-TH' : 'en-GB').format(Number(value))
export const formatMoney = value => value == null ? t('ติดต่อสอบถาม') : new Intl.NumberFormat(activeLocale === 'th' ? 'th-TH' : 'en-GB', {style: 'currency', currency: 'THB'}).format(Number(value))
export function formatDate(value, withTime = false) {
 if (!value) return '—'
 const date = new Date(withTime ? value : String(value).slice(0, 10) + 'T00:00:00Z')
 if (Number.isNaN(+date)) return '—'
 return new Intl.DateTimeFormat(activeLocale === 'th' ? 'th-TH' : 'en-GB', {calendar: 'gregory', day: 'numeric', month: 'short', year: 'numeric', timeZone: withTime ? 'Asia/Bangkok' : 'UTC', ...(withTime ? {hour: '2-digit', minute: '2-digit'} : {})}).format(date)
}
export const LocaleContext = createContext(null)

export const useLocale = () => useContext(LocaleContext)
export function activateLocale(locale) { activeLocale = locale }

export function bookingStatus(status) {
 const labels = {DRAFT:['ฉบับร่าง','Draft'],CONFIRMED:['ยืนยันแล้ว','Confirmed'],COMPLETED:['เสร็จสิ้น','Completed'],CANCELLED:['ยกเลิกแล้ว','Cancelled']}
 return labels[status]?.[activeLocale === 'th' ? 0 : 1] || status
}
