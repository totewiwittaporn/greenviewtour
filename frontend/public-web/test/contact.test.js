import test from 'node:test'
import assert from 'node:assert/strict'
import {inquiryMessage,isPausedContactLink} from '../src/features/company/inquiry.js'
test('inquiries preserve trip context in both languages without claiming a booking',()=>{
 for(const locale of ['th','en']){
  const value=inquiryMessage({tour:'Surin',promotion:'Family',date:'2026-10-12',adults:'2',children:'0'},locale)
  for(const expected of ['Surin','Family','2026-10-12','2','0'])assert.ok(value.includes(expected))
  assert.match(value,locale==='en'?/not a confirmed booking/:/ยังไม่ใช่การยืนยันการจอง/)
 }
 assert.doesNotMatch(inquiryMessage(),/undefined|null|false/)
})
test('legacy CMS destinations redirect to contact while staff and public links remain usable',()=>{
 for(const value of ['https://member.greenviewtour.com/tours','http://localhost:5175/tours','//member.greenviewtour.com','/member/tours','/checkout','/payment','/register','/login'])assert.equal(isPausedContactLink(value),true,value)
 for(const value of ['/tours','/contact-us','/information','https://www.instagram.com/greenviewtour/'])assert.equal(isPausedContactLink(value),false,value)
})
