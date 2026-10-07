import {staffReadSnapshot,assertStaffSnapshot} from './staff-read-snapshot.js'
import {activeStaff} from '../../modules/identity-access/staff-line.js'
import {createStaffLineClient,cleanLineDisplayName,safeLinePictureUrl} from './staff-client.js'
import {isLineUser} from './staff-crypto.js'
// Presentation only: employee names/roles and stored nickname are never changed.
export function createLinkedLineProfileReader({now=Date.now}={}){
 const cache=new Map()
 return async function readLinkedLineProfile(db,userId,config,client=createStaffLineClient(config)){
  if(!config.enabled||config.mode!=='live')return null
  const readBinding=async()=>{
   const snapshot=await staffReadSnapshot(db,userId,config.channelKey)
   if(snapshot){assertStaffSnapshot(snapshot);return snapshot.binding}
   return db.$transaction(async tx=>{await activeStaff(tx,userId);return tx.staffLineBinding.findUnique({where:{channelKey_userId:{channelKey:config.channelKey,userId}}})},{readOnly:true})
  }
  const binding=await readBinding()
  if(binding?.status!=='LINKED'||!isLineUser(binding.lineUserId))return null
  const key=JSON.stringify([config.channelKey,userId,binding.lineUserId,binding.version])
  let entry=cache.get(key)
  if(!entry||entry.expiresAt<=now()){
   if(cache.size>=200)cache.delete(cache.keys().next().value)
   entry={expiresAt:now()+30000,promise:null}
   entry.promise=(async()=>{
    try{
     const value=await client.profileDetails(binding.lineUserId)
     entry.expiresAt=now()+300000
     return {displayName:cleanLineDisplayName(value.displayName)||cleanLineDisplayName(binding.displayName),pictureUrl:safeLinePictureUrl(value.pictureUrl)}
    }catch{
     entry.expiresAt=now()+30000
     return {displayName:cleanLineDisplayName(binding.displayName),pictureUrl:null}
    }
   })()
   cache.set(key,entry)
  }
  const profile=await entry.promise
  // A slow provider response or cache hit cannot reveal an old identity after unlink/relink.
  const current=await readBinding()
  return current?.status==='LINKED'&&current.lineUserId===binding.lineUserId&&current.version===binding.version?profile:null
 }
}
export const linkedLineProfile=createLinkedLineProfileReader()
