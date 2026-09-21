import {useLocale} from '../i18n/locale.jsx'
import {Button} from './Button.jsx'
export function LanguageSwitcher() {
 const {locale,setLocale}=useLocale()
 return <div className="language-switcher" role="group" aria-label="Language / ภาษา"><Button lang="th" aria-pressed={locale==='th'} onClick={()=>setLocale('th')}>ไทย</Button><Button lang="en" aria-pressed={locale==='en'} onClick={()=>setLocale('en')}>English</Button></div>
}
