import {AccessError} from '../../../modules/identity-access/membership.js'
import {exchangeEmployeeInvite,readEmployeeOnboarding,saveEmployeeInformation,saveEmployeePassword} from '../../../modules/identity-access/employee-onboarding.js'
import {boundedAuthBody} from './request-body.js'
import {consumeRate} from './rate-limit.js'
import {createStaffLogin,staffLoginSettings} from '../../line/staff-login.js'
export async function employeeOnboardingApi(request,{db,database,env,sessions,provider,address,lineLogin}){
 const path=new URL(request.url).pathname
 if(!['GET','POST'].includes(request.method))throw new AccessError('METHOD_NOT_ALLOWED',405)
 const reply=(data,cookie)=>Response.json(data,{headers:{'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff',...(cookie?{'set-cookie':sessions.cookie(cookie)}:{})}})
 if(request.method==='POST')await consumeRate(database,'onboarding:'+address,{maximum:40,seconds:600})
 if(path==='/api/onboarding/exchange'&&request.method==='POST'){
  const {input}=await boundedAuthBody(request)
  if(Object.keys(input).some(k=>k!=='invitationCode'))throw new AccessError('INVALID_REQUEST',400)
  const result=await exchangeEmployeeInvite(db,input.invitationCode)
  return reply(result.onboarding,await sessions.replace({headers:{cookie:request.headers.get('cookie')}},provider,result.session,'onboarding'))
 }
 const auth=await sessions.authenticated({headers:{cookie:request.headers.get('cookie')}})
 if(auth.entry.purpose==='workspace'&&path==='/api/onboarding'&&request.method==='GET')return reply({state:'ACTIVE',redirect:'/dashboard'})
 if(auth.entry.purpose!=='onboarding')throw new AccessError('LOGIN_REQUIRED',401)
 const login=lineLogin||createStaffLogin(db,staffLoginSettings(env))
 if(path==='/api/onboarding'&&request.method==='GET')return reply({...await readEmployeeOnboarding(db,auth.user),line:login.readiness()})
 if(request.method!=='POST')throw new AccessError('NOT_FOUND',404)
 const {input}=await boundedAuthBody(request)
 if(path==='/api/onboarding/profile')return reply(await saveEmployeeInformation(db,auth.user,input))
 if(path==='/api/onboarding/password')return reply(await saveEmployeePassword(db,auth.user,input))
 if(path==='/api/onboarding/line/start'){
  if(Object.keys(input).length)throw new AccessError('INVALID_REQUEST',400)
  return reply(await login.start(auth.user,auth.entry.session.webSessionId))
 }
 if(path==='/api/onboarding/line/finish')return reply(await login.finish(auth.user,auth.entry.session.webSessionId,input))
 throw new AccessError('NOT_FOUND',404)
}
