import {useRef,useState} from 'react'
import {api} from '../../core/auth/api.js'
import {useLocale} from '../../core/i18n/locale.jsx'
import {Button} from '../../core/ui/Button.jsx'
import {Dialog} from '../../core/ui/Dialog.jsx'
export default function AgentMarginOffset({receiptId,disabled,onAmount}){
 const {t}=useLocale(),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),lock=useRef(false),command=useRef(null)
 async function apply(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('')
  if(command.current?.receiptId!==receiptId)command.current={id:crypto.randomUUID(),receiptId}
  try{const result=await api('/api/agent-margin-offset',command.current);onAmount(result.refundable);setConfirm(false)}catch{setError('Unable to apply held margin. Check your permission and cancel any existing refund draft before retrying.')}finally{lock.current=false;setBusy(false)}
 }
 return <><Button disabled={disabled||!receiptId} onClick={()=>setConfirm(true)}>{t('Apply held margin to Agent debt')}</Button>{confirm&&<Dialog title={t('Apply held margin to Agent debt')} busy={busy} onClose={()=>setConfirm(false)}><p>{t('Settle outstanding Agent receivables using this receipt’s held margin. This records a non-cash offset and fills the remaining refundable amount.')}</p>{error&&<p role="alert">{t(error)}</p>}<div className="dialog-actions"><Button disabled={busy} onClick={()=>setConfirm(false)}>{t('Cancel')}</Button><Button disabled={busy} busy={busy} onClick={apply}>{t('Apply offset')}</Button></div></Dialog>}</>
}
