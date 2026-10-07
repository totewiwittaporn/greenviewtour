import {useLocale} from '../../core/i18n/locale.jsx'
import {Button} from '../../core/ui/Button.jsx'
import StaffLineCard from './StaffLineCard.jsx'
import {lineCopy} from './copy.js'
export default function StaffLineOnboarding({onRefresh,onLogout,busy,error}){
 const {locale}=useLocale(),copy=lineCopy(locale)
 return <main className="staff-line-connect">
  <section className="panel"><p className="eyebrow">GREENVIEW STAFF</p><h1>{copy.onboardingTitle}</h1><p>{copy.onboardingIntro}</p><p>{copy.instructions}</p>
   <a className="button button-primary" href="https://line.me/R/ti/p/%40335bydey" target="_blank" rel="noreferrer">{copy.friend}</a>
  </section>
  <StaffLineCard onLinked={onRefresh}/>
  {error&&<p className="field-error" role="alert">{error}</p>}
  <div className="staff-line-actions"><Button onClick={onRefresh}>{copy.onboardingRetry}</Button><a className="button" href="/profile">{copy.profile}</a><Button disabled={busy} busy={busy} onClick={onLogout}>{copy.signOut}</Button></div>
 </main>
}
