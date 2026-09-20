import {useEffect,useState} from 'react'
import {Button,Notice} from '../core/ui.jsx'
import {api,errorText} from '../core/api.js'
export default function Documents({requestId}){
 const [open,setOpen]=useState(false),[state,setState]=useState({loading:true}),[attempt,setAttempt]=useState(0)
 useEffect(()=>{if(!open)return;const c=new AbortController();setState({loading:true});api('/api/member/documents?requestId='+requestId,undefined,c.signal).then(r=>{if(!c.signal.aborted)setState(r)}).catch(e=>{if(!c.signal.aborted)setState({error:errorText(e)})});return()=>c.abort()},[requestId,open,attempt])
 return <section><Button className="secondary" onClick={()=>setOpen(!open)}>{open?'ซ่อนเอกสาร':'ดูเอกสารและหลักฐาน'}</Button>{open&&(state.loading?<Notice>กำลังโหลดเอกสาร…</Notice>:state.error?<><Notice error>{state.error}</Notice><Button onClick={()=>setAttempt(n=>n+1)}>ลองอีกครั้ง</Button></>:<ul>{!state.rows.length&&<li>ยังไม่มีเอกสาร</li>}{state.rows.map(f=><li key={f.id}><a href={'/api/member/documents/'+f.id} target="_blank" rel="noreferrer">{f.filename}</a> · {Math.ceil(f.size/1024)} KB</li>)}</ul>)}</section>
}
