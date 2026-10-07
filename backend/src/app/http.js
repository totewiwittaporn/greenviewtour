import {getBookingPriceReview} from '../modules/operations/bookings.js'
import {userVisibility} from '../modules/identity-access/user-visibility.js'
import {staffLineOnboardingAllowed} from '../platform/line/staff-onboarding.js'
import {previewStaffDailyDigests,prepareStaffDailyDigests,deliverStaffDailyDigest,resendStaffDailyDigest} from '../modules/notifications/staff-digest.js'
import {staffOa} from '../platform/line/staff-config.js'
import {memberSurfacePaused} from '../modules/commerce/member-release.js'
import {listNotifications} from '../modules/notifications/service.js'
import {recordApiFailure} from '../platform/monitoring/api-status.js'
import {recordBookingCollection,reconcileAgentMargin} from '../modules/receivables/collections.js'
import {listCapacityPools,saveCapacityPool,bookingCapacityPreview,bindLegacyBookingWindow} from '../modules/operations/capacity-service.js'
import {publicQuoteAvailability,parseCapacitySelections,staffCustomerCapacity,answerCustomerDate} from '../modules/commerce/service.js'
import {moveBoatGroup} from '../modules/operations/dispatch.js'
import { bookingAssignees, assignBooking } from '../modules/operations/booking-ownership.js'
import { checkInState, checkInCommand } from '../modules/operations/check-in.js'
import {demoCheckout} from '../modules/commerce/demo-checkout.js'
import {listGuideAssignments,guideAssignmentOptions,saveGuideAssignment} from '../modules/operations/guide-assignments.js'
import { previewWebsiteImage, cancelCustomerRequest, saveCustomer, customerDocuments, customerDocument, saveWebsiteImage, websiteImage, commandCustomerRequest, uploadCustomerProof, publicCatalog, publicCompany, publicPopups, customerFor, enrollCustomer, saveCustomerProfile, memberRequests, submitCustomerRequest, listCustomers } from '../modules/commerce/service.js'
import {listReceivables,commandReceivable} from '../modules/receivables/service.js'
import {listEvidence,saveEvidence,downloadEvidence} from '../modules/evidence/service.js'
import { bookingPriceCommand } from '../modules/operations/booking-price.js'
import { documentBrand, dailyBookingDocument } from '../modules/operations/documents.js'
import {listCompanyWork,saveCompanyWork,commandCompanyWork} from '../modules/company-work/service.js'
import {listPersonnelFinance,savePersonnelFinance,commandPersonnelFinance,exportPayroll} from '../modules/personnel-finance/service.js'
import { canConfigureAccess, readUserAccess, saveUserAccess } from '../modules/identity-access/user-access.js'
import { listJobs, dispatchOptions, saveRun, dispatchCommand, bookingOptions } from '../modules/operations/dispatch.js'
import { dailySummaryState, prepareDailySummary } from '../modules/operations/notifications.js'
import { listOperations, saveOperationCatalog } from '../modules/operations/catalog.js'
import { getBlueprint, saveBooking, bookingStatus, tripPreparation, amendBookingDetails, amendBookingReturn } from '../modules/operations/bookings.js'
import { stockCommand, boatPreparation } from '../modules/operations/stock.js'
import { operationMessages } from '../modules/operations/messages.js'
import { listSettings, saveSettings } from '../modules/service-catalog/settings.js'
import { readTourEditor, saveTourEditor } from '../modules/service-catalog/tour-editor.js'
import {readEmployeeOnboarding} from '../modules/identity-access/employee-onboarding.js'
import { assertDeliverableInvitationEmail, canInvite, canResetPassword, listInvitations, createInvitation, changeInvitation, lookupInvitation, acceptInvitation, requestUserReset } from '../modules/identity-access/invitations.js'
import { assignablePrimaryRoles, managementScope, canEditProfile, editProfile, editOwnProfile } from '../modules/identity-access/user-management.js'
import { createHash, timingSafeEqual } from 'node:crypto'
import { listUsers } from '../modules/identity-access/list-users.js'
import { parseUsersQuery } from '../backoffice/settings/users/query.js'
import { AccessError, normalizeEmail, resolveMembership } from '../modules/identity-access/membership.js'
import { profileInclude, publicProfile } from '../modules/identity-access/policy.js'
import { readManuals } from '../backoffice/manuals/service.js'
import { dashboardOverview } from '../backoffice/dashboard/overview/service.js'
import { deniedSessions } from '../platform/auth/sessions.js'
const digest = value => createHash('sha256').update(value).digest()
async function body(req, maxBytes = 8192) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new AccessError('JSON_REQUIRED', 415)
  const chunks=[];let bytes=0
  for await(const chunk of req){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);bytes+=buffer.byteLength;if(bytes>maxBytes)throw new AccessError('REQUEST_TOO_LARGE',413);chunks.push(buffer)}
  const text=Buffer.concat(chunks).toString('utf8')
  try { const value = JSON.parse(text); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); return value }
  catch { throw new AccessError('INVALID_REQUEST', 400) }
}
function password(value, strong = false) {
  if (typeof value !== 'string' || value.length < (strong ? 12 : 1) || value.length > 128) throw new AccessError('INVALID_PASSWORD', 400)
  return value
}
export function createHandler({ pool, prisma, provider, token, port = 5000, users = listUsers, sessions = deniedSessions(), memberSessions: suppliedMemberSessions, throttle, environment='local', workerRuntime=false, allowedOrigins, memberRegression=false, lineOnboarding, sendInvitation }) {
  if ((!workerRuntime&&![5000,5001,8787].includes(port))||!Number.isSafeInteger(port)||port<1||port>65535) throw new Error('INVALID_LOCAL_API_PORT')
  const hosted=workerRuntime&&environment==='production'
  if (!hosted&&(!token || token.length < 32)) throw new Error('LOCAL_API_TOKEN_REQUIRED')
  const hostedOrigins=hosted?Object.values(allowedOrigins||{}).flat():[]
  if(hosted&&(!hostedOrigins.length||hostedOrigins.some(value=>{try{const url=new URL(value);return url.protocol!=='https:'||url.origin!==value}catch{return true}})))throw new Error('PRODUCTION_ORIGINS_REQUIRED')
  const memberSessions=suppliedMemberSessions||sessions.fork?.('gv_member_session')||deniedSessions('gv_member_session')
  const workspaceOrigins=allowedOrigins?.workspace||['http://localhost:5174','http://127.0.0.1:5174']
  const memberOrigins=allowedOrigins?.customer||['http://localhost:5175','http://127.0.0.1:5175']
  const origins=[...workspaceOrigins,...memberOrigins,...(allowedOrigins?.public||['http://localhost:5173','http://127.0.0.1:5173'])]
  let attempts = 0, windowEnd = 0
  return async (req, res) => {
    // Read-only requests share their validated session between onboarding and
    // route authorization. The promise belongs to this invocation only: writes
    // and every subsequent HTTP request still validate current database state.
    let staffAuthentication
    const authenticateStaff=()=>{
      if(!['GET','HEAD'].includes(req.method))return sessions.authenticated(req,provider,pool)
      return staffAuthentication??=sessions.authenticated(req,provider,pool)
    }
    const send = (status, data, cookie) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(data.retryAfterSeconds ? { 'Retry-After': String(data.retryAfterSeconds) } : {}), ...(cookie !== undefined ? { 'Set-Cookie': (String(req.url || '').split('?')[0].startsWith('/api/member/') ? memberSessions : sessions).cookie(cookie) } : {}) })
      res.end(JSON.stringify(data))
    }
    try {
      if(hosted){
        if(!hostedOrigins.some(value=>new URL(value).host===req.headers.host))return send(403,{code:'HOST_DENIED'})
      }else if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) return send(403, { code: 'LOCAL_HOST_REQUIRED' })
      const url = new URL(req.url, `http://127.0.0.1:${port}`)
      if (url.pathname === '/health/live' && req.method === 'GET') return send(200, { status: 'UP', service: 'greenviewtour-local-api' })
      if (req.headers.origin && !origins.includes(req.headers.origin)) return send(403, { code: 'ORIGIN_DENIED' })
      const supplied = req.headers['x-greenview-local-token']
      if (!hosted&&(typeof supplied !== 'string' || !timingSafeEqual(digest(supplied), digest(token)))) return send(401, { code: 'LOCAL_ACCESS_REQUIRED' })
      if (!['GET', 'POST'].includes(req.method)) return send(405, { code: 'METHOD_NOT_ALLOWED' })
      if (req.method === 'POST' && !origins.includes(req.headers.origin)) return send(403, { code: 'ORIGIN_REQUIRED' })
      if(throttle&&req.method==='POST')await throttle(req)
      if (req.method === 'POST'&&!throttle) {
        if (Date.now() > windowEnd) { attempts = 0; windowEnd = Date.now() + 60000 }
        if (++attempts > 30) return send(429, { code: 'LOCAL_RATE_LIMITED', retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - Date.now()) / 1000)) })
      }
      const path = url.pathname
      if(memberSurfacePaused(path,environment,memberRegression))return send(503,{code:'MEMBER_PAUSED'})
      if(path.startsWith('/api/public/')) {
        if(req.method!=='GET')return send(405,{code:'METHOD_NOT_ALLOWED'})
        const imageMatch=path.match(/^\/api\/public\/images\/([0-9a-f-]{36})$/)
        if(imageMatch){const file=await websiteImage(prisma,imageMatch[1]);res.writeHead(200,{'Content-Type':file.mimeType,'Content-Length':file.size,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; sandbox"});return res.end(Buffer.from(file.content))}
        if(path==='/api/public/quote')return send(200,await publicQuoteAvailability(prisma,{tourId:url.searchParams.get('tourId'),serviceDate:url.searchParams.get('serviceDate'),adults:Number(url.searchParams.get('adults')),children:Number(url.searchParams.get('children')),promotionId:url.searchParams.get('promotionId')||null,optionalIds:url.searchParams.getAll('optionalId'),capacitySelections:parseCapacitySelections(url.searchParams.get('capacitySelections'))}))
        if(path==='/api/public/company')return send(200,await publicCompany(prisma))
        if(path==='/api/public/tours')return send(200,await publicCatalog(prisma,url.searchParams))
        if(path==='/api/public/popups')return send(200,await publicPopups(prisma))
        return send(404,{code:'NOT_FOUND'})
      }
      if(path.startsWith('/api/member/')) {
        if(req.headers.origin&&!memberOrigins.includes(req.headers.origin))return send(403,{code:'ORIGIN_DENIED'})
        const memberSend=(data,id)=>{res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(id!==undefined?{'Set-Cookie':memberSessions.cookie(id)}:{})});res.end(JSON.stringify(data))}
        if(path==='/api/member/recover'&&req.method==='POST'){const input=await body(req);await provider.recoverMember(normalizeEmail(input.email));return memberSend({ok:true})}
        if(path==='/api/member/recovery-session'&&req.method==='POST'){
          const input=await body(req),{user,session}=await provider.recovery(input.token)
          await customerFor(prisma,user)
          return memberSend({recovery:true},await memberSessions.replace(req,provider,session,'customer-recovery'))
        }
        if(path==='/api/member/register'&&req.method==='POST'){
          const input=await body(req);await provider.registerMember(normalizeEmail(input.email),password(input.password,true))
          return memberSend({message:'CHECK_EMAIL'})
        }
        if(path==='/api/member/login'&&req.method==='POST'){
          const input=await body(req),{session,user}=await provider.login(normalizeEmail(input.email),password(input.password),'customer')
          try {await enrollCustomer(prisma,user);const customer=await customerFor(prisma,user);return memberSend({customer},await memberSessions.replace(req,provider,session,'customer'))}
          catch(error){await provider.logout(session).catch(()=>{});throw error}
        }
        if(path==='/api/member/logout'&&req.method==='POST'){
          await memberSessions.logout(req,provider);return memberSend({ok:true},'')
        }
        const {user,entry}=await memberSessions.authenticated(req,provider,pool)
        if(path==='/api/member/reset-password'&&req.method==='POST'){
          if(entry.purpose!=='customer-recovery')throw new AccessError('RECOVERY_REQUIRED',403)
          const customer=await customerFor(prisma,user),input=await body(req),next=password(input.password,true)
          const event=await prisma.auditEvent.create({data:{actorId:user.id,targetId:customer.id,action:'member.password.change.requested',details:{}}})
          const outcome=await provider.password(entry.session,next)
          await memberSessions.deleteUser(user.id);await sessions.deleteUser(user.id)
          let recorded=true
          try{await prisma.auditEvent.update({where:{id:event.id},data:{action:'member.password.changed',details:{providerRevoked:outcome.providerRevoked}}})}catch{recorded=false;console.error('MEMBER_PASSWORD_AUDIT_FINALIZATION_PENDING')}
          return memberSend({ok:true,warning:!outcome.providerRevoked||!recorded?'PASSWORD_CHANGED_FOLLOW_UP_REQUIRED':null},'')
        }
        if(path==='/api/member/profile'&&req.method==='GET'&&entry.purpose==='customer-recovery'){await customerFor(prisma,user);return memberSend({recovery:true})}
        if(entry.purpose!=='customer')throw new AccessError('LOGIN_REQUIRED',401)
        if(path==='/api/member/documents'&&req.method==='GET')return memberSend(await customerDocuments(prisma,user,url.searchParams.get('requestId'),Number(url.searchParams.get('page')||1)))
        const docMatch=path.match(/^\/api\/member\/documents\/([0-9a-f-]{36})$/)
        if(docMatch&&req.method==='GET'){const file=await customerDocument(prisma,user,docMatch[1]);res.writeHead(200,{'Content-Type':file.mimeType,'Content-Length':file.size,'Cache-Control':'no-store','Content-Disposition':"inline; filename*=UTF-8''"+encodeURIComponent(file.filename),'X-Content-Type-Options':'nosniff','Content-Security-Policy':file.mimeType==='application/pdf'?"script-src 'none'; base-uri 'none'":"default-src 'none'; sandbox"});return res.end(Buffer.from(file.content))}
        if(path==='/api/member/demo-checkout'&&req.method==='POST')return memberSend(await demoCheckout(prisma,user,await body(req)))
        if(path==='/api/member/date-response'&&req.method==='POST')return memberSend(await answerCustomerDate(prisma,user,await body(req)))
        if(path==='/api/member/cancel'&&req.method==='POST')return memberSend(await cancelCustomerRequest(prisma,user,await body(req)))
        if(path==='/api/member/proof'&&req.method==='POST')return memberSend(await uploadCustomerProof(prisma,user,await body(req,7100000)))
        if(path==='/api/member/profile')return memberSend(req.method==='GET'?{customer:await customerFor(prisma,user)}:await saveCustomerProfile(prisma,user,await body(req)))
        if(path==='/api/member/requests')return memberSend(req.method==='GET'?await memberRequests(prisma,user,url.searchParams):await submitCustomerRequest(prisma,user,await body(req)))
        return send(404,{code:'NOT_FOUND'})
      }
      if(req.headers.origin&&!workspaceOrigins.includes(req.headers.origin))return send(403,{code:'ORIGIN_DENIED'})
      if(lineOnboarding&&!staffLineOnboardingAllowed(path,req.method)){
        const {user,entry}=await authenticateStaff()
        if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401)
        if(await lineOnboarding(user.id))throw new AccessError('LINE_ONBOARDING_REQUIRED',403)
      }
      const previewImageMatch=path.match(/^\/api\/website-images\/([0-9a-f-]{36})$/)
      if(previewImageMatch&&req.method==='GET'){const {user,entry}=await authenticateStaff();if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401);const file=await previewWebsiteImage(prisma,user.id,previewImageMatch[1]);res.writeHead(200,{'Content-Type':file.mimeType,'Content-Length':file.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});return res.end(Buffer.from(file.content))}
      if(path==='/api/website-images'&&req.method==='POST'){const {user,entry}=await authenticateStaff();if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401);return send(200,await saveWebsiteImage(prisma,user.id,await body(req,7100000)))}
      if(path==='/api/guide-assignments'||path==='/api/guide-assignments/options'){const {user,entry}=await authenticateStaff();if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401);if(path.endsWith('/options'))return send(200,await guideAssignmentOptions(prisma,user.id,url.searchParams));return send(200,req.method==='GET'?await listGuideAssignments(prisma,user.id,url.searchParams):await saveGuideAssignment(prisma,user.id,await body(req)))}
      if(path==='/api/customer-profile'&&req.method==='POST'){const {user,entry}=await authenticateStaff();if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401);return send(200,await saveCustomer(prisma,user.id,await body(req)))}
      if(path==='/api/customers'){
        const {user,entry}=await authenticateStaff()
        if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401)
        return send(200,req.method==='GET'?await listCustomers(prisma,user.id,url.searchParams):await commandCustomerRequest(prisma,user.id,await body(req)))
      }
      if (req.method === 'POST' && path.startsWith('/api/auth/')) {
        const input = await body(req)
        if (path === '/api/auth/logout') {
          await sessions.logout(req,provider)
          return send(200, { ok: true }, '')
        }
        if (path === '/api/auth/login') {
          const { session, user } = await provider.login(normalizeEmail(input.email), password(input.password))
          let profile
          try { profile = await resolveMembership(prisma, user) }
          catch (error) {
            if(error.code==='ONBOARDING_REQUIRED'){
              try{const onboarding=await readEmployeeOnboarding(prisma,user);return send(200,{onboarding,redirect:'/onboarding'},await sessions.replace(req,provider,session,'onboarding'))}
              catch(onboardingError){await provider.logout(session).catch(()=>{});throw onboardingError}
            }
            await provider.logout(session).catch(() => {}); throw error
          }
          return send(200, { user: {...publicProfile(profile,user.email),lineOnboardingRequired:lineOnboarding?await lineOnboarding(user.id):false} }, await sessions.replace(req,provider,session))
        }
        if (path === '/api/auth/register') throw new AccessError('INVITE_LINK_REQUIRED', 410)
        if (path === '/api/auth/invitation') {
          const invitation = await lookupInvitation(prisma, input.invitationCode)
          assertDeliverableInvitationEmail(invitation.email)
          return send(200, { email: invitation.email, displayName: invitation.displayName, department: invitation.department, expiresAt: invitation.expiresAt, accepted: Boolean(invitation.acceptedAt) })
        }
        if (path === '/api/auth/accept-invitation') {
          return send(200, await acceptInvitation(prisma, provider, input.invitationCode, password(input.password, true)))
        }
        if (path === '/api/auth/recover') {
          await provider.recover(normalizeEmail(input.email))
          return send(200, { message: 'RECOVERY_REQUESTED' })
        }
        if (path === '/api/auth/recovery-session') {
          const {user,session}=await provider.recovery(input.token)
          const profile=await prisma.userProfile.findUnique({where:{id:user.id}})
          if(!user.email_confirmed_at||profile?.status!=='ACTIVE')throw new AccessError('ACCOUNT_UNAVAILABLE')
          return send(200,{ok:true},await sessions.replace(req,provider,session,'recovery'))
        }
        if (path === '/api/auth/reset-password') {
          const { user, entry } = await authenticateStaff()
          if (entry.purpose !== 'recovery') throw new AccessError('RECOVERY_REQUIRED')
          const profile = await prisma.userProfile.findUnique({ where: { id: user.id } })
          if (profile?.status !== 'ACTIVE') throw new AccessError('ACCOUNT_UNAVAILABLE')
          const nextPassword = password(input.password, true)
          const audit = await prisma.auditEvent.create({ data: { actorId: user.id, targetId: user.id, action: 'password.change.requested', details: {} } })
          const outcome = await provider.password(entry.session, nextPassword)
          await sessions.deleteUser(user.id)
          let auditRecorded = true
          try { await prisma.auditEvent.update({ where: { id: audit.id }, data: { action: 'password.changed', details: { providerRevoked: outcome.providerRevoked } } }) }
          catch { auditRecorded = false; console.error('PASSWORD_CHANGE_AUDIT_FINALIZATION_PENDING') }
          return send(200, { ok: true, warning: !outcome.providerRevoked || !auditRecorded ? 'PASSWORD_CHANGED_FOLLOW_UP_REQUIRED' : null }, '')
        }
        return send(404, { code: 'NOT_FOUND' })
      }
      if (req.method === 'POST' && path === '/api/me/password') {
        const { user, entry } = await authenticateStaff()
        if (entry.purpose !== 'workspace') throw new AccessError('LOGIN_REQUIRED', 401)
        const input = await body(req)
        if (Object.keys(input).some(key => !['currentPassword', 'password'].includes(key))) throw new AccessError('INVALID_REQUEST', 400)
        const currentPassword = password(input.currentPassword), nextPassword = password(input.password, true)
        if (currentPassword === nextPassword) throw new AccessError('PASSWORD_UNCHANGED', 400)
        const profile = await prisma.userProfile.findUnique({ where: { id: user.id } })
        if (profile?.status !== 'ACTIVE') throw new AccessError('ACCOUNT_UNAVAILABLE')
        const verified = await provider.login(user.email, currentPassword)
        try {
          if (verified.user.id !== user.id) throw new AccessError('INVALID_CREDENTIALS', 400)
          const active = await prisma.userProfile.findUnique({ where: { id: user.id } })
          if (active?.status !== 'ACTIVE') throw new AccessError('ACCOUNT_UNAVAILABLE')
          const audit = await prisma.auditEvent.create({ data: { actorId: user.id, targetId: user.id, action: 'password.change.requested', details: { source: 'profile' } } })
          const outcome = await provider.password(verified.session, nextPassword)
          await sessions.deleteUser(user.id)
          let finalized = true
          try { await prisma.auditEvent.update({ where: { id: audit.id }, data: { action: 'password.changed', details: { source: 'profile', providerRevoked: outcome.providerRevoked } } }) }
          catch { finalized = false; console.error('PASSWORD_CHANGE_AUDIT_FINALIZATION_PENDING') }
          return send(200, { ok: true, warning: !outcome.providerRevoked || !finalized ? 'PASSWORD_CHANGED_FOLLOW_UP_REQUIRED' : null }, '')
        } finally { await provider.logout(verified.session).catch(() => {}) }
      }
      if(path==='/api/payroll-export'&&req.method==='GET'){
        const {user,entry}=await authenticateStaff()
        if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401)
        return send(200,await exportPayroll(prisma,user.id,url.searchParams))
      }
      if(path==='/api/notifications'&&req.method==='GET'){const {user,entry}=await authenticateStaff();if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401);return send(200,await listNotifications(prisma,user.id,url.searchParams))}
      if(path==='/api/agent-margin-offset'&&req.method==='POST'){const {user,entry}=await authenticateStaff();if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401);return send(200,await reconcileAgentMargin(prisma,user.id,await body(req,32768)))}
      if(path==='/api/booking-collections'&&req.method==='POST'){
        const {user,entry}=await authenticateStaff()
        if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401)
        return send(200,await recordBookingCollection(prisma,user.id,await body(req,32768)))
      }
      if(path==='/api/receivables'){
        const {user,entry}=await authenticateStaff()
        if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401)
        return send(200,req.method==='GET'?await listReceivables(prisma,user.id,url.searchParams):await commandReceivable(prisma,user.id,await body(req,32768)))
      }
      const evidenceDownload=path.match(/^\/api\/evidence\/([0-9a-f-]{36})$/)
      if(path==='/api/evidence'||evidenceDownload){
        const {user,entry}=await authenticateStaff()
        if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401)
        if(evidenceDownload){
          if(req.method!=='GET')return send(405,{code:'METHOD_NOT_ALLOWED'})
          const file=await downloadEvidence(prisma,user.id,evidenceDownload[1])
          const inlinePdf=url.searchParams.get('view')==='inline'&&file.mimeType==='application/pdf'
          res.writeHead(200,{'Content-Type':file.mimeType,'Content-Length':file.size,'Content-Disposition':(inlinePdf?"inline; filename*=UTF-8''":"attachment; filename*=UTF-8''")+encodeURIComponent(file.filename),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':inlinePdf?"script-src 'none'; base-uri 'none'":"default-src 'none'; sandbox allow-downloads"})
          return res.end(Buffer.from(file.content))
        }
        return send(200,req.method==='GET'?await listEvidence(prisma,user.id,url.searchParams):await saveEvidence(prisma,user.id,await body(req,7100000)))
      }
      const companyMatch=path.match(/^\/api\/(company-work|personnel-finance)(?:\/(save|command))?$/)
      if(companyMatch){
        const {user,entry}=await authenticateStaff()
        if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401)
        const finance=companyMatch[1]==='personnel-finance'
        if(req.method==='GET'&&!companyMatch[2])return send(200,await(finance?listPersonnelFinance:listCompanyWork)(prisma,user.id,url.searchParams))
        if(req.method==='POST'&&companyMatch[2])return send(200,await(companyMatch[2]==='save'?(finance?savePersonnelFinance:saveCompanyWork):(finance?commandPersonnelFinance:commandCompanyWork))(prisma,user.id,await body(req,131072)))
        return send(405,{code:'METHOD_NOT_ALLOWED'})
      }
      const operationMatch = path.match(/^\/api\/operations\/([a-z-]+)$/)
      if (operationMatch) {
        const { user, entry } = await authenticateStaff()
        if (entry.purpose !== 'workspace') throw new AccessError('LOGIN_REQUIRED', 401)
        const entity = operationMatch[1]
        if(entity==='staff-digests'){
          // Ordinary Local exposes preparation/simulation only, never a live-send switch.
          const config={channelKey:'live:'+staffOa.providerId+':'+staffOa.channelId,enabled:false,mode:'disabled',liveEnabled:false}
          if(req.method==='GET')return send(200,await previewStaffDailyDigests(prisma,{actorId:user.id,serviceDate:url.searchParams.get('date'),config}))
          if(req.method!=='POST')return send(405,{code:'METHOD_NOT_ALLOWED'})
          const input=await body(req,4096)
          if(!input||typeof input!=='object'||Array.isArray(input)||!['prepare','simulate','resend'].includes(input.action)||Object.keys(input).some(key=>!(input.action==='prepare'?['action','serviceDate']:input.action==='resend'?['action','id','commandId']:['action','id']).includes(key)))throw new AccessError('INVALID_INPUT',400)
          if(input.action==='prepare')return send(200,await prepareStaffDailyDigests(prisma,{actorId:user.id,serviceDate:input.serviceDate,config,mode:'simulation'}))
          if(input.action==='resend')return send(200,await resendStaffDailyDigest(prisma,{actorId:user.id,id:input.id,commandId:input.commandId,config,mode:'simulation'}))
          return send(200,await deliverStaffDailyDigest(prisma,{actorId:user.id,id:input.id,config,mode:'simulation'}))
        }
        if(entity==='booking-price-review'&&req.method==='GET')return send(200,await getBookingPriceReview(prisma,user.id,url.searchParams.get('bookingId')))
        if(entity==='capacity'&&req.method==='GET')return send(200,await listCapacityPools(prisma,user.id,url.searchParams))
        if(entity==='customer-capacity'&&req.method==='GET')return send(200,await staffCustomerCapacity(prisma,user.id,url.searchParams))
        if(entity==='capacity-check'&&req.method==='GET')return send(200,await bookingCapacityPreview(prisma,user.id,Object.fromEntries(url.searchParams)))
        if (req.method === 'GET') return send(200, entity === 'booking-assignees' ? await bookingAssignees(prisma,user.id,url.searchParams) : entity === 'check-in' ? await checkInState(prisma,user.id,url.searchParams) : entity === 'document-brand' ? await documentBrand(prisma) : entity === 'booking-document' ? await dailyBookingDocument(prisma,user.id,url.searchParams.get('date')) : entity === 'daily-summary' ? await dailySummaryState(prisma,user.id,url.searchParams.get('date'),process.env,Number(url.searchParams.get('page')||1),{view:url.searchParams.get('view'),snapshotId:url.searchParams.get('snapshotId')}) : entity === 'jobs' ? await listJobs(prisma,user.id,url.searchParams) : entity === 'dispatch-options' ? await dispatchOptions(prisma,user.id,url.searchParams) : entity === 'booking-options' ? await bookingOptions(prisma,user.id,url.searchParams) : entity === 'boat-preparation' ? await boatPreparation(prisma,user.id,url.searchParams) : entity === 'preparation' ? await tripPreparation(prisma,user.id,url.searchParams) : entity === 'blueprint' ? await getBlueprint(prisma,user.id,url.searchParams) : await listOperations(prisma,user.id,entity,url.searchParams))
        const input = await body(req,131072)
        if(entity==='capacity'&&req.method==='POST')return send(200,await saveCapacityPool(prisma,user.id,input))
        if(entity==='capacity-check'&&req.method==='POST')return send(200,await bookingCapacityPreview(prisma,user.id,input))
        if(entity==='bind-booking-window'&&req.method==='POST')return send(200,await bindLegacyBookingWindow(prisma,user.id,input))
        if(entity==='move-boat-group'&&req.method==='POST')return send(200,await moveBoatGroup(prisma,user.id,input))
        return send(200, entity === 'booking-assignment' ? await assignBooking(prisma,user.id,input) : entity === 'check-in' ? await checkInCommand(prisma,user.id,input) : entity === 'daily-summary' ? await prepareDailySummary(prisma,user.id,input) : entity === 'runs' ? await saveRun(prisma,user.id,input) : entity === 'dispatch-command' ? await dispatchCommand(prisma,user.id,input) : entity === 'stock-command' ? await stockCommand(prisma,user.id,input) : entity === 'booking-return' ? await amendBookingReturn(prisma,user.id,input) : entity === 'booking-details' ? await amendBookingDetails(prisma,user.id,input) : entity === 'booking-price' ? await bookingPriceCommand(prisma,user.id,input) : entity === 'booking-status' ? await bookingStatus(prisma,user.id,input) : entity === 'bookings' ? await saveBooking(prisma,user.id,input) : await saveOperationCatalog(prisma,user.id,entity,input))
      }
      const tourEditorMatch = path.match(/^\/api\/settings\/tours\/([0-9a-f-]{36})\/editor$/i)
      if (tourEditorMatch) {
        const { user, entry } = await authenticateStaff()
        if (entry.purpose !== 'workspace') throw new AccessError('LOGIN_REQUIRED', 401)
        return send(200, req.method === 'GET'
          ? await readTourEditor(prisma, user.id, tourEditorMatch[1])
          : await saveTourEditor(prisma, user.id, tourEditorMatch[1], await body(req, 2097152)))
      }
      const settingsMatch = path.match(/^\/api\/settings\/(company|partners|tours|seasons|promotions|popups|rates|agreements|locations|vehicles|channels)$/)
      if (settingsMatch) {
        const { user, entry } = await authenticateStaff()
        if (entry.purpose !== 'workspace') throw new AccessError('LOGIN_REQUIRED', 401)
        return send(200, req.method === 'GET'
          ? await listSettings(prisma, user.id, settingsMatch[1], url.searchParams)
          : await saveSettings(prisma, user.id, settingsMatch[1], await body(req, 32768)))
      }
      const invitationMatch = path.match(/^\/api\/invitations\/([0-9a-f-]{36})\/(renew|revoke)$/)
      const resetMatch = path.match(/^\/api\/users\/([0-9a-f-]{36})\/reset-password$/)
      if (path === '/api/invitations' || invitationMatch || resetMatch || (path === '/api/me/profile' && req.method === 'POST')) {
        const { user, entry } = await authenticateStaff()
        if (entry.purpose !== 'workspace') throw new AccessError('LOGIN_REQUIRED', 401)
        if (req.method === 'GET' && path === '/api/invitations') return send(200, await listInvitations(prisma, user.id, url.searchParams))
        if (req.method !== 'POST') return send(405, { code: 'METHOD_NOT_ALLOWED' })
        const input = await body(req, path === '/api/me/profile' ? 32768 : 8192)
        if (path === '/api/me/profile') return send(200, await editOwnProfile(prisma, user.id, input))
        if (resetMatch) return send(200, await requestUserReset(prisma, provider, user.id, resetMatch[1]))
        if (invitationMatch) {
          const result=await changeInvitation(prisma,user.id,invitationMatch[1],invitationMatch[2])
          return send(200,invitationMatch[2]==='renew'&&sendInvitation?await sendInvitation(result):{invitation:result.invitation})
        }
        if(!sendInvitation)throw new AccessError('INVITATION_EMAIL_UNAVAILABLE',503)
        return send(201,await sendInvitation(await createInvitation(prisma,user.id,input)))
      }
      const accessMatch = path.match(/^\/api\/users\/([0-9a-f-]{36})\/access$/)
      if(accessMatch) {
        const {user,entry}=await authenticateStaff()
        if(entry.purpose!=='workspace')throw new AccessError('LOGIN_REQUIRED',401)
        return send(200,req.method==='GET'?await readUserAccess(prisma,user.id,accessMatch[1]):await saveUserAccess(prisma,user.id,accessMatch[1],await body(req,32768)))
      }
      const editMatch = path.match(/^\/api\/users\/([0-9a-f-]{36})\/profile$/)
      if (req.method === 'POST' && editMatch) {
        const { user, entry } = await authenticateStaff()
        if (entry.purpose !== 'workspace') throw new AccessError('LOGIN_REQUIRED',401)
        return send(200, await editProfile(prisma,user.id,editMatch[1],await body(req, 32768)))
      }
      if (req.method !== 'GET') return send(405, { code: 'METHOD_NOT_ALLOWED' })
      if (path === '/api/auth/recovery-status') {
        const { entry } = await authenticateStaff()
        if (entry.purpose !== 'recovery') throw new AccessError('RECOVERY_REQUIRED')
        return send(200, { ok: true })
      }
      if (!['/api/me', '/api/users', '/api/dashboard', '/api/manuals'].includes(path)) return send(404, { code: 'NOT_FOUND' })
      const { user, entry } = await authenticateStaff()
      if (entry.purpose !== 'workspace') throw new AccessError('LOGIN_REQUIRED', 401)
      if (path === '/api/dashboard') return send(200, await dashboardOverview(prisma, user.id, new Date(), {surface:'page'}))
      const profile = await prisma.userProfile.findUnique({ where: { id: user.id }, include: profileInclude })
      if (profile?.status !== 'ACTIVE') throw new AccessError('ACCOUNT_UNAVAILABLE')
      if (path === '/api/manuals') { if(req.method!=='GET')return send(405,{code:'METHOD_NOT_ALLOWED'});return send(200,readManuals(profile,url.searchParams.get('role'))) }
      if (path === '/api/me') return send(200, { user: {...publicProfile(profile,user.email),lineOnboardingRequired:lineOnboarding?await lineOnboarding(user.id):false} })
      const scope = managementScope(profile)
      if (!scope) throw new AccessError('PERMISSION_DENIED')
      let filters
      try { filters = parseUsersQuery(url.searchParams) } catch { throw new AccessError('INVALID_FILTER', 400) }
      const directory = await users(pool, { ...filters, department: scope.department, visibility:userVisibility(profile) })
      directory.users = directory.users.map(target => ({ ...target, canConfigureAccess:canConfigureAccess(profile,target), canEdit: canEditProfile(profile,target), canResetPassword: canResetPassword(profile,target) }))
      return send(200, { ...directory, canChangeDepartment: scope.company, primaryRoles:assignablePrimaryRoles(profile), canInvite: canInvite(profile), database: 'UP', environment })
    } catch (error) {
      if (error instanceof AccessError) return send(error.status, { code: error.code, ...(error.retryAfterSeconds?{retryAfterSeconds:error.retryAfterSeconds}:{}), ...(operationMessages[error.code] ? { message: operationMessages[error.code] } : {}) }, error.status === 401 ? '' : undefined)
      recordApiFailure(error,req.method)
      // Do not log messages, SQL, headers, bodies or query strings containing user data.
      console.error(JSON.stringify({ event: 'API_REQUEST_FAILED', method: req.method,
        path: String(req.url || '').split('?')[0].slice(0, 120),
        errorType: /^[A-Za-z]{1,60}$/.test(error?.name || '') ? error.name : 'Error',
        errorCode: /^(P\d{4}|[0-9A-Z]{5}|E[A-Z_]{2,30})$/.test(error?.code || '') ? error.code : 'UNCLASSIFIED' }))
      return send(503, { code: 'SERVICE_UNAVAILABLE' })
    }
  }
}
