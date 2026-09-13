// Shared effective access. A scoped grant never implies company-wide access.
export const roleNames = {
 ADMIN_MANAGER:'Admin Manager', MANAGER:'Manager', BOOKING:'Booking', HEAD_BOOKING:'Head Booking', SALES:'Sales', ACCOUNT:'Account',
 GUIDE:'Guide', HEAD_GUIDE:'Head Guide', ASSISTANT_TOUR_GUIDE:'Assistant tour guide',
 CAPTAIN:'Captain', HEAD_CAPTAIN:'Head Captain', ASSISTANT_CAPTAIN:'Assistant Captain', DRIVER:'Driver', HEAD_DRIVER:'Head Driver',
 HOUSEKEEPING:'Housekeeping', HEAD_HOUSEKEEPING:'Head Housekeeping',
}
export const dutyPermissions = {
 booking: {label:'Manage bookings', roles:['BOOKING','HEAD_BOOKING']},
 guide: {label:'View boat jobs', roles:['GUIDE','HEAD_GUIDE','ASSISTANT_TOUR_GUIDE','CAPTAIN','HEAD_CAPTAIN','ASSISTANT_CAPTAIN']},
 manageGuide: {label:'Assign boats and guides',roles:['GUIDE','HEAD_GUIDE']},
 driver: {label:'View vehicle jobs',roles:['DRIVER','HEAD_DRIVER']},
 manageDriver: {label:'Assign vehicles and drivers',roles:['HEAD_DRIVER']},
 prepareStock: {label:'Prepare stock for assigned boat jobs',roles:['GUIDE','HEAD_GUIDE','ASSISTANT_TOUR_GUIDE']},
 islandBooking: {label:'Manage island bookings',roles:['BOOKING','HEAD_BOOKING','GUIDE','HEAD_GUIDE','ASSISTANT_TOUR_GUIDE']},
 stock: {label:'Manage inventory',roles:[]},
}
export const accessDefinitions = Object.fromEntries(Object.entries(dutyPermissions).map(([key,value])=>[`operations.${key}`,{...value,managerDefault:true}]))
accessDefinitions['finance.receive']={label:'Record a booking as paid',roles:['BOOKING','HEAD_BOOKING','ACCOUNT'],managerDefault:true}
Object.assign(accessDefinitions,{
 'housekeeping.view':{label:'View cleaning work',roles:['HOUSEKEEPING','HEAD_HOUSEKEEPING'],managerDefault:true},
 'housekeeping.manage':{label:'Manage cleaning zones and schedules',roles:['HEAD_HOUSEKEEPING'],managerDefault:true},
 'housekeeping.approve':{label:'Accept completed cleaning work',roles:['HEAD_HOUSEKEEPING'],managerDefault:true},
 'inventory.request':{label:'Request stock and report maintenance',roles:Object.keys(roleNames),managerDefault:true},
 'inventory.assign':{label:'Appoint warehouse custodians',roles:[],managerDefault:true},
 'inventory.approve':{label:'Approve stock requests and count differences',roles:[],managerDefault:true},
 'purchasing.view':{label:'View purchase requests and orders',roles:[],managerDefault:true},
 'purchasing.edit':{label:'Prepare purchase requests and orders',roles:[],managerDefault:true},
 'purchasing.approve':{label:'Approve purchases',roles:[],managerDefault:true},
 'purchasing.receive':{label:'Receive approved purchases into stock',roles:[],managerDefault:true},
 'personnel.view':{label:'View employment and attendance',roles:[],managerDefault:true},
 'personnel.edit':{label:'Manage employment and attendance',roles:[],managerDefault:true},
 'personnel.approve':{label:'Approve personnel records',roles:[],managerDefault:true},
 'payroll.view':{label:'View confidential payroll',roles:[],adminDefault:true},
 'payroll.edit':{label:'Prepare confidential payroll',roles:[],adminDefault:true},
 'payroll.approve':{label:'Approve payroll',roles:[],adminDefault:true},
 'payroll.pay':{label:'Record payroll payments',roles:[],adminDefault:true},
 'expenses.view':{label:'View expenses and advances',roles:['ACCOUNT'],managerDefault:true},
 'expenses.edit':{label:'Prepare expenses and advances',roles:['ACCOUNT'],managerDefault:true},
 'expenses.approve':{label:'Approve expenses and advances',roles:[],managerDefault:true},
 'expenses.pay':{label:'Record expense and advance payments',roles:['ACCOUNT'],managerDefault:true},
})
export const isManager = profile => profile?.status==='ACTIVE' && (profile.roles||[]).some(g=>g.scope==='COMPANY' && ['ADMIN_MANAGER','MANAGER'].includes(g.roleCode||g.code))
export const isAdmin = profile => profile?.status==='ACTIVE' && (profile.roles||[]).some(g=>g.scope==='COMPANY' && (g.roleCode||g.code)==='ADMIN_MANAGER')
export function effectiveAccess(profile,code,{scopeId=null,now=new Date()}={}) {
 const definition=Object.hasOwn(accessDefinitions,code)?accessDefinitions[code]:null
 if(profile?.status!=='ACTIVE'||!definition)return {allowed:false,source:'Unavailable'}
 const overrides=(profile.permissionOverrides||[]).filter(g=>g.permissionCode===code && (!g.startsAt||+new Date(g.startsAt)<=+now) && (!g.expiresAt||+new Date(g.expiresAt)>+now) && (!g.scopeId||g.scopeId===scopeId))
 if(overrides.some(g=>g.effect==='DENY'))return {allowed:false,source:'User restriction'}
 if(overrides.some(g=>g.effect==='ALLOW'))return {allowed:true,source:'Special permission'}
 const roles=(profile.roles||[]).filter(g=>['SELF','COMPANY'].includes(g.scope)).map(g=>g.roleCode||g.code)
 const inherited=roles.filter(code=>definition.roles.includes(code))
 if(isManager(profile)&&definition.managerDefault)inherited.push('Manager')
 if(isAdmin(profile)&&definition.adminDefault)inherited.push('Admin Manager')
 return {allowed:inherited.length>0,source:inherited.length?`Role: ${inherited.join(', ')}`:'No grant'}
}
