import {translateLabel as bilingualLabel} from '../i18n/runtime.js'
import {useLocale} from '../i18n/locale.jsx'
import { fieldGuidance } from './fieldGuidance.js'
import { useId } from 'react'
export function TextAreaField({ label, error, hint, placeholder, ...props }) {
  const {t} = useLocale()
  const id = useId()
  return <div className="form-field"><label htmlFor={id}>{bilingualLabel(label)}</label><textarea placeholder={t(placeholder ?? fieldGuidance(label))} id={id} className="core-textarea resize-none" aria-invalid={Boolean(error)} aria-describedby={`${id}-help`} rows={4} {...props} /><span id={`${id}-help`} className={`field-help ${error ? 'field-error' : ''}`}>{t(error || hint) || '\u00a0'}</span></div>
}
