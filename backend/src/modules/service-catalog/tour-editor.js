import {randomUUID} from 'node:crypto'
import {legacyTourPublicFields, validateTourContent} from '../../../../packages/contracts/tour-content.js'
import {AccessError} from '../identity-access/membership.js'
import {uuid} from '../operations/common.js'
import {authorizeCatalog, saveSettingsRecord} from './settings.js'

const operatorSelect={id:true,name:true,code:true}
const seasonSelect={id:true,name:true,code:true,status:true,startsOn:true,endsOn:true,onlineStartsOn:true,onlineEndsOn:true,bookingStartsOn:true,bookingEndsOn:true,cutoffDays:true,closedDates:true}
const promotionSelect={id:true,name:true,code:true,status:true,startsOn:true,endsOn:true,serviceStartsOn:true,serviceEndsOn:true,adultPrice:true,childPrice:true,quota:true,quotaUnit:true,terms:true}
const componentSelect={id:true,status:true,selection:true,basis:true,quantity:true,usagePoint:true,day:true,notes:true,resource:{select:{id:true,name:true,category:true,baseUnit:true,salePrice:true,ownership:true}}}
const editorInclude={
 operator:{select:operatorSelect},publicContent:{orderBy:{locale:'asc'}},publicHighlights:{orderBy:[{sortOrder:'asc'},{id:'asc'}]},
 itinerarySteps:{orderBy:[{day:'asc'},{sortOrder:'asc'},{id:'asc'}]},publicFaqs:{orderBy:[{sortOrder:'asc'},{id:'asc'}]},
 publicMedia:{orderBy:[{sortOrder:'asc'},{id:'asc'}]},seasons:{select:seasonSelect,orderBy:{startsOn:'asc'}},
 promotions:{select:promotionSelect,orderBy:{startsOn:'desc'}},components:{select:componentSelect,orderBy:[{day:'asc'},{createdAt:'asc'}]},
}
const contentKeys=['name','summary','introduction','longDescription','departureTimes','childPolicy','cancellationTerms','bookingCutoff','meals','fees','inclusions','exclusions','preparationNotes','specialConditions','suitableFor','meetingPoint','weatherNotes','seoTitle','metaDescription','ogTitle','ogDescription']
function blankContent(){return Object.fromEntries(contentKeys.map(key=>[key,'']).concat([['contentReviewedAt','']]))}
function legacyThai(tour){return {...blankContent(),name:tour.name||'',summary:tour.description||'',departureTimes:tour.departureTimes||'',childPolicy:tour.childPolicy||'',cancellationTerms:tour.cancellationTerms||'',bookingCutoff:tour.bookingCutoff||'',meals:tour.meals||'',fees:tour.fees||'',inclusions:tour.inclusions||'',exclusions:tour.exclusions||'',preparationNotes:tour.preparationNotes||''}}
function contentRecord(row){
 const result=blankContent()
 for(const key of contentKeys)result[key]=row?.[key]||''
 result.contentReviewedAt=row?.contentReviewedAt?row.contentReviewedAt.toISOString().slice(0,10):''
 return result
}
function editorPayload(tour){
 const rows=Object.fromEntries(tour.publicContent.map(row=>[row.locale,row]))
 return {tour,content:{th:rows.th?contentRecord(rows.th):legacyThai(tour),en:rows.en?contentRecord(rows.en):blankContent()},legacyFallback:{th:!rows.th,en:!rows.en},highlights:tour.publicHighlights,itinerary:tour.itinerarySteps,faqs:tour.publicFaqs,media:tour.publicMedia,seasons:tour.seasons,promotions:tour.promotions,components:tour.components}
}
export async function readTourEditor(prisma,actorId,tourId){
 await authorizeCatalog(prisma,actorId,'tours')
 const tour=await prisma.tourProgram.findUnique({where:{id:uuid(tourId)},include:editorInclude})
 if(!tour)throw new AccessError('NOT_FOUND',404)
 return editorPayload(tour)
}
function dateValue(value){return value?new Date(`${value}T00:00:00.000Z`):null}
function contentData(tourId,locale,row){return {tourId,locale,...Object.fromEntries(contentKeys.map(key=>[key,row[key]||null])),contentReviewedAt:dateValue(row.contentReviewedAt)}}
function childData(tourId,row){const {version:_,createdAt:__,updatedAt:___,tour:____,...data}=row;return {...data,tourId}}
export async function saveTourEditor(prisma,actorId,tourId,input){
 tourId=uuid(tourId)
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['program','content','highlights','itinerary','faqs','media'].includes(key)))throw new AccessError('INVALID_SETTINGS',400)
 if(!input.program||input.program.id!==tourId)throw new AccessError('INVALID_SETTINGS',400)
 const checked=validateTourContent(input)
 if(Object.keys(checked.errors).length)throw new AccessError('INVALID_SETTINGS',400)
 const compatibility=legacyTourPublicFields(input.program,checked.data.content,checked.data.highlights,checked.data.itinerary,checked.data.media)
 const program={...input.program,...compatibility}
 try{
  await prisma.$transaction(async tx=>{
   const saved=await saveSettingsRecord(tx,actorId,'tours',program)
   for(const locale of ['th','en']){
    const data=contentData(tourId,locale,checked.data.content[locale])
    await tx.tourProgramContent.upsert({where:{tourId_locale:{tourId,locale}},create:{id:randomUUID(),...data},update:{...data,version:{increment:1}}})
   }
   const replace=async(model,rows)=>{await tx[model].deleteMany({where:{tourId}});if(rows.length)await tx[model].createMany({data:rows.map(row=>childData(tourId,row))})}
   await replace('tourHighlight',checked.data.highlights)
   await replace('tourItineraryStep',checked.data.itinerary)
   await replace('tourFaq',checked.data.faqs)
   await replace('tourMedia',checked.data.media)
   await tx.auditEvent.create({data:{actorId,targetId:tourId,action:'settings.tours.public-content.updated',details:{locales:['th','en'],highlights:checked.data.highlights.length,itinerary:checked.data.itinerary.length,faqs:checked.data.faqs.length,media:checked.data.media.length,version:saved.row.version}}})
  },{isolationLevel:'Serializable',timeout:30000})
 }catch(error){if(error.code==='P2002')throw new AccessError('SETTINGS_DUPLICATE',409);throw error}
 return readTourEditor(prisma,actorId,tourId)
}
