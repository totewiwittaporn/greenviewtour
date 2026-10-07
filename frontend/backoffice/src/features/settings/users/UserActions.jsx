import {translateLabel as bilingualLabel} from '../../../core/i18n/runtime.js'
import {primaryRoleCode,roleDepartments,roleNames} from '../../../../../../packages/contracts/access.js'
import {translate as t,useLocale} from '../../../core/i18n/locale.jsx'
import {useRef,useState} from 'react'
import {Dialog} from '../../../core/ui/Dialog.jsx'
import {Button} from '../../../core/ui/Button.jsx'
import {AddressFields} from '../../../core/ui/AddressFields.jsx'
import {addressKeys,validateAddress,formatAddress,mapLinks} from '../../../../../../packages/contracts/address.js'
import {useUnsavedChanges} from '../../../core/navigation/Navigation.jsx'
import {FormField} from '../../../core/ui/FormField.jsx'
import {SelectField} from '../../../core/ui/SelectField.jsx'
import {api} from '../../../core/auth/api.js'
export function UserActions({user,canChangeDepartment,availablePrimaryRoles=[],onClose,onSaved,initialMode='view',self=false}){
 useLocale()
 const initialPrimary=primaryRoleCode(user)||''
 const [mode,setMode]=useState(initialMode),[displayName,setDisplayName]=useState(user.displayName||''),[primaryRole,setPrimaryRole]=useState(initialPrimary)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[fieldError,setFieldError]=useState(''),[discard,setDiscard]=useState(false)
 const [contacts,setContacts]=useState(()=>Object.fromEntries(['primaryPhone','emergencyPhone','lineId','address',...addressKeys].map(key=>[key,user[key]||''])))
 const [addressErrors,setAddressErrors]=useState({})
 const form=useRef(null),lock=useRef(false)
 const department=roleDepartments[primaryRole]||user.department||''
 const primaryChanged=canChangeDepartment&&primaryRole!==initialPrimary
 const dirty=displayName!==(user.displayName||'')||primaryChanged||Object.entries(contacts).some(([key,value])=>value!==(user[key]||''))
 useUnsavedChanges(mode!=='view'&&(dirty||busy))
 function close(){if(busy)return;if(dirty)setDiscard(true);else onClose()}
 async function save(event){
  event?.preventDefault();if(lock.current)return
  if(!displayName.trim()||displayName.trim().length>100){setFieldError('Enter a name from 1 to 100 characters.');requestAnimationFrame(()=>form.current?.querySelector('input')?.focus());return}
  if(canChangeDepartment&&!primaryRole){setError('Choose a primary role.');return}
  const invalid=validateAddress(contacts);setAddressErrors(invalid)
  if(Object.keys(invalid).length){requestAnimationFrame(()=>form.current?.querySelector('[aria-invalid="true"]')?.focus());return}
  if(primaryChanged&&mode!=='review'){setMode('review');return}
  lock.current=true;setBusy(true);setError('')
  try{
   await api(self?'/api/me/profile':`/api/users/${user.id}/profile`,{displayName,...contacts,updatedAt:user.updatedAt,...(!self&&canChangeDepartment?{primaryRoleCode:primaryRole}:{})})
   onSaved()
  }catch(error){setError(error.message==='INVALID_PHONE'?'Phone numbers must contain 7–15 digits, with optional +, spaces, brackets or hyphens.':error.message==='ROLE_ASSIGNMENT_DENIED'?'You can no longer assign this primary role. Refresh the user directory.':error.status===409?'This profile changed while you were editing. Close this window, refresh the list and try again.':error.status===403?'Your permission to edit this user has changed. Close this window and refresh the list.':'Unable to save changes. Check your connection and try again.')}
  finally{lock.current=false;setBusy(false)}
 }
 const additionalRoles=(user.roles||[]).filter(role=>(role.roleCode||role.code)!==initialPrimary)
 return <Dialog title={discard?bilingualLabel('Discard changes?'):mode==='edit'?self?bilingualLabel('Edit profile'):bilingualLabel('Edit user'):mode==='review'?bilingualLabel('Review primary role change'):mode==='view'?bilingualLabel('User details'):bilingualLabel('User actions')} onClose={close} busy={busy}>
  {discard?<><p>{t("Your changes to")}{' '}{user.email}{' '}{t("have not been saved.")}</p><div className="dialog-actions"><Button autoFocus onClick={()=>setDiscard(false)}>{t("Keep editing")}</Button><Button onClick={onClose}>{t("Discard changes")}</Button></div></>:<>
   <p className="action-subject">{user.email}</p>
   {mode==='view'?<dl className="profile-details"><dt>{bilingualLabel("Name")}</dt><dd>{user.displayName}</dd><dt>{bilingualLabel("Primary role")}</dt><dd>{t(roleNames[initialPrimary]||initialPrimary||'Not assigned')}</dd><dt>{bilingualLabel("Department")}</dt><dd>{t(user.department||'Not assigned')}</dd>{additionalRoles.length>0&&<><dt>{bilingualLabel("Additional roles")}</dt><dd>{additionalRoles.map(role=>t(roleNames[role.roleCode||role.code]||role.roleCode||role.code)).join(' · ')}</dd></>}{Object.entries({primaryPhone:'Primary phone',emergencyPhone:'Emergency phone',lineId:'Line ID',address:'Address'}).map(([key,label])=><div className="profile-detail-pair" key={key}><dt>{bilingualLabel(label)}</dt><dd>{(key==='address'?formatAddress(user):user[key])||t("Not provided")}</dd></div>)}{mapLinks(user).pin&&<div><dt>{bilingualLabel("Map location")}</dt><dd><a href={mapLinks(user).pin} target="_blank" rel="noopener noreferrer">{t("Open saved pin")}</a></dd></div>}<dt>{bilingualLabel("Status")}</dt><dd>{t(user.status)}</dd></dl>:<form ref={form} noValidate onSubmit={save} aria-busy={busy}>
    {mode==='review'?<><p>{t("Change the primary role from")}{' '}<strong>{t(roleNames[initialPrimary]||initialPrimary||'Not assigned')}</strong>{' '}{t("to")}{' '}<strong>{t(roleNames[primaryRole]||primaryRole)}</strong>?</p><p>{t("The department changes automatically with the primary role. Additional roles and individual permission exceptions remain unchanged.")}</p><p><strong>{t(user.department||'Not assigned')}</strong>{' → '}<strong>{t(department||'Not assigned')}</strong></p></>:<>
     <FormField label={bilingualLabel("Display name")} value={displayName} onChange={event=>{setDisplayName(event.target.value);setFieldError('')}} error={t(fieldError)} maxLength={100} disabled={busy} autoComplete="off"/>
     {!self&&canChangeDepartment?<><SelectField label={bilingualLabel("Primary role")} value={primaryRole} onChange={event=>{setPrimaryRole(event.target.value);setError('')}} disabled={busy} hint={t("Department and default duties follow the primary role automatically.")}><option value="">{t("Choose a role")}</option>{availablePrimaryRoles.map(role=><option key={role.code} value={role.code}>{t(role.name)}</option>)}</SelectField><p className="field-help">{t("Department:")}{' '}<strong>{t(department||'Not assigned')}</strong></p></>:<p>{t("Department:")}{' '}{t(user.department)}</p>}
     {Object.entries({primaryPhone:'Primary phone',emergencyPhone:'Emergency phone',lineId:'Line ID'}).map(([key,label])=><FormField key={key} label={label} type={key.endsWith('Phone')?'tel':'text'} value={contacts[key]} onChange={e=>setContacts(old=>({...old,[key]:e.target.value}))} maxLength={key==='lineId'?100:32} disabled={busy} autoComplete="off"/>)}
     <AddressFields values={contacts} legacyAddress={user.address} errors={addressErrors} disabled={busy} onChange={(key,value)=>{setContacts(old=>({...old,[key]:value}));setAddressErrors(old=>({...old,[key]:undefined}))}}/>
     <p className="field-help">{t("Email, password and account status are unchanged. Extra roles and special permissions are managed in Configure permissions.")}</p>
    </>}
    {error&&<p className="inline-error" role="alert">{t(error)}</p>}
    <div className="dialog-actions">{mode==='review'&&<Button disabled={busy} onClick={()=>setMode('edit')}>{t("Back to edit")}</Button>}<Button type="submit" className="button-primary" disabled={busy||!dirty} busy={busy}>{mode==='review'?t('Confirm primary role change'):t('Save changes')}</Button></div>
   </form>}
  </>}
 </Dialog>
}