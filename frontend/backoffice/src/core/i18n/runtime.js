import core from './translations.js'
import features from '../../features/translations.js'

export const key = 'greenview.locale'
export const validLocale = value => value === 'th' || value === 'en'
export function readLocale() {
  try { const value = localStorage.getItem(key); return validLocale(value) ? value : 'en' } catch { return 'en' }
}
let activeLocale = readLocale()
export function activateLocale(value) { if (validLocale(value)) activeLocale = value }
const dictionary = {...features, ...core}
const normalized = new Map(Object.entries(dictionary).map(([source, value]) => [source.toLocaleLowerCase('en'), value]))
function translated(source) { return dictionary[source] ?? normalized.get(source.toLocaleLowerCase('en')) }
// These patterns describe system-owned validation/help messages; callers must never
// pass customer names, stored notes, identifiers or business content for translation.
function thaiMessage(source) {
  const direct = translated(source)
  if (direct !== undefined) return direct
  const enter = source.match(/^Enter (.+?)(\.)?$/)
  if (enter && /[\u0e00-\u0e7f]/.test(enter[1])) return `กรอก${enter[1]}${enter[2] || ''}`
  if (enter && translated(enter[1])) return `กรอก${translated(enter[1])}${enter[2] || ''}`
  const range = source.match(/^Enter a whole number from (\d+) to (\d+)\.$/)
  if (range) return `กรอกจำนวนเต็มตั้งแต่ ${range[1]} ถึง ${range[2]}`
  const chars = source.match(/^Enter (1–|up to )(\d+) characters\.$/)
  if (chars) return chars[1] === '1–' ? `กรอก 1–${chars[2]} ตัวอักษร` : `กรอกไม่เกิน ${chars[2]} ตัวอักษร`
  return source
}
export function translate(source, params = {}, locale = activeLocale) {
  if (typeof source !== 'string') return source
  const message = locale === 'th' ? thaiMessage(source) : source
  return message.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(params, name) ? String(params[name]) : match)
}
// Semantic UI labels retain the English term in Thai mode. Body copy stays localized.
export function translateLabel(source, params = {}, locale = activeLocale) {
  const english = translate(source, params, 'en')
  const thai = translate(source, params, 'th')
  return locale === 'th' && typeof source === 'string' && thai !== english ? `${thai} / ${english}` : english
}
export function formatDate(date, options = {}, locale = activeLocale) {
  if (!date) return '—'
  const dateOnly = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
  const value = new Date(dateOnly ? `${date}T00:00:00Z` : date)
  return Number.isNaN(value.getTime()) ? '—' : new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', {calendar:'gregory', timeZone:dateOnly?'UTC':'Asia/Bangkok', ...options}).format(value)
}
export function formatNumber(number, options = {}, locale = activeLocale) {
  return new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-GB', options).format(number)
}
