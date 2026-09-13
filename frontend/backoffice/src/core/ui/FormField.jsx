import { fieldGuidance } from './fieldGuidance.js'
import { useId, useState } from 'react'
export function FormField({ label, error, hint, type = 'text', placeholder, ...props }) {
  const id = useId(), [visible, setVisible] = useState(false)
  const secret = type === 'password'
  return <div className="form-field"><label htmlFor={id}>{label}</label><div className="field-control">
    <input placeholder={placeholder ?? fieldGuidance(label,type)} id={id} type={secret && visible ? 'text' : type} aria-invalid={Boolean(error)} aria-describedby={`${id}-help`} {...props} />
    {secret && <button type="button" className="password-toggle" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'}</button>}
  </div><span id={`${id}-help`} className={`field-help ${error ? 'field-error' : ''}`}>{error || hint || '\u00a0'}</span></div>
}
