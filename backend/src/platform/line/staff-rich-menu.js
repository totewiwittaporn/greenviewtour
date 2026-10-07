import {isLineUser} from './staff-crypto.js'
import {createStaffLineClient} from './staff-client.js'
import {activeStaff} from '../../modules/identity-access/staff-line.js'
import {AccessError} from '../../modules/identity-access/membership.js'
const menuId=value=>/^richmenu-[a-f0-9]{32}$/.test(value||'')
async function desiredMenu(db,config,lineUserId){
 return db.$transaction(async tx=>{
  const binding=await tx.staffLineBinding.findUnique({where:{channelKey_lineUserId:{channelKey:config.channelKey,lineUserId}}})
  if(binding?.status==='LINKED'){
   try{await activeStaff(tx,binding.userId);return config.richMenuLinked}
   catch(error){if(!(error instanceof AccessError))throw error}
  }
  return config.richMenuUnlinked
 },{readOnly:true})
}
// Call outside the binding transaction. Applying the same menu is idempotent;
// a failed result must be retried on webhook redelivery (even for DONE events)
// or the next direct follow/status/link interaction. No binding is ever altered.
export async function syncStaffRichMenu(db,config,lineUserId,client=createStaffLineClient(config)){
 if(!config.enabled||config.mode!=='live'||!menuId(config.richMenuLinked)||!menuId(config.richMenuUnlinked))return {status:'skipped'}
 if(!isLineUser(lineUserId))return {status:'skipped'}
 try{
  // Re-read after provider I/O so a concurrent unlink/relink normally converges
  // immediately. Continued changes are reported for a later retry, never claimed synced.
  for(let attempt=0;attempt<2;attempt++){
   const target=await desiredMenu(db,config,lineUserId)
   await client.setUserRichMenu(lineUserId,target)
   if(await desiredMenu(db,config,lineUserId)===target)return {status:'synced'}
  }
 }catch{/* Provider details and identifiers must not be logged. */}
 console.warn(JSON.stringify({event:'STAFF_LINE_RICH_MENU_RETRY'}))
 return {status:'retry'}
}
