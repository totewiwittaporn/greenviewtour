import {useEffect,useRef,useState} from 'react'
import {Button} from './ui.jsx'
export default function LeaveGuard({dirty}){
 const [destination,setDestination]=useState(null),dialog=useRef(null),leaving=useRef(false)
 useEffect(()=>{if(!dirty)return;const unload=e=>{if(!leaving.current){e.preventDefault();e.returnValue=''}};const click=e=>{if(leaving.current||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.altKey||e.shiftKey)return;const a=e.target.closest('a[href]');if(!a||a.target==='_blank'||a.hasAttribute('download')||a.hash&&a.pathname===location.pathname)return;e.preventDefault();setDestination(a.href)};window.addEventListener('beforeunload',unload);document.addEventListener('click',click);return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click)}},[dirty])
 useEffect(()=>{if(destination){dialog.current.showModal();return()=>dialog.current?.close()}},[destination])
 return destination?<dialog ref={dialog} aria-labelledby="leave-title" onCancel={e=>{e.preventDefault();setDestination(null)}}><h2 id="leave-title">ออกจากหน้านี้?</h2><p>ข้อมูลที่ยังไม่ได้บันทึกหรือส่งจะหายไป</p><div className="actions"><Button autoFocus onClick={()=>setDestination(null)}>ทำรายการต่อ</Button><Button className="secondary" onClick={()=>{leaving.current=true;location.assign(destination)}}>ออกโดยไม่บันทึก</Button></div></dialog>:null
}
