import test from 'node:test'
import assert from 'node:assert/strict'
import { bookingPrintDetails, compactGroupName, manifestPrograms, printRemarks } from '../../packages/contracts/job-print.js'
import { jobBooking } from '../src/modules/operations/dispatch.js'
const line = (category, data={}) => ({selected:true,snapshot:{category,...data}})
test('print services preserve explicit tent ownership, bungalow and day-specific meals',()=>{
 const b={lines:[line('ACCOMMODATION',{accommodationType:'STANDARD_TENT',ownership:'PARK'}),line('MEAL',{mealPeriod:'LUNCH',day:1}),line('MEAL',{mealPeriod:'BREAKFAST',day:2})]}
 assert.deepEqual(bookingPrintDetails(b),{accommodation:'NP',meals:'1:L / 2:B',flags:[]})
 assert.equal(bookingPrintDetails({lines:[line('ACCOMMODATION',{accommodationType:'BUNGALOW'})]}).accommodation,'BUN')
 assert.equal(bookingPrintDetails({lines:[line('ACCOMMODATION',{accommodationType:'AC_TENT',ownership:'GREENVIEW'})]}).accommodation,'GV')
})
test('explicit exclusions, vegan and vegetarian remain distinct; no service inferred from print code',()=>{
 assert.deepEqual(bookingPrintDetails({programPrintCode:'DT',specialRequirements:['OWN_TENT','NO_MEALS','VEGAN','VEGETARIAN','NO_PARK_FEE'],lines:[]}),{accommodation:'CT',meals:'SELF',flags:['VGN','VEG','NO-PARK']})
 assert.equal(bookingPrintDetails({}).meals,'?');assert.equal(bookingPrintDetails({lines:[]}).meals,'-')
 assert.equal(bookingPrintDetails({lines:[{...line('MEAL',{mealPeriod:'LUNCH'}),selected:false}]}).meals,'-')
})
test('group truncation is presentation-only and does not split Thai graphemes',()=>{
 const name='ครอบครัวทดสอบชื่อยาวมาก'.repeat(10),result=compactGroupName(name,20)
 assert.ok(result.endsWith('…'));assert.equal([...new Intl.Segmenter('th',{granularity:'grapheme'}).segment(result)].length,20)
 assert.ok(name.length>result.length);assert.equal(compactGroupName('Family A'),'Family A')
})
test('allergy and assistance instructions are never truncated or replaced by code only',()=>{
 const details='Peanut allergy. Avoid cross-contact. '.repeat(30)
 assert.ok(printRemarks({booking:{allergies:details,assistance:'Wheelchair',allergyStatus:'HAS'}}).includes(details))
 assert.match(printRemarks({booking:{allergyStatus:'UNKNOWN'}}),/not checked/)
 assert.equal(printRemarks({booking:{allergyStatus:'NONE'}}),'')
})
test('program identities remain separate when abbreviations collide',()=>{
 const runs=[{assignments:[{booking:{programId:'a',programName:'Classic',programPrintCode:'DT'}},{booking:{programId:'b',programName:'Family',programPrintCode:'DT'}}]}]
 const labels=manifestPrograms(runs);assert.equal(labels.length,2);assert.notEqual(labels[0].code,labels[1].code)
})
test('boat projection uses saved agent alias without exposing prices or full service payloads',()=>{
 const booking={agent:{shortName:'TRAVEL-123'},agentName:'Full agency',trip:{tour:{printCode:'2D1N'}},lines:[line('MEAL',{mealPeriod:'LUNCH',day:1,costPrice:'SECRET'})],programSnapshot:{adultPrice:'SECRET'},status:'CONFIRMED'}
 const projected=jobBooking(booking,'BOAT');assert.equal(projected.agentShortName,'TRAVEL-123');assert.equal(projected.programPrintCode,'2D1N')
 assert.equal(projected.printServices.meals,'1:L');assert.doesNotMatch(JSON.stringify(projected),/SECRET|costPrice/)
 assert.equal(jobBooking(booking,'VEHICLE').printServices,undefined)
})
