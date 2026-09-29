import test from 'node:test'
import assert from 'node:assert/strict'
import {bookingTabs,bookingTab,bookingTabHref,legacyCustomersHref} from '../src/core/navigation/bookingWorkspace.js'
import {workspaceRoute,canUseOperation} from '../src/core/navigation/workspaceRoutes.js'
import {operationGroups} from '../src/features/operations/operationGroups.js'
import {canReadCustomers} from '../../../packages/contracts/access.js'
const actor=(code,company=false,operations={booking:true,islandBooking:true})=>({status:'ACTIVE',roles:[{code,scope:company?'COMPANY':'SELF'}],management:company?{company:true}:null,operations})
test('Booking Manager and company managers handle requests; assistants keep three booking tabs',()=>{
 for(const role of ['MANAGER','ADMIN_MANAGER'])assert.deepEqual(bookingTabs(actor(role,true)).map(t=>t.id),['','DIRECT','AGENT','requests'])
 for(const role of ['BOOKING','HEAD_BOOKING']){
  const user=actor(role);assert.equal(canReadCustomers(user),true)
  assert.deepEqual(bookingTabs(user).map(t=>t.id),role==='HEAD_BOOKING'?['','DIRECT','AGENT','requests']:['','DIRECT','AGENT'])
 }
 assert.equal(canReadCustomers(actor('GUIDE')),false)
 assert.deepEqual(bookingTabs(actor('CAPTAIN',false,{})),[])
})
test('new directory route is independent of company-only catalog permissions',()=>{
 assert.deepEqual(workspaceRoute('/settings/customers/'),{kind:'customers',title:'Customers',path:'/settings/customers'})
 assert.equal(workspaceRoute('/customers').kind,'legacy-customers')
 assert.equal(workspaceRoute('/operations/bookings').entity,'bookings')
 const editorId='11111111-1111-4111-8111-111111111111'
 assert.equal(workspaceRoute('/settings/tours/new').kind,'tour-editor')
 assert.deepEqual(workspaceRoute('/settings/tours/'+editorId),{kind:'tour-editor',entity:'tours',tourId:editorId,title:'Tour program',path:'/settings/tours/'+editorId})
})
test('legacy links preserve their old default dataset and explicit destination',()=>{
 assert.equal(legacyCustomersHref(actor('MANAGER',true)),'/operations/bookings?tab=requests')
 assert.equal(legacyCustomersHref(actor('BOOKING')),'/settings/customers')
 assert.equal(legacyCustomersHref(actor('MANAGER',true),'?tab=customers&q=Ann&page=2'),'/settings/customers?q=Ann&page=2')
 assert.equal(legacyCustomersHref(actor('BOOKING'),'?kind=requests'),'/operations/bookings?tab=requests')
})
test('tab routes preserve each dataset query without carrying booking detail or unrelated filters',()=>{
 assert.equal(bookingTab('?tab=requests&source=AGENT'),'requests')
 assert.equal(bookingTab('?source=DIRECT'),'DIRECT')
 assert.equal(bookingTab('?source=invalid'),'')
 assert.equal(bookingTabHref('requests','?status=DRAFT&q=Ann&page=2&bookingId=one'),'/operations/bookings?q=Ann&page=2&tab=requests')
 assert.equal(bookingTabHref('AGENT','?tab=requests&q=Ann&page=2'),'/operations/bookings?q=Ann&page=2&source=AGENT')
 assert.equal(bookingTabHref(''),'/operations/bookings')
})
test('a company Manager with denied booking reads keeps the pre-existing request workspace, not booking tabs',()=>{
 const user=actor('MANAGER',true,{booking:false,islandBooking:false})
 assert.equal(canUseOperation(user,operationGroups.find(g=>g.id==='booking')),true)
 assert.deepEqual(bookingTabs(user),[{id:'requests',label:'Customer requests'}])
})
