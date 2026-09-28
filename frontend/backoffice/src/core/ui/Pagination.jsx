import {translateLabel as bilingualLabel} from '../i18n/runtime.js'
import {useLocale} from '../i18n/locale.jsx'
import { Button } from './Button.jsx'

export function Pagination({ page = 1, pageSize = 25, total, busy = false, onPageChange, label = 'Table pagination' }) {
  const {t} = useLocale()
  const known = Number.isInteger(total) && total >= 0
  const pages = known ? Math.max(1, Math.ceil(total / pageSize)) : null
  const current = known ? Math.min(Math.max(1, page), pages) : page
  const first = total === 0 ? 0 : (current - 1) * pageSize + 1
  const last = known ? Math.min(current * pageSize, total) : null
  return <div className="table-footer">
    <span aria-live="polite">{known ? t('Showing {first}–{last} of {total} records', {first,last,total}) : busy ? t('Loading records…') : t('Records unavailable')}<span className="page-size"> · {t('{count} per page',{count:pageSize})}</span></span>
    <nav className="pagination" aria-label={t(label)}>
      <Button disabled={busy || !known || current <= 1} onClick={() => onPageChange(current - 1)}>Previous</Button>
      <span aria-live="polite">{bilingualLabel('Page {page} of {pages}',{page:known?current:'—',pages:pages??'—'})}</span>
      <Button disabled={busy || !known || current >= pages} onClick={() => onPageChange(current + 1)}>Next</Button>
    </nav>
  </div>
}
