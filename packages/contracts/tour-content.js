import {isoDay, safeImageUrl} from './commerce.js'

export const tourLocales = ['th','en']
export const tourContentLimits = {
  name:200, summary:1000, introduction:5000, longDescription:20000,
  departureTimes:1000, childPolicy:2000, cancellationTerms:3000, bookingCutoff:1000,
  meals:3000, fees:3000, inclusions:4000, exclusions:4000, preparationNotes:4000,
  specialConditions:5000, seoTitle:120, metaDescription:320, ogTitle:120, ogDescription:320,
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const clean=(value,max)=>{
  if(value===null||value===undefined)return null
  if(typeof value!=='string')return undefined
  const text=value.trim()
  if(text.length>max||[...text].some(c=>(c.charCodeAt(0)<32&&!['\n','\r','\t'].includes(c))||c.charCodeAt(0)===127))return undefined
  return text||null
}
export const emptyTourContent = () => Object.fromEntries(Object.keys(tourContentLimits).map(key=>[key,'']).concat([['contentReviewedAt','']]))
function localizedRow(row,fields,maxes,errors,prefix){
  const out={}
  for(const field of fields){
    const value=clean(row?.[field],maxes[field])
    if(value===undefined)errors[`${prefix}.${field}`]=`Enter up to ${maxes[field]} characters.`
    else out[field]=value
  }
  return out
}
function listRows(value,max,kind,errors,normalizer){
  if(!Array.isArray(value)){errors[kind]='Invalid list.';return []}
  if(value.length>max){errors[kind]=`Use at most ${max} records.`;return []}
  const ids=new Set(),out=[]
  value.forEach((row,index)=>{
    if(!row||!uuid.test(row.id||'')){errors[`${kind}.${index}.id`]='Invalid record id.';return}
    if(ids.has(row.id)){errors[`${kind}.${index}.id`]='Duplicate record id.';return}
    ids.add(row.id)
    const normalized=normalizer(row,index)
    if(normalized)out.push(normalized)
  })
  return out
}
export function validateTourContent(input={}){
  const errors={},content={}
  for(const locale of tourLocales){
    const row=input.content?.[locale]||{}
    content[locale]=localizedRow(row,Object.keys(tourContentLimits),tourContentLimits,errors,`content.${locale}`)
    const reviewed=row.contentReviewedAt
    if(reviewed!==null&&reviewed!==undefined&&reviewed!==''&&!isoDay(reviewed))errors[`content.${locale}.contentReviewedAt`]='Use a valid calendar date.'
    content[locale].contentReviewedAt=reviewed?String(reviewed):null
  }
  const status=value=>['ACTIVE','INACTIVE'].includes(value)?value:null
  const order=value=>Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<=9999?Number(value):null
  const highlights=listRows(input.highlights||[],40,'highlights',errors,(row,index)=>{
    const result={id:row.id,status:status(row.status),sortOrder:order(row.sortOrder),...localizedRow(row,['titleTh','titleEn','descriptionTh','descriptionEn'],{titleTh:300,titleEn:300,descriptionTh:1000,descriptionEn:1000},errors,`highlights.${index}`)}
    if(!result.status)errors[`highlights.${index}.status`]='Choose a valid status.'
    if(result.sortOrder===null)errors[`highlights.${index}.sortOrder`]='Enter a valid order.'
    if(!result.titleTh&&!result.titleEn)errors[`highlights.${index}.titleTh`]='Enter a Thai or English title.'
    return result
  })
  const itinerary=listRows(input.itinerary||[],100,'itinerary',errors,(row,index)=>{
    const day=Number(row.day),result={id:row.id,status:status(row.status),sortOrder:order(row.sortOrder),day:Number.isInteger(day)&&day>=1&&day<=366?day:null,
      ...localizedRow(row,['timeLabel','titleTh','titleEn','descriptionTh','descriptionEn','locationTh','locationEn'],{timeLabel:100,titleTh:300,titleEn:300,descriptionTh:2000,descriptionEn:2000,locationTh:300,locationEn:300},errors,`itinerary.${index}`)}
    if(!result.status)errors[`itinerary.${index}.status`]='Choose a valid status.'
    if(result.sortOrder===null)errors[`itinerary.${index}.sortOrder`]='Enter a valid order.'
    if(result.day===null)errors[`itinerary.${index}.day`]='Enter a day from 1 to 366.'
    if(!result.titleTh&&!result.titleEn)errors[`itinerary.${index}.titleTh`]='Enter a Thai or English title.'
    return result
  })
  const faqs=listRows(input.faqs||[],40,'faqs',errors,(row,index)=>{
    const result={id:row.id,status:status(row.status),sortOrder:order(row.sortOrder),...localizedRow(row,['questionTh','answerTh','questionEn','answerEn'],{questionTh:500,answerTh:5000,questionEn:500,answerEn:5000},errors,`faqs.${index}`)}
    if(!result.status)errors[`faqs.${index}.status`]='Choose a valid status.'
    if(result.sortOrder===null)errors[`faqs.${index}.sortOrder`]='Enter a valid order.'
    if(!(result.questionTh&&result.answerTh)&&!(result.questionEn&&result.answerEn))errors[`faqs.${index}.questionTh`]='Enter a complete Thai or English question and answer.'
    return result
  })
  const media=listRows(input.media||[],30,'media',errors,(row,index)=>{
    const result={id:row.id,status:status(row.status),kind:['HERO','GALLERY'].includes(row.kind)?row.kind:null,sortOrder:order(row.sortOrder),
      ...localizedRow(row,['altTh','altEn','captionTh','captionEn'],{altTh:300,altEn:300,captionTh:500,captionEn:500},errors,`media.${index}`)}
    result.url=clean(row.url,2048)
    if(!result.status)errors[`media.${index}.status`]='Choose a valid status.'
    if(!result.kind)errors[`media.${index}.kind`]='Choose hero or gallery.'
    if(result.sortOrder===null)errors[`media.${index}.sortOrder`]='Enter a valid order.'
    if(!result.url||!safeImageUrl(result.url))errors[`media.${index}.url`]='Use an HTTPS image or an uploaded website image.'
    return result
  })
  if(media.filter(row=>row.status==='ACTIVE'&&row.kind==='HERO').length>1)errors.media='Use only one active hero image.'
  return {data:{content,highlights,itinerary,faqs,media},errors}
}

export function legacyTourPublicFields(program,content,highlights,itinerary,media){
  const th=content?.th||{},en=content?.en||{}
  const primary=Object.values(th).some(Boolean)?th:en
  const text=(key,legacy)=>primary[key]||program?.[legacy]||null
  const highlightText=(highlights||[]).filter(row=>row.status==='ACTIVE').sort((a,b)=>a.sortOrder-b.sortOrder).map(row=>row.titleTh||row.titleEn).filter(Boolean).join('\n')||program?.highlights||null
  const routeText=(itinerary||[]).filter(row=>row.status==='ACTIVE').sort((a,b)=>a.day-b.day||a.sortOrder-b.sortOrder).map(row=>{
    const title=row.titleTh||row.titleEn,location=row.locationTh||row.locationEn,detail=row.descriptionTh||row.descriptionEn
    return [`Day ${row.day}`,row.timeLabel,title,location,detail].filter(Boolean).join(' · ')
  }).filter(Boolean).join('\n')||program?.route||null
  const images=(media||[]).filter(row=>row.status==='ACTIVE').sort((a,b)=>(a.kind==='HERO'?-1:1)-(b.kind==='HERO'?-1:1)||a.sortOrder-b.sortOrder).map(row=>row.url).filter(Boolean).join('\n')||program?.imageUrls||null
  return {
    description:text('summary','description'), highlights:highlightText, route:routeText, imageUrls:images,
    departureTimes:text('departureTimes','departureTimes'), childPolicy:text('childPolicy','childPolicy'),
    cancellationTerms:text('cancellationTerms','cancellationTerms'), bookingCutoff:text('bookingCutoff','bookingCutoff'),
    meals:text('meals','meals'), fees:text('fees','fees'), inclusions:text('inclusions','inclusions'),
    exclusions:text('exclusions','exclusions'), preparationNotes:text('preparationNotes','preparationNotes'),
  }
}
