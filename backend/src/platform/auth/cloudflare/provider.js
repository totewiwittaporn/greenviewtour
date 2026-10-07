import {authMailTransaction} from './mail.js'
import {makeBetterAuth,authError,assertAuthUser,publicAuthUser,passwordHash,verifyCompatiblePassword} from './runtime.js'
import {AccessError,normalizeEmail} from '../../../modules/identity-access/membership.js'
import {assertInvitationAuthority} from '../../../modules/identity-access/invitations.js'
const tokenInput=value=>{if(typeof value!=='string'||value.length<10||value.length>4096||!/^[A-Za-z0-9._~-]+$/.test(value))throw new AccessError('RECOVERY_INVALID',400);return value}
export function createD1AuthProvider(db,env){
 const transaction=async (callback,options={requiresMail:false})=>{try{return await authMailTransaction(db,env,callback,options)}catch(error){throw authError(error)}}
 async function registration(email,password,surface){
  email=normalizeEmail(email)
  return transaction(async (tx,mailEnv)=>{
   let invitation
   if(surface==='workspace'){
    invitation=await tx.invitation.findUnique({where:{email},include:{roles:true}})
    if(!invitation||invitation.consumedAt||invitation.revokedAt||invitation.expiresAt<=new Date()||invitation.acceptedAt)throw new AccessError('INVITATION_INVALID',400)
    if(invitation.createdById){await assertInvitationAuthority(tx,invitation);throw new AccessError('ONBOARDING_REQUIRED',403)}
    const existing=await tx.authUser.findUnique({where:{email}})
    if(existing){
     assertAuthUser(existing)
     const account=await tx.authAccount.findFirst({where:{userId:existing.id,providerId:'credential'}})
     if(!account?.password||!await verifyCompatiblePassword({hash:account.password,password}))throw new AccessError('INVALID_CREDENTIALS',400)
     await tx.invitation.update({where:{id:invitation.id},data:{acceptedAt:new Date()}})
     return {session:null,user:publicAuthUser(existing)}
    }
   }
   const auth=makeBetterAuth(tx,mailEnv,surface)
   const result=await auth.api.signUpEmail({body:{email,password,name:invitation?.displayName||email.split('@')[0]}})
   if(invitation)await tx.invitation.update({where:{id:invitation.id},data:{acceptedAt:new Date()}})
   return {session:null,user:result.user?publicAuthUser(result.user):null}
  },{requiresMail:true})
 }
 return {
  kind:'better-auth-d1',
  async login(email,password,surface='workspace'){
   email=normalizeEmail(email)
   const result=await transaction(async (tx,mailEnv)=>{
    const auth=makeBetterAuth(tx,mailEnv,surface)
    let result
    try{result=await auth.api.signInEmail({body:{email,password,rememberMe:false}})}catch(error){
     // Commit verification state before delivering mail for an unverified login.
     if(error.body?.code==='EMAIL_NOT_VERIFIED')return {error:'EMAIL_CONFIRMATION_REQUIRED'}
     throw error
    }
    const user=assertAuthUser(await tx.authUser.findUnique({where:{id:result.user.id}}))
    const session=await tx.authSession.findUnique({where:{token:result.token}})
    if(!session||session.userId!==user.id)throw new AccessError('AUTH_UNAVAILABLE',503)
    return {user:publicAuthUser(user),session:{id:session.id,user:publicAuthUser(user),expiresAt:session.expiresAt}}
   },{requiresMail:true})
   if(result.error)throw new AccessError(result.error,403)
   return result
  },
  register:(email,password)=>registration(email,password,'workspace'),
  registerMember:(email,password)=>registration(email,password,'customer'),
  async recover(email){return transaction((tx,mailEnv)=>makeBetterAuth(tx,mailEnv,'workspace').api.requestPasswordReset({body:{email:normalizeEmail(email)}}),{requiresMail:true,concealDeliveryFailure:true})},
  async recoverMember(email){return transaction((tx,mailEnv)=>makeBetterAuth(tx,mailEnv,'customer').api.requestPasswordReset({body:{email:normalizeEmail(email)}}),{requiresMail:true,concealDeliveryFailure:true})},
  async verifyEmail(token,surface='workspace'){
   tokenInput(token)
   return transaction(async (tx,mailEnv)=>{await makeBetterAuth(tx,mailEnv,surface).api.verifyEmail({query:{token}});return {ok:true}})
  },
  async recovery(token){
   tokenInput(token)
   return transaction(async tx=>{
    const verification=await tx.authVerification.findUnique({where:{identifier:'reset-password:'+token}})
    if(!verification||verification.expiresAt<=new Date())throw new AccessError('RECOVERY_INVALID',400)
    const user=assertAuthUser(await tx.authUser.findUnique({where:{id:verification.value}}))
    if(!user.emailVerified)throw new AccessError('EMAIL_CONFIRMATION_REQUIRED',403)
    return {user:publicAuthUser(user),session:{user:publicAuthUser(user),verificationId:verification.id,expiresAt:verification.expiresAt}}
   })
  },
  async logout(session){if(session?.id)await transaction(tx=>tx.authSession.deleteMany({where:{id:session.id}}))},
  async password(session,password){
   if(typeof password!=='string'||password.length<12||password.length>128)throw new AccessError('INVALID_PASSWORD',400)
   return transaction(async (tx,mailEnv)=>{
    let userId
    if(session?.verificationId){
     const grant=await tx.webSession.findUnique({where:{id:session.webSessionId}})
     const verification=await tx.authVerification.findUnique({where:{id:session.verificationId}})
     if(!grant||grant.verificationId!==session.verificationId||grant.expiresAt<=new Date()||!verification||verification.expiresAt<=new Date()||!verification.identifier.startsWith('reset-password:'))throw new AccessError('RECOVERY_INVALID',400)
     userId=grant.userId
     if(verification.value!==userId)throw new AccessError('RECOVERY_INVALID',400)
     assertAuthUser(await tx.authUser.findUnique({where:{id:userId}}))
     await makeBetterAuth(tx,mailEnv).api.resetPassword({body:{token:verification.identifier.slice(15),newPassword:password}})
    }else{
     const current=await tx.authSession.findUnique({where:{id:session?.id||''}})
     if(!current||current.expiresAt<=new Date())throw new AccessError('SESSION_EXPIRED',401)
     userId=current.userId;assertAuthUser(await tx.authUser.findUnique({where:{id:userId}}))
     const credential=await tx.authAccount.findFirst({where:{userId,providerId:'credential'}})
     if(!credential)throw new AccessError('ACCOUNT_UNAVAILABLE',403)
     await tx.authAccount.update({where:{id:credential.id},data:{password:await passwordHash(password)}})
    }
    await tx.webSession.deleteMany({where:{userId}})
    await tx.authSession.deleteMany({where:{userId}})
    await tx.authVerification.deleteMany({where:{value:userId,identifier:{startsWith:'reset-password:'}}})
    return {providerRevoked:true}
   })
  },
 }
}
