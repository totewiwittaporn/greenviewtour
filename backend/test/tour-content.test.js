import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {emptyTourContent, legacyTourPublicFields, validateTourContent} from '../../packages/contracts/tour-content.js'
import {initialValues,validateCatalog} from '../../packages/contracts/catalog.js'
import {publicTourSelect} from '../src/modules/commerce/service.js'
import {readTourEditor} from '../src/modules/service-catalog/tour-editor.js'

const id=()=>randomUUID()
const content=()=>({th:emptyTourContent(),en:emptyTourContent()})
test('tour content validates localized copy and structured lists without inventing translations',()=>{
 const localized=content();localized.th.summary='ทัวร์เกาะสุรินทร์';localized.en.summary='Surin Islands tour'
 const payload={content:localized,highlights:[{id:id(),status:'ACTIVE',sortOrder:0,titleTh:'ทะเลสวย',titleEn:'Clear seas'}],itinerary:[{id:id(),status:'ACTIVE',sortOrder:0,day:1,timeLabel:'08:00',titleTh:'ออกเรือ',titleEn:'Depart'}],faqs:[{id:id(),status:'ACTIVE',sortOrder:0,questionTh:'รวมอาหารไหม?',answerTh:'รวมตามโปรแกรม',questionEn:'Is lunch included?',answerEn:'As listed in the program.'}],media:[{id:id(),status:'ACTIVE',sortOrder:0,kind:'HERO',url:'https://example.com/hero.webp',altTh:'เกาะสุรินทร์',altEn:'Surin Islands'}]}
 const result=validateTourContent(payload)
 assert.deepEqual(result.errors,{})
 assert.equal(result.data.content.en.summary,'Surin Islands tour')
 assert.equal(result.data.itinerary[0].day,1)
})
test('tour content rejects unsafe media, duplicate records and multiple active hero images',()=>{
 const duplicate=id(),result=validateTourContent({content:content(),highlights:[{id:duplicate,status:'ACTIVE',sortOrder:0,titleTh:'หนึ่ง'},{id:duplicate,status:'ACTIVE',sortOrder:1,titleTh:'สอง'}],itinerary:[],faqs:[],media:[{id:id(),status:'ACTIVE',sortOrder:0,kind:'HERO',url:'javascript:alert(1)'},{id:id(),status:'ACTIVE',sortOrder:1,kind:'HERO',url:'https://example.com/two.jpg'}]})
 assert.ok(result.errors['highlights.1.id'])
 assert.ok(result.errors['media.0.url'])
 assert.ok(result.errors.media)
})
test('compatibility projection feeds current Public fields from authored Thai content and structured media',()=>{
 const localized=content();localized.th.summary='เกริ่นนำ';localized.th.fees='ค่าอุทยานชำระเพิ่ม'
 const hero='https://example.com/hero.jpg',fields=legacyTourPublicFields({description:'legacy',fees:'legacy fee',imageUrls:'legacy.jpg'},localized,[{status:'ACTIVE',sortOrder:0,titleTh:'ดำน้ำ'}],[{status:'ACTIVE',sortOrder:0,day:1,timeLabel:'08:30',titleTh:'ออกเรือ',locationTh:'คุระบุรี',descriptionTh:'ไปเกาะสุรินทร์'}],[{status:'ACTIVE',sortOrder:0,kind:'HERO',url:hero}])
 assert.equal(fields.description,'เกริ่นนำ');assert.equal(fields.highlights,'ดำน้ำ');assert.match(fields.route,/08:30 · ออกเรือ · คุระบุรี/);assert.equal(fields.fees,'ค่าอุทยานชำระเพิ่ม');assert.equal(fields.imageUrls,hero)
})
test('partner verification stays internal and Greenview ownership clears stale partner data',()=>{
 const partner={...initialValues('tours'),id:id(),version:0,code:'P',name:'Partner tour',ownership:'PARTNER',operatorId:id(),partnerSourceUrl:'https://partner.example/terms',partnerTermsVerifiedAt:'2026-09-28',partnerContentVerifiedAt:'2026-09-28'}
 assert.deepEqual(validateCatalog('tours',partner).errors,{})
 assert.ok(validateCatalog('tours',{...partner,partnerSourceUrl:'javascript:alert(1)'}).errors.partnerSourceUrl)
 const own=validateCatalog('tours',{...partner,ownership:'GREENVIEW'})
 assert.equal(own.data.operatorId,null);assert.equal(own.data.partnerSourceUrl,null);assert.equal(own.data.partnerTermsVerifiedAt,null);assert.equal(own.data.partnerContentVerifiedAt,null)
 for(const key of ['partnerSourceUrl','partnerTermsVerifiedAt','partnerContentVerifiedAt'])assert.equal(publicTourSelect[key],undefined)
 assert.ok(publicTourSelect.publicContent?.select?.summary);assert.ok(publicTourSelect.publicHighlights?.select?.titleTh);assert.ok(publicTourSelect.itinerarySteps?.select?.timeLabel);assert.ok(publicTourSelect.publicFaqs?.select?.questionEn);assert.ok(publicTourSelect.publicMedia?.select?.url)
})
test('tour editor read authorizes before touching Tour content records',async()=>{
 let touched=false
 const prisma={userProfile:{findUnique:async()=>({status:'SUSPENDED',roles:[]})},tourProgram:{findUnique:async()=>{touched=true;return null}}}
 await assert.rejects(()=>readTourEditor(prisma,'actor',id()),{code:'PERMISSION_DENIED'})
 assert.equal(touched,false)
})

test('Home feature flag requires a display order and clears hidden marketing fields when disabled',()=>{
 const base={...initialValues('tours'),id:id(),version:0,code:'HOME',name:'Home tour',homeFeatured:'true',homeFeaturedOrder:'',homeBadge:'BEST_SELLER'}
 assert.ok(validateCatalog('tours',base).errors.homeFeaturedOrder)
 const featured=validateCatalog('tours',{...base,homeFeaturedOrder:'2'});assert.deepEqual(featured.errors,{});assert.equal(featured.data.homeBadge,'BEST_SELLER')
 const hidden=validateCatalog('tours',{...base,homeFeatured:'false',homeFeaturedOrder:'2',homeBadge:'BEST_SELLER'})
 assert.equal(hidden.data.homeFeaturedOrder,null);assert.equal(hidden.data.homeBadge,null)
})
