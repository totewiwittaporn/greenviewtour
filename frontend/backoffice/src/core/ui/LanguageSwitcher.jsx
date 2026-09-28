import {useLocale} from '../i18n/locale.jsx'
import {Dropdown} from './Dropdown.jsx'
export function LanguageSwitcher() {
  const {locale, setLocale} = useLocale()
  return <div className="language-switcher"><Dropdown label="Language / ภาษา" items={[
    {label:'TH ไทย', literal:true, lang:'th', checked:locale==='th', onSelect:()=>setLocale('th')},
    {label:'EN English', literal:true, lang:'en', checked:locale==='en', onSelect:()=>setLocale('en')},
  ]}>{locale.toUpperCase()} <span aria-hidden="true">⌄</span></Dropdown></div>
}
