import {useEffect,useState} from 'react'
import {useLocale} from '../../core/i18n/locale.jsx'
import {api} from '../../core/auth/api.js'
import {Button} from '../../core/ui/Button.jsx'
import './manuals.css'
export default function ManualPage({role}){
 const {locale}=useLocale(),[state,setState]=useState({loading:true}),[attempt,setAttempt]=useState(0)
 const copy=(en,th)=>locale==='th'?th:en
 useEffect(()=>{const controller=new AbortController();api('/api/manuals'+(role?'?role='+encodeURIComponent(role):''),undefined,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({data})}).catch(error=>{if(!controller.signal.aborted)setState({error:error.status===403?'denied':'failed'})});return()=>controller.abort()},[role,attempt])
 if(state.loading)return <p role="status">{copy('Loading user guides…','กำลังโหลดคู่มือผู้ใช้…')}</p>
 if(state.error)return <section className="panel manual-state" role="alert"><h1 tabIndex="-1">{copy(state.error==='denied'?'Access restricted':'Unable to load user guides',state.error==='denied'?'ไม่มีสิทธิ์เข้าถึง':'ไม่สามารถโหลดคู่มือผู้ใช้')}</h1><p>{copy('This guide may not be available for your assigned roles.','คู่มือนี้อาจไม่อยู่ในตำแหน่งที่คุณได้รับมอบหมาย')}</p><a href="/manuals">{copy('User guides','คู่มือผู้ใช้ / User guides')}</a>{state.error==='failed'&&<Button onClick={()=>{setState({loading:true});setAttempt(n=>n+1)}}>{copy('Retry','ลองใหม่')}</Button>}</section>
 const heading=value=>locale==='th'?`${value.th} / ${value.en}`:value.en
 const {roles,manual}=state.data
 return <div className="manual-page"><div className="page-heading"><h1 tabIndex="-1">{copy('User guides','คู่มือผู้ใช้ / User guides')}</h1><a href="/dashboard">{copy('Dashboard','ภาพรวมงาน')}</a></div><p>{copy('Choose a guide for one of your available roles.','เลือกคู่มือของตำแหน่งที่คุณมีสิทธิ์เข้าถึง')}</p><nav className="manual-role-list" aria-label={copy('Available role guides','คู่มือตำแหน่งที่เข้าถึงได้')}>{roles.map(item=><a key={item.role} href={'/manuals/'+item.role} aria-current={role===item.role?'page':undefined}>{heading(item.title)}</a>)}</nav>{!roles.length&&<p>{copy('No role guides are available for this account. Contact your Manager.','บัญชีนี้ยังไม่มีคู่มือตามตำแหน่ง กรุณาติดต่อผู้จัดการ')}</p>}{manual&&<article className="panel manual-article"><h2>{heading(manual.title)}</h2>{manual.sections.map((section,i)=><section key={i}><h3>{heading(section.heading)}</h3><p>{section.body[locale]||section.body.en}</p></section>)}</article>}</div>
}
