// Preview-only Auth fixtures with parameterized bcrypt SQL; no signup emails.
// No Admin API secret is configured. Normal Supabase and application login must be tested.
import {assert,staff,customers,id,TAG,OUT,pool,requireApply,existsSync,readFileSync,writeFileSync,randomBytes,stage,actor,close,safeError,saveReport} from './common.mjs'
const all=[...staff,...customers]
try{
 requireApply();const file=OUT+'/credentials.private.json'
 let credentials
 if(existsSync(file)){credentials=JSON.parse(readFileSync(file,'utf8'));assert.equal(credentials.dataset,TAG)}else{
  const collisions=await pool.query('SELECT id FROM auth.users WHERE id=ANY($1::uuid[])',[all.map(a=>a.id)])
  assert.equal(collisions.rowCount,0,'Accounts exist but original credentials are missing; never reset automatically.')
  credentials={dataset:TAG,previewOnly:true,mailboxes:false,accounts:all.map(a=>({...a,password:'Gv9!'+randomBytes(18).toString('base64url'),loginVerified:false}))}
  writeFileSync(file,JSON.stringify(credentials,null,2),{mode:0o600,flag:'wx'})
 }
 const admin=await actor(),client=await pool.connect()
 try{
  await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(7082027)')
  for(const a of credentials.accounts){
   assert.equal(a.id,id(a.role==='MEMBER'?'member-auth-'+a.key.split('-').at(-1):'staff-'+a.key));assert.ok(a.email.endsWith('@greenviewtour.test'))
   const old=await client.query('SELECT id,email,raw_user_meta_data FROM auth.users WHERE id=$1 OR lower(email)=lower($2)',[a.id,a.email])
   if(old.rowCount){assert.equal(old.rowCount,1);assert.equal(old.rows[0].id,a.id);assert.equal(old.rows[0].raw_user_meta_data?.demo_dataset,TAG);continue}
   await client.query(`INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change,email_change_token_current,reauthentication_token,phone_change,phone_change_token,is_super_admin,is_sso_user,is_anonymous)
    VALUES ('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated',$2,extensions.crypt($3,extensions.gen_salt('bf',12)),now(),$4::jsonb,$5::jsonb,now(),now(),'','','','','','','','',false,false,false)`,[a.id,a.email,a.password,JSON.stringify({provider:'email',providers:['email']}),JSON.stringify({display_name:a.displayName,demo_dataset:TAG})])
   await client.query(`INSERT INTO auth.identities (id,provider_id,user_id,identity_data,provider,created_at,updated_at) VALUES ($1,$2,$3,$4::jsonb,'email',now(),now())`,[id('identity-'+a.key),a.id,a.id,JSON.stringify({sub:a.id,email:a.email,email_verified:true,phone_verified:false,demo_dataset:TAG})])
  }
  await client.query('COMMIT')
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 await stage('staff',async tx=>{
  for(const a of staff){assert.equal(await tx.userProfile.count({where:{id:a.id}}),0);await tx.userProfile.create({data:{id:a.id,displayName:a.displayName,nickname:a.key,department:a.department,status:'ACTIVE',roles:{create:{roleCode:a.role,scope:'SELF'}}}})}
  for(const a of customers)await tx.customerProfile.create({data:{id:a.customerId,authUserId:a.id,displayName:a.displayName,email:a.email,phone:'0000000000',status:'ACTIVE'}})
  await tx.auditEvent.create({data:{actorId:admin,action:'demo45.accounts.seeded',details:{dataset:TAG,staff:staff.length,members:customers.length,method:'preview-fixture-bcrypt',emailsSent:0}}})
  return {staff:staff.length,members:customers.length}
 })
 const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
 const rows=credentials.accounts.map(a=>`<tr><td>${esc(a.displayName)}</td><td>${esc(a.role)}</td><td>${esc(a.email)}</td><td><code>${esc(a.password)}</code></td><td>${a.role==='MEMBER'?'http://localhost:5175':'http://localhost:5174/login'}</td></tr>`).join('')
 writeFileSync(OUT+'/LOGIN-ACCOUNTS.private.html',`<!doctype html><meta charset="utf-8"><title>Greenview DEMO login accounts — PRIVATE</title><style>body{font:15px system-ui;max-width:1500px;margin:36px auto;padding:0 24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:10px;text-align:left}code{white-space:nowrap}h1{font-size:25px}</style><h1>Greenview Tour · บัญชีทดสอบ DEMO 45D</h1><p>PRIVATE · Preview only · 26 staff + 3 member accounts. Test email identifiers only; no inbox or reset email. No real employee credentials. Do not commit or share publicly.</p><p>อีเมลเหล่านี้เป็นชื่อบัญชีทดสอบสำหรับ Login ไม่ใช่กล่องรับเมลจริง</p><table><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Password</th><th>Local login</th></tr></thead><tbody>${rows}</tbody></table>`,{mode:0o600})
 saveReport('accounts-summary',{staff:staff.length,memberAccounts:customers.length,roles:staff.reduce((r,a)=>(r[a.role]=(r[a.role]||0)+1,r),{}),passwordFile:'LOGIN-ACCOUNTS.private.html',mailboxes:false,loginVerified:false})
 console.log(JSON.stringify({result:'PROVISIONED',staff:staff.length,members:customers.length,credentials:'private file on Mac; no passwords logged',login:'verification pending'}))
}catch(e){safeError(e,'accounts')}finally{await close()}
