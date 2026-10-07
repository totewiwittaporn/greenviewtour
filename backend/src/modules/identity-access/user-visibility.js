import {roleNames} from '../../../../packages/contracts/access.js'
export const roleRanks=Object.freeze(Object.fromEntries(Object.keys(roleNames).map(code=>[code,code==='ADMIN_MANAGER'?4:code==='MANAGER'?3:code.startsWith('HEAD_')?2:code.startsWith('ASSISTANT_')?0:1])))
const headDepartments={HEAD_BOOKING:'BOOKING',HEAD_GUIDE:'GUIDE',HEAD_CAPTAIN:'CAPTAIN',HEAD_DRIVER:'DRIVER',HEAD_HOUSEKEEPING:'HOUSEKEEPING'}
// Visibility is an additional restriction, never permission to enter an API.
export function userVisibility(actor){
 if(actor?.status!=='ACTIVE'||!actor.roles?.length||actor.roles.some(role=>!Object.hasOwn(roleRanks,role.roleCode)))return null
 const maxRank=Math.max(...actor.roles.map(role=>roleRanks[role.roleCode]))
 if(maxRank>=3&&!actor.roles.some(role=>roleRanks[role.roleCode]===maxRank&&role.scope==='COMPANY'))return null
 let department=null
 if(maxRank===2){
  if(!actor.department||!actor.roles.some(role=>headDepartments[role.roleCode]===actor.department))return null
  department=actor.department
 }
 return {actorId:actor.id||null,maxRank,department,allowedRoleCodes:Object.keys(roleRanks).filter(code=>code!=='ADMIN_MANAGER'&&roleRanks[code]<=maxRank)}
}
export function canSeeUser(actor,target){
 if(actor?.status!=='ACTIVE'||!target)return false
 if(actor.id&&actor.id===target.id)return true
 const visibility=userVisibility(actor)
 return Boolean(visibility&&(!visibility.department||target.department===visibility.department)&&target.roles?.length&&target.roles.every(role=>visibility.allowedRoleCodes.includes(role.roleCode)))
}
export function userVisibilityWhere(actor){
 const visibility=userVisibility(actor)
 if(!visibility)return actor?.status==='ACTIVE'&&actor.id?{id:actor.id}:{id:{in:[]}}
 const ordinary={AND:[{roles:{some:{}}},{roles:{every:{roleCode:{in:visibility.allowedRoleCodes}}}},...(visibility.department?[{department:visibility.department}]:[])]}
 return visibility.actorId?{OR:[{id:visibility.actorId},ordinary]}:ordinary
}
