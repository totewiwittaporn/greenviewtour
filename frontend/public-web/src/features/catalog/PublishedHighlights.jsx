import {useLocale} from '../../core/useLocale.js'
import {useEffect,useState} from 'react'
import {Button} from '../../core/ui/Controls.jsx'
export default function PublishedHighlights(){const {t,label,number}=useLocale();
 const [state,setState]=useState({loading:true}),[attempt,setAttempt]=useState(0)
 useEffect(()=>{const c=new AbortController();setState({loading:true});fetch('/api/public/tours?page=1',{signal:c.signal}).then(async r=>{if(!r.ok)throw Error();return r.json()}).then(r=>{if(!c.signal.aborted)setState(r)}).catch(()=>{if(!c.signal.aborted)setState({error:true})});return()=>c.abort()},[attempt])
 if(state.loading)return <p role="status">{t("กำลังโหลดโปรแกรมทัวร์…")}</p>
 if(state.error)return <><p role="alert">{t("ยังโหลดโปรแกรมทัวร์ไม่ได้")}</p><Button onClick={()=>setAttempt(n=>n+1)}>{t("ลองอีกครั้ง")}</Button></>
 if(!state.rows.length)return <p>{t("กำลังเตรียมโปรแกรมทัวร์สำหรับฤดูกาลถัดไป ติดต่อทีมงานเพื่อสอบถามวันเดินทางได้เลย")}</p>
 return <><div className="tour-grid">{state.rows.slice(0,3).map(tour=><article className="tour-card" key={tour.id}><a className="tour-image-link" href={'/tours?tour='+encodeURIComponent(tour.slug)} aria-label={t("ดูรายละเอียด")+' '+tour.name}>{tour.imageUrls&&<img src={tour.imageUrls.split('\n')[0]} alt={tour.name} loading="lazy"/>}<span className="duration">{number(tour.durationDays)} {label("วัน")}</span></a><div className="tour-content"><h3>{tour.name}</h3><p>{tour.description}</p><a href={'/tours?tour='+encodeURIComponent(tour.slug)}>{label("ดูรายละเอียดและวันเดินทาง →")}</a></div></article>)}</div><a className="public-button" href="/tours">{label("ดูโปรแกรมทั้งหมด")}</a></>
}
