import {staffReadSnapshot} from './staff-read-snapshot.js'
import {AccessError} from '../../modules/identity-access/membership.js'
import {staffOa} from './staff-config.js'
const channelKey='live:'+staffOa.providerId+':'+staffOa.channelId
export function staffLineOnboardingEnabled(env){return env.APP_ENV==='production'&&env.LINE_STAFF_REQUIRED==='true'}
export function staffLineOnboardingAllowed(path,method){
 if(path.startsWith('/api/public/')||path.startsWith('/api/auth/'))return true
 return (path==='/api/me'&&method==='GET')||(['/api/me/profile','/api/me/password'].includes(path)&&method==='POST')||(path==='/api/me/line'&&['GET','POST'].includes(method))
}
export function createStaffLineOnboarding(db,env){
 if(!staffLineOnboardingEnabled(env))return undefined
 return async userId=>{
  const snapshot=await staffReadSnapshot(db,userId,channelKey)
  if(snapshot){
   if(snapshot.profileStatus!=='ACTIVE')throw new AccessError('ACCOUNT_UNAVAILABLE',403)
   if(userId===env.LINE_STAFF_SETUP_USER_ID&&snapshot.isOwner)return false
   return !(snapshot.binding?.status==='LINKED'&&/^U[0-9a-f]{32}$/.test(snapshot.binding.lineUserId||''))
  }
  return db.$transaction(async tx=>{
  const profile=await tx.userProfile.findUnique({where:{id:userId},include:{roles:true}})
  if(profile?.status!=='ACTIVE')throw new AccessError('ACCOUNT_UNAVAILABLE',403)
  if(userId===env.LINE_STAFF_SETUP_USER_ID&&profile.roles.some(role=>role.roleCode==='ADMIN_MANAGER'))return false
  const binding=await tx.staffLineBinding.findUnique({where:{channelKey_userId:{channelKey,userId}}})
  return !(binding?.status==='LINKED'&&/^U[0-9a-f]{32}$/.test(binding.lineUserId||''))
  },{readOnly:true})
 }
}
