// CustomerProfile.authUserId is optional: staff may record non-member customers.
// A non-null reference to an absent account is still a real migration blocker.
export function inspectSourceIdentity(authIds,profiles,customers){
 const missingStaff=profiles.filter(row=>!authIds.has(row.id))
 const withoutAccount=customers.filter(row=>row.authUserId===null)
 const missingCustomers=customers.filter(row=>row.authUserId!==null&&!authIds.has(row.authUserId))
 const ready=missingStaff.length===0&&missingCustomers.length===0
 return {
  identity:{sourceAuthUsers:authIds.size,staffProfiles:profiles.length,customerProfiles:customers.length,customersWithoutAccount:withoutAccount.length,missingStaffAuth:missingStaff.length,missingCustomerAuth:missingCustomers.length,authCredentialsImported:false,readyForAuthCutover:ready},
  identityIssues:{staff:missingStaff.map(row=>({id:row.id,status:row.status})),customers:missingCustomers.map(row=>({id:row.id,authUserId:row.authUserId,status:row.status})),action:ready?'NO_MISSING_AUTH_REFERENCES':'PRESERVED_UNCHANGED_AUTH_CUTOVER_BLOCKED'},
 }
}
