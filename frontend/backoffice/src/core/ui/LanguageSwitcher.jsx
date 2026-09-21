import {useLocale} from '../i18n/locale.jsx'
import {Button} from './Button.jsx'
export function LanguageSwitcher() {
 const {locale,setLocale}=useLocale()
 return <div className="language-switcher" role="group" aria-label="Language / ภาษา"><Button aria-label="Thai / ภาษาไทย" lang="th" aria-pressed={locale==='th'} onClick={()=>setLocale('th')}>TH</Button><Button aria-label="English" lang="en" aria-pressed={locale==='en'} onClick={()=>setLocale('en')}>EN</Button></div>
}
