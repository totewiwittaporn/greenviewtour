import {useEffect,useState} from 'react'
import {api} from '../auth/api.js'
import {publicWebsiteOrigin} from '../navigation/publicWebsite.js'
import {useLocale} from '../i18n/locale.jsx'
import {translateLabel} from '../i18n/runtime.js'
import {formatAddress, safeMapUrl} from '../../../../../packages/contracts/address.js'
import {Dropdown} from './Dropdown.jsx'
let cachedLine=null
export function UserInfo({user, onEdit, onLogout, signingOut, subtitle}) {
  const {t, locale, setLocale} = useLocale()
  const [line,setLine]=useState(null),[failedPicture,setFailedPicture]=useState(null)
  useEffect(()=>{
    let controller,inFlight=false
    const refresh=(force=false)=>{
      if(!force&&inFlight)return
      if(!force&&cachedLine?.userId===user.id&&Date.now()<cachedLine.expiresAt){setLine(cachedLine);return}
      cachedLine=null
      if(force)setLine(null)
      controller?.abort();controller=new AbortController();inFlight=true
      const signal=controller.signal
      api('/api/me/line?view=profile',undefined,{signal}).then(data=>{
        if(!signal.aborted){cachedLine={userId:user.id,profile:data.linkedLineProfile,expiresAt:Date.now()+60000};setLine(cachedLine)}
      }).catch(()=>{if(!signal.aborted){cachedLine={userId:user.id,profile:null,expiresAt:Date.now()+10000};setLine(null)}}).finally(()=>{if(!signal.aborted)inFlight=false})
    }
    const changed=()=>refresh(true)
    refresh()
    window.addEventListener('greenview:line-changed',changed)
    return()=>{controller?.abort();window.removeEventListener('greenview:line-changed',changed)}
  },[user.id])
  const linked=line?.userId===user.id?line.profile:null
  const identity = linked?.displayName?.trim() || user.nickname?.trim() || user.displayName || user.email || '—'
  const picture=linked?.pictureUrl
  const safePicture=typeof picture==='string'&&/^https:\/\/(s?profile\.line-scdn\.net|obs\.line-apps\.com)\//.test(picture)?picture:null
  const map = safeMapUrl(user.mapUrl)
  const details = [
    ['Display name', user.displayName],
    ['Nickname', linked?.displayName?.trim() || user.nickname],
    ['Primary phone', user.primaryPhone],
    ['Emergency phone', user.emergencyPhone],
    ['Line ID', user.lineId],
    ['Address', formatAddress(user)],
  ]
  return <Dropdown label="User menu" variant="user-info" disabled={signingOut} heading={<>
    <strong>{identity}</strong>
    <dl className="user-info-details">{details.map(([label, value]) => <div key={label}><dt>{translateLabel(label)}{label==='Nickname'&&linked?.displayName?.trim()&&<small> · LINE</small>}</dt><dd>{value || '—'}</dd></div>)}</dl>
  </>} items={[
    ...(map ? [{label:'Map location', icon:'globe', href:map, target:'_blank'}] : []),
    {label:'Edit profile', icon:'edit', onSelect:onEdit},
    {label:'Open website', icon:'globe', href:publicWebsiteOrigin(), target:'_blank'},
    {section:locale === 'th' ? 'ภาษา / Language' : 'Language'},
    {label:'TH ไทย', literal:true, lang:'th', checked:locale === 'th', onSelect:() => setLocale('th')},
    {label:'EN English', literal:true, lang:'en', checked:locale === 'en', onSelect:() => setLocale('en')},
    {label:'Sign out', icon:'logout', onSelect:()=>{cachedLine=null;setLine(null);onLogout()}, danger:true},
  ]}><span className="avatar" aria-hidden="true">{safePicture&&failedPicture!==safePicture?<img src={safePicture} alt="" referrerPolicy="no-referrer" onError={()=>setFailedPicture(safePicture)}/>:Array.from(identity)[0]?.toUpperCase()}</span>{subtitle ? <span className="user-info-identity"><span className="account-name" title={identity}>{signingOut ? t('Signing out…') : identity}</span><small className="reference-account-role" title={subtitle}>{subtitle}</small></span> : <span className="account-name" title={identity}>{signingOut ? t('Signing out…') : identity}</span>}<span className="user-menu-chevron" aria-hidden="true">⌄</span></Dropdown>
}
