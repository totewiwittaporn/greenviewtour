import { addressFields, validateAddress } from './address.js'
const text = (key, label, required = false, max = 200) => ({ key, label, type: 'text', required, max })
const select = (key, label, options) => ({ key, label, type: 'select', options, required: true })
const ref = (key, label, entity, role, required = true) => ({ key, label, type: 'reference', entity, role, required })
const money = (key, label) => ({ key, label, type: 'money' })
const common = [text('code', 'Code', true, 40), text('name', 'Name', true), select('status', 'Status', ['ACTIVE', 'INACTIVE'])]
export const catalog = {
 channels: {title:'Sales channels',singular:'sales channel',model:'salesChannel',fields:[...common,select('kind','Source type',['DIRECT','AGENT'])]},
 company: { title: 'Company', singular: 'company', model: 'companySettings', fields: [text('name','Company name',true),text('legalName','Legal name'),text('taxId','Tax ID',false,30),{...text('address','Previous address',false,1000),hidden:true},...addressFields,text('phone','Phone',false,32),text('email','Email',false,254)] },
 partners: { title: 'Business partners', singular: 'partner', model: 'businessPartner', fields: [...common,{key:'roles',label:'Partner roles',type:'roles',options:['TOUR_OPERATOR','SALES_AGENT','TRANSPORT_PROVIDER'],required:true},text('contactName','Contact name'),text('phone','Phone',false,32),text('email','Email',false,254),{...text('address','Previous address',false,1000),hidden:true},...addressFields,text('association','Association'),text('paymentTerms','Payment terms',false,1000)] },
 tours: { title:'Tour programs',singular:'tour program',model:'tourProgram',fields:[...common,select('ownership','Organized by',['GREENVIEW','PARTNER']),ref('operatorId','Tour operator','partners','TOUR_OPERATOR',false),text('route','Route / itinerary',false,2000),text('departureTimes','Departure times',false,300),text('childPolicy','Child age / height policy',false,1000),select('confirmationMode','Booking confirmation',['REQUEST','INSTANT']),text('cancellationTerms','Cancellation terms',false,2000),text('bookingCutoff','Booking cutoff',false,300),money('adultPrice','Direct adult price (THB)'),money('childPrice','Direct child price (THB)'),select('supplierPricing','Supplier pricing basis',['NOT_SET','NET','COMMISSION']),money('supplierAdultNet','Supplier adult net (THB)'),money('supplierChildNet','Supplier child net (THB)'),money('supplierAdultCommission','Adult commission received (THB)'),money('supplierChildCommission','Child commission received (THB)')] },
 rates: {title:'Agent prices',singular:'agent price',model:'agentTourPrice',fields:[ref('agentId','Sales agent','partners','SALES_AGENT'),ref('tourId','Tour program','tours'),money('adultPrice','Agent adult price (THB)'),money('childPrice','Agent child price (THB)'),select('status','Status',['ACTIVE','INACTIVE'])]},
 locations: {title:'Hotels & pickup points',singular:'pickup point',model:'pickupLocation',fields:[...common,select('kind','Location type',['HOTEL','PICKUP_POINT','PIER','AIRPORT']),text('zone','Zone'),{...text('address','Previous address',false,1000),hidden:true},...addressFields,text('pickupNotes','Pickup notes',false,1000)]},
 vehicles: {title:'Vehicles & boats',singular:'vehicle',model:'fleetVehicle',fields:[...common,select('kind','Vehicle type',['VAN','PICKUP_TRUCK','SPEEDBOAT','LONGTAIL_BOAT','CAR','BUS','OTHER']),{key:'capacity',label:'Passenger capacity',type:'integer',required:true},select('ownership','Provided by',['GREENVIEW','PARTNER']),ref('providerId','Transport provider','partners','TRANSPORT_PROVIDER',false),text('registration','Registration / boat number',false,100),text('notes','Notes',false,1000)]},
}
export const labelFor = value => ({GREENVIEW:'Greenview Tour',PARTNER:'Business partner',NOT_SET:'Not set',NET:'Net cost',COMMISSION:'Commission per passenger',REQUEST:'Request confirmation',INSTANT:'Instant confirmation'}[value] || value?.toLowerCase().replaceAll('_',' ').replace(/^./, c => c.toUpperCase()) || '')
export function visibleField(field, values) {
 if (['operatorId','providerId'].includes(field.key)) return values.ownership === 'PARTNER'
 if (field.key.startsWith('supplier')) {
  if(values.ownership !== 'PARTNER') return false
  if(field.key.endsWith('Net')) return values.supplierPricing === 'NET'
  if(field.key.endsWith('Commission')) return values.supplierPricing === 'COMMISSION'
 }
 return true
}
export function initialValues(entity,row={}) { return Object.fromEntries(catalog[entity].fields.map(f=>[f.key,row[f.key] === null || row[f.key] === undefined ? (f.type==='roles'?[]:f.type==='select'?f.options[0]:'') : f.type==='roles'?row[f.key]:String(row[f.key])])) }
export function validateCatalog(entity,input) {
 const definition=catalog[entity],data={},errors={}
 if(!definition || !input || typeof input !== 'object' || Array.isArray(input)) return {data,errors:{name:'Invalid record.'}}
 for(const f of definition.fields) {
  const key=f.key,value=input[key]
  if(!visibleField(f,input)){data[key]=f.type==='select'?'NOT_SET':null;continue}
  if(f.type==='roles'){if(!Array.isArray(value)||!value.length||value.some(v=>!f.options.includes(v)))errors[key]='Select at least one partner role.';else data[key]=[...new Set(value)].sort();continue}
  const required=f.required || (['operatorId','providerId'].includes(key)&&input.ownership==='PARTNER')
  if(value===null||value===undefined||value===''){data[key]=null;if(required)errors[key]=`Enter ${f.label.toLowerCase()}.`;continue}
  if(typeof value!=='string'){errors[key]='Enter a valid value.';continue}
  const clean=value.trim()
  if(f.type==='money'){if(!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(clean))errors[key]='Enter 0–99,999,999.99, with at most two decimal places.';else data[key]=clean}
  else if(f.type==='integer'){if(!/^[1-9]\d{0,3}$/.test(clean))errors[key]='Enter a whole number from 1 to 9999.';else data[key]=Number(clean)}
  else if(f.type==='select'){if(!f.options.includes(clean))errors[key]='Select an available option.';else data[key]=clean}
  else if(f.type==='reference'){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean))errors[key]='Select an available record.';else data[key]=clean}
  else {if((required&&!clean)||clean.length>f.max||[...clean].some(c=>(c.charCodeAt(0)<32&&!['\n','\r','\t'].includes(c))||c.charCodeAt(0)===127))errors[key]=`Enter ${required?'1–':'up to '}${f.max} characters.`;data[key]=clean||null}
 }
 if(data.code){data.code=data.code.toUpperCase();if(!/^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(data.code))errors.code='Use letters, numbers, hyphens or underscores.'}
 if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))errors.email='Enter a valid email address.'
 if(entity==='rates'&&data.adultPrice===null&&data.childPrice===null)errors.adultPrice='Set an adult or child price.'
 for(const [key,limit]of[['latitude',90],['longitude',180]])if(data[key]&&(!/^-?\d+(\.\d+)?$/.test(data[key])||Math.abs(Number(data[key]))>limit))errors[key]=`Enter a coordinate from -${limit} to ${limit}.`
 if(entity==='locations'&&Boolean(data.latitude)!==Boolean(data.longitude))errors.latitude='Enter both coordinates, or leave both empty.'
 if(['company','partners','locations'].includes(entity))Object.assign(errors,validateAddress(data))
 return {data,errors}
}

// Put identity/contact information first and availability last on recurring forms.
for (const entity of ['company','partners','locations']) {
 const order=entity==='company'?['name','legalName','taxId','phone','email']:entity==='partners'?['name','code','roles','contactName','phone','email','association','paymentTerms']:['name','code','kind','zone']
 const fields=catalog[entity].fields
 catalog[entity].fields=[...order.map(key=>fields.find(f=>f.key===key)),...fields.filter(f=>!order.includes(f.key)&&f.key!=='status'),...fields.filter(f=>f.key==='status')]
}
