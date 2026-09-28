import {translateLabel as bilingualLabel} from '../i18n/runtime.js'
import {useLocale} from '../i18n/locale.jsx'
import { fieldGuidance } from './fieldGuidance.js'
import { useId, useState } from 'react'
export function FormField({ label, error, hint, type = 'text', placeholder, ...props }) {
  const {t} = useLocale()
  const id = useId(), [visible, setVisible] = useState(false)
  const secret = type === 'password'
  return <div className="form-field"><label htmlFor={id}>{bilingualLabel(label)}</label><div className="field-control">
    <input placeholder={t(placeholder ?? fieldGuidance(label,type))} id={id} type={secret && visible ? 'text' : type} aria-invalid={Boolean(error)} aria-describedby={`${id}-help`} {...props} />
    {secret && <button type="button" className="password-toggle" aria-label={t(visible ? 'Hide {label}' : 'Show {label}', {label:t(label).toLowerCase()})} aria-pressed={visible} onClick={() => setVisible(!visible)}>{t(visible ? 'Hide' : 'Show')}</button>}
  </div><span id={`${id}-help`} className={`field-help ${error ? 'field-error' : ''}`}>{t(error || hint) || '\u00a0'}</span></div>
}
