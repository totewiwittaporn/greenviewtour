export function tourContent(tour, locale='th') {
  const rows=Array.isArray(tour?.publicContent)?tour.publicContent:[]
  const row=rows.find(item=>item.locale===locale)||rows.find(item=>item.locale==='th')||rows.find(item=>item.locale==='en')||{}
  return {
    name:row.name||tour?.name||'',
    summary:row.summary||tour?.description||'',
    introduction:row.introduction||row.summary||tour?.description||'',
    longDescription:row.longDescription||'',
    departureTimes:row.departureTimes||tour?.departureTimes||'',
    childPolicy:row.childPolicy||tour?.childPolicy||'',
    cancellationTerms:row.cancellationTerms||tour?.cancellationTerms||'',
    bookingCutoff:row.bookingCutoff||tour?.bookingCutoff||'',
    meals:row.meals||tour?.meals||'',
    fees:row.fees||tour?.fees||'',
    inclusions:row.inclusions||tour?.inclusions||'',
    exclusions:row.exclusions||tour?.exclusions||'',
    preparationNotes:row.preparationNotes||tour?.preparationNotes||'',
    specialConditions:row.specialConditions||'',
    suitableFor:row.suitableFor||'',
    meetingPoint:row.meetingPoint||'',
    weatherNotes:row.weatherNotes||'',
    seoTitle:row.seoTitle||'',
    metaDescription:row.metaDescription||'',
    ogTitle:row.ogTitle||'',
    ogDescription:row.ogDescription||'',
  }
}
export function localizedPair(row,locale,thKey,enKey){
  return locale==='en'?(row?.[enKey]||row?.[thKey]||''):(row?.[thKey]||row?.[enKey]||'')
}
export function tourMedia(tour, locale='th') {
  const structured=(tour?.publicMedia||[]).map(row=>({...row,alt:localizedPair(row,locale,'altTh','altEn')||tourContent(tour,locale).name,caption:localizedPair(row,locale,'captionTh','captionEn')}))
  if(structured.length)return structured
  return (tour?.imageUrls||'').split('\n').map(value=>value.trim()).filter(Boolean).map((url,index)=>({id:'legacy-'+index,kind:index===0?'HERO':'GALLERY',sortOrder:index,url,alt:tourContent(tour,locale).name,caption:''}))
}
export function tourCover(tour,locale='th'){
  const media=tourMedia(tour,locale)
  return media.find(item=>item.kind==='HERO')||media[0]||null
}
export function highlights(tour,locale='th'){
  const rows=(tour?.publicHighlights||[]).map(row=>({id:row.id,title:localizedPair(row,locale,'titleTh','titleEn'),description:localizedPair(row,locale,'descriptionTh','descriptionEn')})).filter(row=>row.title)
  if(rows.length)return rows
  return (tour?.highlights||'').split('\n').map(title=>title.trim()).filter(Boolean).map((title,index)=>({id:'legacy-'+index,title,description:''}))
}
export function itinerary(tour,locale='th'){
  const rows=(tour?.itinerarySteps||[]).map(row=>({...row,title:localizedPair(row,locale,'titleTh','titleEn'),description:localizedPair(row,locale,'descriptionTh','descriptionEn'),location:localizedPair(row,locale,'locationTh','locationEn')})).filter(row=>row.title||row.description||row.location)
  if(rows.length)return rows
  return (tour?.route||'').split('\n').map((description,index)=>({id:'legacy-'+index,day:1,sortOrder:index,timeLabel:'',title:'',description:description.trim(),location:''})).filter(row=>row.description)
}
export function faqs(tour,locale='th'){
  return (tour?.publicFaqs||[]).map(row=>({id:row.id,question:localizedPair(row,locale,'questionTh','questionEn'),answer:localizedPair(row,locale,'answerTh','answerEn')})).filter(row=>row.question&&row.answer)
}
export function badgeText(value,t){
  return value==='BEST_SELLER'?t('ขายดี'):value==='RECOMMENDED'?t('แนะนำ'):value==='SIGNATURE'?t('ซิกเนเจอร์'):''
}
export function typeText(value,t){
  return ({DAY_TRIP:t('Day Trip'),OVERNIGHT:t('Overnight'),PRIVATE:t('Private Tour'),JOIN:t('Join Tour'),TRANSFER:t('Boat Ticket')})[value]||''
}
