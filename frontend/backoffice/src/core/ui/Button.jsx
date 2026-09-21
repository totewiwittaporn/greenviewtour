import {useLocale} from '../i18n/locale.jsx'
export function Button({ children, busy = false, className = '', onClick, ...props }) {
  const {t} = useLocale()
  return <button type="button" className={`button ${className}`} aria-busy={busy} onClick={onClick} {...props} aria-label={t(props['aria-label'])}>{typeof children === 'string' ? t(children) : children}</button>
}
