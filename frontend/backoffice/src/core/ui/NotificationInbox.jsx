import {useEffect,useState} from 'react'
import {api} from '../auth/api.js'
import {useLocale} from '../i18n/locale.jsx'
import {formatDate} from '../i18n/runtime.js'
import {Dialog} from './Dialog.jsx'
import {Button} from './Button.jsx'
import {DataTable} from './DataTable.jsx'
export function NotificationInbox({onClose}){
 const {t}=useLocale(),[page,setPage]=useState(1),[attempt,setAttempt]=useState(0),[state,setState]=useState({loading:true,rows:[]})
 useEffect(()=>{const controller=new AbortController();api('/api/notifications?page='+page,undefined,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({...data,rows:data.rows||[]})}).catch(()=>{if(!controller.signal.aborted)setState({rows:[],error:'Unable to load notifications.'})});return()=>controller.abort()},[page,attempt])
 const change=next=>{setState({rows:[],loading:true});setPage(next)}
 return <Dialog title={t('Notifications')} onClose={onClose} variant="table"><p>{t('Events from the last 30 days, filtered by your current permissions and responsibilities.')}</p><DataTable columns={['Time','Event']} busy={state.loading} error={state.error} onRetry={()=>{setState({rows:[],loading:true});setAttempt(n=>n+1)}} isEmpty={!state.rows.length} empty={<p>{t('No relevant events on this page.')}</p>}>{state.rows.map(row=><tr key={row.id}><td>{formatDate(row.at,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})}</td><td><a href={row.href} onClick={onClose}>{t(row.label)}</a></td></tr>)}</DataTable><div className="dialog-actions"><Button disabled={state.loading||page===1} onClick={()=>change(page-1)}>{t('Previous')}</Button><span>{page}</span><Button disabled={state.loading||!state.hasMore} onClick={()=>change(page+1)}>{t('Next')}</Button></div></Dialog>
}
