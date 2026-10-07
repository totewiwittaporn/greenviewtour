import {roleNames} from '../../../../packages/contracts/access.js'
import {isLineUser} from '../../platform/line/staff-crypto.js'
// Internal projection for a signed, private LINE event. Never accept a staff ID
// from the event or copy roles from the binding's historical metadata.
export async function staffLineAccountSummary(tx,config,lineUserId){
 if(!isLineUser(lineUserId))return {status:'UNLINKED',hasBinding:false}
 const binding=await tx.staffLineBinding.findUnique({where:{channelKey_lineUserId:{channelKey:config.channelKey,lineUserId}}})
 if(!binding||!binding.lineUserId||binding.status==='UNLINKED')return {status:'UNLINKED',hasBinding:false}
 if(binding.status!=='LINKED')return {status:'UNAVAILABLE',hasBinding:true}
 const profile=await tx.userProfile.findUnique({where:{id:binding.userId},select:{displayName:true,nickname:true,status:true,roles:{select:{roleCode:true}}}})
 const auth=await tx.authUser.findUnique({where:{id:binding.userId},select:{disabled:true,bannedUntil:true,emailVerified:true}})
 if(profile?.status!=='ACTIVE'||!profile.roles?.length||!auth||!auth.emailVerified||auth.disabled||(auth.bannedUntil&&+new Date(auth.bannedUntil)>Date.now()))return {status:'UNAVAILABLE',hasBinding:true}
 const roles=[...new Set(profile.roles.map(role=>Object.hasOwn(roleNames,role.roleCode)?roleNames[role.roleCode]:null).filter(Boolean))]
 if(!roles.length)return {status:'UNAVAILABLE',hasBinding:true}
 return {status:'LINKED',hasBinding:true,displayName:profile.displayName,nickname:profile.nickname||null,roles}
}
