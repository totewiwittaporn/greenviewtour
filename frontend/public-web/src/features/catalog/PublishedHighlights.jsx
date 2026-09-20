import {useEffect,useState} from 'react'
import {Button} from '../../core/ui/Controls.jsx'
export default function PublishedHighlights(){
 const [state,setState]=useState({loading:true}),[attempt,setAttempt]=useState(0)
 useEffect(()=>{const c=new AbortController();setState({loading:true});fetch('/api/public/tours?page=1',{signal:c.signal}).then(async r=>{if(!r.ok)throw Error();return r.json()}).then(r=>{if(!c.signal.aborted)setState(r)}).catch(()=>{if(!c.signal.aborted)setState({error:true})});return()=>c.abort()},[attempt])
 if(state.loading)return <p role="status">กำลังโหลดโปรแกรมทัวร์…</p>
 if(state.error)return <><p role="alert">ยังโหลดโปรแกรมทัวร์ไม่ได้</p><Button onClick={()=>setAttempt(n=>n+1)}>ลองอีกครั้ง</Button></>
 if(!state.rows.length)return <p>กำลังเตรียมโปรแกรมทัวร์สำหรับฤดูกาลถัดไป ติดต่อทีมงานเพื่อสอบถามวันเดินทางได้เลย</p>
 return <><div className="tour-grid">{state.rows.slice(0,3).map(t=><article className="tour-card" key={t.id}><a className="tour-image-link" href={'/tours?tour='+encodeURIComponent(t.slug)} aria-label={'ดูรายละเอียด '+t.name}>{t.imageUrls&&<img src={t.imageUrls.split('\n')[0]} alt={t.name} loading="lazy"/>}<span className="duration">{t.durationDays} วัน</span></a><div className="tour-content"><h3>{t.name}</h3><p>{t.description}</p><a href={'/tours?tour='+encodeURIComponent(t.slug)}>ดูรายละเอียดและวันเดินทาง →</a></div></article>)}</div><a className="public-button" href="/tours">ดูโปรแกรมทั้งหมด</a></>
}
