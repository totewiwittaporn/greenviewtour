// Exercise real app login for each isolated account; never print cookies or passwords.
import {assert,TAG,OUT,readFileSync,writeFileSync,saveReport,close,safeError} from './common.mjs'
const credentials=JSON.parse(readFileSync(OUT+'/credentials.private.json','utf8')),sessions=[],results=[]
try{
 assert.equal(credentials.dataset,TAG)
 for(const account of credentials.accounts){
  const member=account.role==='MEMBER',origin=member?'http://localhost:5175':'http://localhost:5174',path=member?'/api/member/login':'/api/auth/login'
  const response=await fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email:account.email,password:account.password}),signal:AbortSignal.timeout(30000)})
  const body=await response.json();assert.equal(response.status,200,account.key+': '+(body.code||'LOGIN_FAILED'))
  const cookie=response.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie,account.key+': session cookie missing')
  const profile=await fetch(origin+(member?'/api/member/profile':'/api/me'),{headers:{Cookie:cookie},signal:AbortSignal.timeout(30000)})
  const me=await profile.json();assert.equal(profile.status,200,account.key+': session lookup failed')
  if(member)assert.equal(me.customer.authUserId||account.id,account.id);else{assert.equal(me.user.id,account.id);assert.ok(me.user.roles.some(r=>(r.code||r.roleCode)===account.role))}
  account.loginVerified=true;account.verifiedAt=new Date().toISOString();sessions.push({key:account.key,role:account.role,id:account.id,origin,cookie});results.push({key:account.key,role:account.role,status:'PASS'})
  writeFileSync(OUT+'/credentials.private.json',JSON.stringify(credentials,null,2),{mode:0o600});writeFileSync('/tmp/greenview-demo45-260925/sessions.private.json',JSON.stringify(sessions),{mode:0o600})
  console.log(JSON.stringify({login:account.key,result:'PASS',role:account.role}));await new Promise(resolve=>setTimeout(resolve,2300))
 }
 saveReport('login-verification',{dataset:TAG,checkedAt:new Date().toISOString(),allPassed:true,results,realLogin:true,emailsSent:0});console.log(JSON.stringify({result:'ALL_LOGINS_PASSED',accounts:results.length}))
}catch(e){saveReport('login-verification',{allPassed:false,results,failedCode:e.code||e.name});safeError(e,'login')}finally{await close()}
