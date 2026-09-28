// Browser-safe commerce validation. Prices use integer satang for arithmetic.
export const isoDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(+new Date(value+'T00:00:00Z')) && new Date(value+'T00:00:00Z').toISOString().slice(0,10) === value
export const dayString = value => value instanceof Date ? value.toISOString().slice(0,10) : String(value).slice(0,10)
export const thailandDay = (now = new Date()) => new Date(+now + 7*3600000).toISOString().slice(0,10)
export const cents = value => value === null || value === undefined || !/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(String(value)) ? null : Math.round(Number(value)*100)
export const safeWebUrl = value => {
 try { const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password } catch { return false }
}
export const safeImageUrl = value => /^\/api\/public\/images\/[0-9a-f-]{36}$/.test(value)||safeWebUrl(value)
export function commerceErrors(entity,data) {
 const errors={}
 const order=(a,b)=>{if(data[a]&&data[b]&&dayString(data[a])>dayString(data[b]))errors[b]='End date must not be before start date.'}
 if(entity==='tours') {
  if(data.slug&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))errors.slug='Use lowercase letters, numbers and hyphens.'
  if(data.imageUrls&&data.imageUrls.split('\n').filter(Boolean).some(x=>!safeImageUrl(x.trim())))errors.imageUrls='Enter one HTTPS image URL per line.'
  if(data.imageUrls?.split('\n').filter(Boolean).length>10)errors.imageUrls='Use at most 10 images.'
  if(data.publicStatus==='PUBLISHED')for(const key of ['slug','description','imageUrls','tourType'])if(!data[key])errors[key]='Complete this field before publishing.'
 }
 if(entity==='seasons') {
  order('startsOn','endsOn');order('onlineStartsOn','onlineEndsOn');order('bookingStartsOn','bookingEndsOn')
  if(data.startsOn&&data.onlineStartsOn&&data.onlineStartsOn<data.startsOn)errors.onlineStartsOn='Online travel dates must be within the service season.'
  if(data.endsOn&&data.onlineEndsOn&&data.onlineEndsOn>data.endsOn)errors.onlineEndsOn='Online travel dates must be within the service season.'
  if(data.closedDates&&data.closedDates.split(/[\s,]+/).filter(Boolean).some(d=>!isoDay(d)))errors.closedDates='Use YYYY-MM-DD dates separated by commas.'
 }
 if(entity==='promotions') {
  order('startsOn','endsOn');order('serviceStartsOn','serviceEndsOn')
  if(data.quota!==null&&!data.holdHours)errors.holdHours='Set the hours to hold limited promotion rights while awaiting review.'
  if(data.adultPrice===null&&data.childPrice===null)errors.adultPrice='Set at least one promotional passenger price.'
 }
 if(entity==='popups') {
  order('startsOn','endsOn')
  for(const key of ['imageUrl','mobileImageUrl','linkUrl'])if(data[key]&&!(key==='linkUrl'?safeWebUrl(data[key]):safeImageUrl(data[key])))errors[key]='Enter an HTTPS URL without credentials.'
  if(Boolean(data.linkUrl)!==Boolean(data.buttonLabel))errors.buttonLabel='Set both a link and button label, or leave both empty.'
 }
 return errors
}
export function saleDateAllowed(seasons, date, now=new Date()) {
 if(!isoDay(date))return false
 const today=thailandDay(now)
 return seasons.some(s=>s.status==='ACTIVE'&&date>=dayString(s.startsOn)&&date<=dayString(s.endsOn)&&date>=dayString(s.onlineStartsOn)&&date<=dayString(s.onlineEndsOn)&&today>=dayString(s.bookingStartsOn)&&today<=dayString(s.bookingEndsOn)&&Date.parse(date)-Date.parse(today)>=s.cutoffDays*86400000&&!(s.closedDates||'').split(/[\s,]+/).includes(date))
}
export function promotionAllowed(p,date,now=new Date()) {
 const today=thailandDay(now)
 return p?.status==='ACTIVE'&&today>=dayString(p.startsOn)&&today<=dayString(p.endsOn)&&date>=dayString(p.serviceStartsOn)&&date<=dayString(p.serviceEndsOn)
}
export function promotionUnits(p,adults,children){return p.quotaUnit==='BOOKING'?1:adults+children}
