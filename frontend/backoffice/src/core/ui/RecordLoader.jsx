import {useEffect,useState} from 'react'
import {api} from '../auth/api.js'
import {useLocale} from '../i18n/locale.jsx'
import {Dialog} from './Dialog.jsx'
import {Button} from './Button.jsx'
// List rows are not editable snapshots. Load the exact, currently authorized
// record only after opening a detail action; a failed read never opens an empty editor.
export function RecordLoader({recordId,url,title='Details',onClose,children,initial={}}){
 const {t}=useLocale(),[state,setState]=useState({}),[retry,setRetry]=useState(0)
 useEffect(()=>{
  if(!recordId)return
  const controller=new AbortController();setState({key:url,loading:true})
  api(url,undefined,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])}).then(data=>{
   if(controller.signal.aborted)return
   const row=data.row?.id===recordId?data.row:(data.rows||data.users||[]).find(row=>row.id===recordId)
   setState(row?{key:url,row,data}:{key:url,error:true})
  }).catch(()=>{if(!controller.signal.aborted)setState({key:url,error:true})})
  return()=>controller.abort()
 },[recordId,url,retry])
 if(!recordId)return children(initial,{})
 const current=state.key===url?state:{loading:true}
 if(current.row)return children(current.row,current.data)
 return <Dialog title={t(title)} onClose={onClose}>{current.error?<><p role="alert">{t('Unable to load this record. Refresh and retry before editing.')}</p><Button onClick={()=>setRetry(value=>value+1)}>{t('Retry')}</Button></>:<p role="status">{t('Loading current record…')}</p>}</Dialog>
}
