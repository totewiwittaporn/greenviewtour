import {useRef,useState} from 'react'
import {FormField} from '../../../core/ui/FormField.jsx'
import {Button} from '../../../core/ui/Button.jsx'
import {prepareDocumentImage} from '../../../core/ui/prepareDocumentImage.js'
import {api} from '../../../core/auth/api.js'
export default function WebsiteImageUpload({onUploaded,disabled}){
 const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),id=useRef(crypto.randomUUID())
 async function upload(){if(busy||!file)return;setBusy(true);setError('');try{const photo=await prepareDocumentImage(file);const bytes=new Uint8Array(await photo.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);const result=await api('/api/website-images',{id:id.current,filename:photo.name,mimeType:photo.type,base64:btoa(binary)});onUploaded(result.url);setFile(null);id.current=crypto.randomUUID()}catch{setError('Unable to upload. Choose a JPEG or PNG image up to 5 MB after compression and retry.')}finally{setBusy(false)}}
 return <section className="address-section"><FormField label="Upload website image" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||disabled} onChange={e=>{setFile(e.target.files[0]||null);id.current=crypto.randomUUID()}} hint="Images become public when linked to a published tour or active pop-up."/><Button disabled={!file||busy||disabled} busy={busy} onClick={upload}>Upload and use image</Button>{error&&<p role="alert">{error}</p>}</section>
}
