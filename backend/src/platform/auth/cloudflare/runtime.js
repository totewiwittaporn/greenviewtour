import {betterAuth} from 'better-auth/minimal'
import {prismaAdapter} from 'better-auth/adapters/prisma'
import {hashPassword,verifyPassword} from 'better-auth/crypto'
import {compare as compareBcrypt} from 'bcryptjs'
import {randomUUID} from 'node:crypto'
import {AccessError} from '../../../modules/identity-access/membership.js'
import {createAuthMail} from './mail.js'
export const sessionSeconds=8*60*60
export function authSettings(env){
 if(!['local','production'].includes(env.APP_ENV))throw new Error('AUTH_ENVIRONMENT_REQUIRED')
 if(typeof env.AUTH_SECRET!=='string'||env.AUTH_SECRET.length<48)throw new Error('AUTH_SECRET_REQUIRED')
 const local=env.APP_ENV==='local'
 const origins={workspace:env.BACKOFFICE_ORIGIN||(local?'http://localhost:5174':''),customer:env.MEMBER_ORIGIN||(local?'http://localhost:5175':''),public:env.PUBLIC_ORIGIN||(local?'http://localhost:5173':'')}
 for(const value of Object.values(origins)){
  const url=new URL(value)
  if(url.origin!==value||url.username||url.password||(!local&&url.protocol!=='https:')||(local&&!['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('AUTH_ORIGIN_INVALID')
 }
 return {local,origins,secret:env.AUTH_SECRET}
}
export async function verifyCompatiblePassword({hash,password}){
 if(typeof password!=='string'||password.length>128||typeof hash!=='string')return false
 if(/^\$2[aby]\$/.test(hash)){
  if(new TextEncoder().encode(password).length>72)return false
  return compareBcrypt(password,hash.replace(/^\$2y\$/,'$2b$'))
 }
 return verifyPassword({hash,password})
}
export const passwordHash=hashPassword
export const publicAuthUser=user=>({id:user.id,email:user.email,email_confirmed_at:user.emailVerified?user.updatedAt:null,created_at:user.sourceCreatedAt??user.createdAt})
export function assertAuthUser(user){
 if(!user||user.disabled||(user.bannedUntil&&+new Date(user.bannedUntil)>Date.now()))throw new AccessError('ACCOUNT_UNAVAILABLE',403)
 return user
}
export function authError(error){
 if(error instanceof AccessError)return error
 const code=error.body?.code||error.code
 const mapping={INVALID_EMAIL_OR_PASSWORD:'INVALID_CREDENTIALS',INVALID_PASSWORD:'INVALID_CREDENTIALS',EMAIL_NOT_VERIFIED:'EMAIL_CONFIRMATION_REQUIRED',USER_ALREADY_EXISTS:'ACCOUNT_ALREADY_EXISTS',USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:'ACCOUNT_ALREADY_EXISTS',INVALID_TOKEN:'RECOVERY_INVALID',TOKEN_EXPIRED:'RECOVERY_INVALID',PASSWORD_TOO_SHORT:'INVALID_PASSWORD',PASSWORD_TOO_LONG:'INVALID_PASSWORD'}
 if(mapping[code])return new AccessError(mapping[code],code==='EMAIL_NOT_VERIFIED'?403:400)
 if(error.statusCode>=400&&error.statusCode<500)return new AccessError('AUTH_FAILED',400)
 return error
}
export function makeBetterAuth(db,env,surface='workspace'){
 const config=authSettings(env),origin=config.origins[surface]
 if(!origin)throw new Error('AUTH_SURFACE_REQUIRED')
 const mail=createAuthMail(db,env,config,surface)
 return betterAuth({
  appName:'Greenview Tour',baseURL:config.origins.workspace,basePath:'/api/_auth',secret:config.secret,
  database:prismaAdapter(db,{provider:'sqlite',transaction:true}),
  trustedOrigins:Object.values(config.origins),logger:{disabled:true},rateLimit:{enabled:false},
  advanced:{database:{generateId:()=>randomUUID()},useSecureCookies:!config.local},
  user:{modelName:'AuthUser',additionalFields:{disabled:{type:'boolean',defaultValue:false,input:false},bannedUntil:{type:'date',required:false,input:false},sourceCreatedAt:{type:'date',required:false,input:false}}},
  session:{modelName:'AuthSession',expiresIn:sessionSeconds,updateAge:0,cookieCache:{enabled:false}},
  account:{modelName:'AuthAccount',accountLinking:{enabled:false}},verification:{modelName:'AuthVerification'},
  emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,autoSignIn:false,requireEmailVerification:true,revokeSessionsOnPasswordReset:true,resetPasswordTokenExpiresIn:900,
   password:{hash:hashPassword,verify:verifyCompatiblePassword},
   sendResetPassword:async({user,token})=>mail('reset',user,token),
  },
  emailVerification:{sendOnSignUp:true,sendOnSignIn:true,autoSignInAfterVerification:false,expiresIn:3600,sendVerificationEmail:async({user,token})=>mail('verify',user,token)},
 })
}
