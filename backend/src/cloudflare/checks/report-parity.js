import assert from 'node:assert/strict'
import {createD1Prisma} from '../../platform/database/d1-client.ts'
import {readTransaction} from '../../platform/database/read-transaction.js'
import {managementPageSummary} from '../../backoffice/dashboard/overview/management-page.js'
import {bookingPageSummary} from '../../backoffice/dashboard/overview/booking-page.js'
import {dashboardOverview} from '../../backoffice/dashboard/overview/service.js'
import {checkInState} from '../../modules/operations/check-in.js'
import {profileInclude} from '../../modules/identity-access/policy.js'
export async function reportParity(env){
 const db=createD1Prisma(env.DB,{files:env.FILES}),checks=[]
 let stage='profiles'
 try{
  const profiles=await db.userProfile.findMany({where:{status:'ACTIVE'},include:profileInclude})
  const manager=profiles.find(row=>row.roles.some(role=>role.roleCode==='MANAGER'&&role.scope==='COMPANY'))||profiles.find(row=>row.roles.some(role=>role.roleCode==='ADMIN_MANAGER'))
  assert.ok(manager)
  stage='calendar'
  const today='2026-10-10',report=await readTransaction(db,tx=>managementPageSummary(tx,today))
  const bookings=await db.tourBooking.findMany({select:{id:true,status:true,outboundDate:true,returnDate:true,returnStatus:true,adults:true,children:true}})
  for(const day of report.calendar30){
   const matching=bookings.filter(row=>['CONFIRMED','COMPLETED'].includes(row.status)&&(row.outboundDate||(row.returnStatus==='OUR'?row.returnDate:null))?.toISOString().slice(0,10)===day.date)
   assert.equal(day.bookings,matching.length);assert.equal(day.pax,matching.reduce((n,row)=>n+row.adults+row.children,0))
  }
  assert.equal(report.calendar30.length,30);assert.equal(report.monthly.rows.length,6);assert.ok(report.bookingDays.every(day=>day.rows.length<=5))
  checks.push('management SQL aggregates match independent complete 30-day totals')
  stage='booking-dashboard'
  const bookingActor=profiles.find(row=>row.roles.some(role=>['BOOKING','HEAD_BOOKING'].includes(role.roleCode)))
  assert.ok(bookingActor)
  const booking=await readTransaction(db,tx=>bookingPageSummary(tx,bookingActor,today))
  assert.deepEqual(booking.calendar30,report.calendar30)
  assert.ok(booking.rows.length<=10)
  checks.push('booking calendar parity and bounded own/team queue')
  stage='checkin'
  for(const date of ['2026-09-30','2026-10-10','2026-10-26']){
   const complete=await checkInState(db,manager.id,new URLSearchParams({date}))
   const lean=await checkInState(db,manager.id,new URLSearchParams({date,view:'list'}))
   assert.deepEqual(lean.summary,complete.summary);assert.equal(lean.total,complete.total)
   assert.deepEqual(JSON.parse(JSON.stringify(lean.rows)),JSON.parse(JSON.stringify(complete.rows)))
   assert.ok(lean.rows.length<=25)
  }
  checks.push('check-in SQL service-leg counts, page rows and JSON match reference reader')
  stage='role-dashboards'
  const seen=new Set()
  for(const actor of profiles){
   const roles=actor.roles.map(role=>role.roleCode).sort().join(',');if(seen.has(roles))continue
   await dashboardOverview(db,actor.id,new Date('2026-10-10T03:00:00Z'),{surface:'page'});seen.add(roles)
  }
  checks.push('role dashboards execute with fresh permission scope: '+seen.size+' distinct role sets')
  return {checks}
 }catch(error){console.error('REPORT_PARITY_FAILED',stage,error);throw Object.assign(error,{stage})}
 finally{await db.$disconnect()}
}
