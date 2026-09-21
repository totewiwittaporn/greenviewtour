import {translateLabel as bilingualLabel} from '../i18n/runtime.js'
import {useLocale} from '../i18n/locale.jsx'
import {LanguageSwitcher} from './LanguageSwitcher.jsx'
export function AuthLayout({ title, description, children }) {
  const {t} = useLocale()
  return <main className="auth-layout"><section className="auth-panel"><div className="auth-form-wrap"><LanguageSwitcher/><a className="auth-back" href="http://localhost:5173">{t("← Public website")}</a><span className="eyebrow">{bilingualLabel("GREENVIEW TOUR · COMPANY WORKSPACE")}</span><h2>{bilingualLabel(title)}</h2><p className="auth-description">{t(description)}</p>{children}<footer className="auth-footer">Greenview Tour <span>{t("Staff access")}</span></footer></div></section></main>
}
