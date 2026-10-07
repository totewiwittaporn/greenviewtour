// Shared effective access. A scoped grant never implies company-wide access.
export const roleNames = {
 ADMIN_MANAGER:'Admin Manager', MANAGER:'Manager', BOOKING:'Booking Assistant', HEAD_BOOKING:'Booking Manager', SALES:'Sales', ACCOUNT:'Account',
 GUIDE:'Guide', HEAD_GUIDE:'Head Guide', ASSISTANT_TOUR_GUIDE:'Assistant tour guide',
 CAPTAIN:'Captain', HEAD_CAPTAIN:'Head Captain', ASSISTANT_CAPTAIN:'Assistant Captain', DRIVER:'Driver', HEAD_DRIVER:'Head Driver',
 HOUSEKEEPING:'Housekeeping', HEAD_HOUSEKEEPING:'Head Housekeeping',
}
export const roleDepartments=Object.freeze({
 ADMIN_MANAGER:'MANAGEMENT',MANAGER:'MANAGEMENT',BOOKING:'BOOKING',HEAD_BOOKING:'BOOKING',SALES:'SALES',ACCOUNT:'ACCOUNT',
 GUIDE:'GUIDE',HEAD_GUIDE:'GUIDE',ASSISTANT_TOUR_GUIDE:'GUIDE',CAPTAIN:'CAPTAIN',HEAD_CAPTAIN:'CAPTAIN',ASSISTANT_CAPTAIN:'CAPTAIN',
 DRIVER:'DRIVER',HEAD_DRIVER:'DRIVER',HOUSEKEEPING:'HOUSEKEEPING',HEAD_HOUSEKEEPING:'HOUSEKEEPING',
})
const primaryRoleWeight={ADMIN_MANAGER:40,MANAGER:40,HEAD_BOOKING:30,HEAD_GUIDE:30,HEAD_CAPTAIN:30,HEAD_DRIVER:30,HEAD_HOUSEKEEPING:30,BOOKING:20,GUIDE:20,CAPTAIN:20,DRIVER:20,HOUSEKEEPING:20,SALES:20,ACCOUNT:20,ASSISTANT_TOUR_GUIDE:10,ASSISTANT_CAPTAIN:10}
export function primaryRoleCode(profile){
 const department=profile?.department||null,codes=(profile?.roles||[]).map(role=>role.roleCode||role.code).filter(Boolean)
 const matching=codes.filter(code=>roleDepartments[code]===department)
 return (matching.length?matching:codes).sort((a,b)=>(primaryRoleWeight[b]||0)-(primaryRoleWeight[a]||0)||a.localeCompare(b))[0]||null
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

// Booking ownership is independent of immutable creation attribution.
const activeRole = (profile, code) => (profile?.roles || []).some(role => ['SELF', 'COMPANY'].includes(role.scope) && (role.roleCode || role.code) === code)
export function canManageBookingTeam(profile) {
 return effectiveAccess(profile, 'operations.booking').allowed && effectiveAccess(profile, 'operations.islandBooking').allowed && (isManager(profile) || activeRole(profile, 'HEAD_BOOKING'))
}
export function canEditBooking(profile, booking) {
 if (profile?.status !== 'ACTIVE') return false
 const bookingAccess = effectiveAccess(profile, 'operations.booking').allowed
 const islandAccess = effectiveAccess(profile, 'operations.islandBooking')
 const bookingStaff = activeRole(profile, 'BOOKING') || activeRole(profile, 'HEAD_BOOKING')
 if (islandAccess.source === 'User restriction' || bookingStaff && (!bookingAccess || !islandAccess.allowed)) return false
 if (!bookingAccess) return effectiveAccess(profile, 'operations.islandBooking').allowed && (booking.assigneeId ?? booking.createdById) === profile.id && booking.programSnapshot?.journeyMode === 'RETURN_ONLY'
 if (canManageBookingTeam(profile)) return true
 if (activeRole(profile, 'BOOKING') || activeRole(profile, 'HEAD_BOOKING')) return (booking.assigneeId ?? booking.createdById) === profile.id
 return true // Preserve explicit booking grants for other existing duties.
}

export function canReadCustomers(profile) {
 return isManager(profile) || (effectiveAccess(profile, 'operations.booking').allowed && (activeRole(profile, 'BOOKING') || activeRole(profile, 'HEAD_BOOKING')))
}
