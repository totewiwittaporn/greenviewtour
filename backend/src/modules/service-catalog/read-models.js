const fields = names => Object.fromEntries(names.split(' ').filter(Boolean).map(name => [name, true]))
const reference = { select: { id: true, name: true, code: true } }
const columns = {
 partners:'shortName roles mapUrl latitude longitude', tours:'operatorId', rates:'adultPrice childPrice', locations:'kind zone mapUrl latitude longitude', vehicles:'kind capacity', channels:'kind', agreements:'',
 seasons:'startsOn endsOn', promotions:'startsOn endsOn', popups:'startsOn endsOn',
 services:'category baseUnit size', equipment:'category baseUnit size', consumables:'category baseUnit size', stores:'kind', components:'selection quantity basis', slots:'capacity', trips:'capacity',
}
const relations = {tours:{operator:reference}, rates:{agent:reference,tour:reference}, seasons:{tour:reference}, promotions:{tour:reference}, components:{tour:reference,resource:reference}, slots:{resource:reference}, trips:{tour:reference}}
// List DTOs cannot initialize editors. Full records are fetched by ID on View/Edit.
export function catalogReadSelect(entity, view) {
 if (!['list','options'].includes(view) || !Object.hasOwn(columns,entity)) return null
 const base = fields(`id version status ${['rates','components'].includes(entity)?'':'code name'}`)
 if(view==='list')return {...base,...fields(columns[entity]),...relations[entity]}
 if(entity==='rates')return {...base,agent:reference,tour:reference}
 if(entity==='components')return {...base,tour:reference,resource:reference}
 return {...fields('id code name'),...(['services','equipment','consumables'].includes(entity)?fields('kind category baseUnit size packSize caseSize'):{}),...(entity==='vehicles'?fields('capacity kind'):{}),...(entity==='trips'?fields('startsAt endsAt tourId'):{}),...(entity==='agreements'?fields('agentId startsOn endsOn'): {})}
}
export const materialOptionSelect = fields('id code name kind category baseUnit packSize caseSize size')
export const stockResourceSelect = fields('id code name kind category baseUnit packSize caseSize size')
