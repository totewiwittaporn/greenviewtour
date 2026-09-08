import { useId } from 'react'
export function SelectField({ label, error, hint, children, ...props }) {
  const id = useId()
  return <div className="form-field"><label htmlFor={id}>{label}</label><div className="field-control"><select id={id} aria-invalid={Boolean(error)} aria-describedby={`${id}-help`} {...props}>{children}</select></div><span id={`${id}-help`} className={`field-help ${error ? 'field-error' : ''}`}>{error || hint || '\u00a0'}</span></div>
}
