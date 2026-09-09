// Shared form metadata and deterministic units/time rules. No database dependencies.
const text=(key,label,required=false,max=200)=>({key,label,type:'text',required,max})
const select=(key,label,options)=>({key,label,type:'select',options,required:true})
const optionalSelect=(key,label,options)=>({...select(key,label,['',...options]),required:false})
const integer=(key,label,required=true)=>({key,label,type:'integer',required})
const ref=(key,label,entity,required=true)=>({key,label,type:'reference',entity,required})
const money=(key,label)=>({key,label,type:'money'})
const common=[text('code','Code',true,40),text('name','Name',true),select('status','Status',['ACTIVE','INACTIVE'])]
const stamp=(key,label)=>({...text(key,label,true,16),type:'timestamp',placeholder:'YYYY-MM-DD HH:mm · Thailand time'})
const resourceFields=(categories,units)=>[...common,select('category','Category',categories),select('baseUnit','Base / pricing unit',units)]
export const operationCatalog={
 services:{title:'Services',singular:'service',model:'operationResource',kind:'SERVICE',fields:[...resourceFields(['TRANSFER','TOUR_BOAT','LONGTAIL_BOAT','MEAL','ACCOMMODATION','PARK_FEE','OTHER'],['PERSON','VEHICLE','BOAT','TRIP','PERSON_MEAL','ROOM_NIGHT','PERSON_NIGHT']),optionalSelect('ownership','Provided by',['GREENVIEW','PARK','PARTNER']),ref('providerId','Service provider','partners',false),optionalSelect('mealPeriod','Meal',['BREAKFAST','LUNCH','DINNER']),optionalSelect('accommodationType','Accommodation type',['STANDARD_TENT','AC_TENT','BUNGALOW']),integer('occupancy','Guests per accommodation unit',false),optionalSelect('serviceMode','Boat sales mode',['JOIN','CHARTER']),select('verificationStatus','Details verification',['UNVERIFIED','VERIFIED']),text('origin','Origin'),text('destination','Destination'),money('salePrice','Selling price per unit (THB)'),money('costPrice','Cost per unit (THB)'),text('notes','Notes',false,2000)]},
 equipment:{title:'Equipment',singular:'equipment item',model:'operationResource',kind:'EQUIPMENT',fields:[...resourceFields(['SNORKEL_MASK','FINS','TOWEL','LIFEJACKET','OTHER'],['PIECE','PAIR']),text('size','Size / variant'),money('salePrice','Optional rental price per unit (THB)'),money('costPrice','Purchase cost per unit (THB)'),text('notes','Notes',false,2000)]},
 consumables:{title:'Consumables',singular:'consumable',model:'operationResource',kind:'CONSUMABLE',fields:[...resourceFields(['WATER','SOFT_DRINK','JUICE','WATERMELON','PINEAPPLE','OTHER'],['BOTTLE','FRUIT','PIECE']),text('size','Bottle size / variant'),integer('packSize','Bottles per pack',false),integer('caseSize','Bottles per case',false),money('salePrice','Optional selling price per unit (THB)'),money('costPrice','Purchase cost per base unit (THB)'),text('notes','Notes',false,2000)]},
 stores:{title:'Stock locations',singular:'stock location',model:'stockLocation',fields:[...common,select('kind','Location type',['WAREHOUSE','BOAT','ISLAND','OTHER']),text('notes','Notes',false,2000)]},
 components:{title:'Program components',singular:'program component',model:'programComponent',fields:[ref('tourId','Tour program','tours'),ref('resourceId','Service / item','resources'),select('selection','Package selection',['INCLUDED','REQUIRED','OPTIONAL','EXCLUDED']),select('basis','Quantity basis',['PER_PERSON','PER_ADULT','PER_CHILD','PER_BOOKING','PER_PERSON_NIGHT','PER_ROOM_NIGHT']),integer('quantity','Units per basis'),money('removalCredit','Credit per removed unit (THB)'),select('usagePoint','Used at',['BOAT','ISLAND','TRANSFER','OTHER']),integer('day','Itinerary day'),text('notes','Activity / timing notes',false,1000),select('status','Status',['ACTIVE','INACTIVE'])]},
 slots:{title:'Service availability',singular:'service slot',model:'serviceSlot',fields:[...common,ref('resourceId','Service','services'),ref('vehicleId','Assigned vehicle / boat','vehicles',false),stamp('startsAt','Start date and time'),stamp('endsAt','End date and time'),integer('capacity','Capacity in service pricing units')]},
 trips:{title:'Trips',singular:'trip',model:'operationTrip',fields:[text('code','Code',true,40),text('name','Name',true),ref('tourId','Tour program (empty for standalone service)','tours',false),stamp('startsAt','Start date and time'),stamp('endsAt','End date and time'),integer('capacity','Passenger capacity'),text('notes','Notes',false,2000)]},
}
for(const d of Object.values(operationCatalog))d.operation=true
export const isUUID=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
export function localStamp(value){if(!value)return '';return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value))}
export function parseStamp(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value))throw Error('INVALID_TIME')
 const date=new Date(value.replace(' ','T')+':00+07:00')
 if(!Number.isFinite(date.valueOf())||localStamp(date)!==value)throw Error('INVALID_TIME')
 return date
}
export function whole(value,min=1,max=1000000){const s=String(value);if(!/^(0|[1-9]\d*)$/.test(s)||!Number.isSafeInteger(Number(s))||Number(s)<min||Number(s)>max)throw Error('INVALID_QUANTITY');return Number(s)}
export function convertQuantity(resource,quantity,unit){
 const factor=unit==='BASE'?1:unit==='PACK'&&resource.baseUnit==='BOTTLE'?resource.packSize:unit==='CASE'&&resource.baseUnit==='BOTTLE'?resource.caseSize:null
 if(!factor)throw Error('UNIT_NOT_CONFIGURED')
 const enteredQuantity=whole(quantity),total=enteredQuantity*whole(factor)
 if(total>100000000)throw Error('INVALID_QUANTITY')
 return {quantity:total,enteredQuantity,enteredUnit:unit,factor}
}
export function componentQuantity(component,adults,children,nights){
 const guests=whole(adults,0)+whole(children,0),stays=whole(nights,0,366)
 const factors={PER_PERSON:guests,PER_ADULT:adults,PER_CHILD:children,PER_BOOKING:1,PER_PERSON_NIGHT:guests*stays}
 if(component.basis==='PER_ROOM_NIGHT')factors.PER_ROOM_NIGHT=Math.ceil(guests/whole(component.resource?.occupancy??component.occupancy))*stays
 if(!Object.hasOwn(factors,component.basis))throw Error('INVALID_QUANTITY_BASIS')
 return whole(component.quantity)*factors[component.basis]
}
export function tripNights(trip){const start=localStamp(trip.startsAt).slice(0,10),end=localStamp(trip.endsAt).slice(0,10);return Math.round((Date.parse(end)-Date.parse(start))/86400000)}
export function peakUsage(intervals){const events=intervals.flatMap(i=>[[+new Date(i.start),i.quantity],[+new Date(i.end),-i.quantity]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let n=0,peak=0;for(const[,delta]of events){n+=delta;peak=Math.max(peak,n)}return peak}

export function resourceMetadataErrors(data){
 const errors={}
 if(data.mealPeriod&&data.category!=='MEAL')errors.mealPeriod='Meal period is only available for meals.'
 if((data.accommodationType||data.occupancy)&&data.category!=='ACCOMMODATION')errors.accommodationType='Accommodation details require the accommodation category.'
 if(data.serviceMode&&!['TOUR_BOAT','LONGTAIL_BOAT'].includes(data.category))errors.serviceMode='Boat sales mode requires a boat service.'
 if(data.status==='ACTIVE'&&data.category==='MEAL'&&!data.mealPeriod)errors.mealPeriod='Select breakfast, lunch or dinner.'
 if(data.status==='ACTIVE'&&data.category==='ACCOMMODATION'&&(!data.accommodationType||!data.occupancy||data.verificationStatus!=='VERIFIED'))errors.accommodationType='Verify accommodation type and occupancy before activation.'
 return errors
}
