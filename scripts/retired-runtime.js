// No environment, filesystem, network or credential reads are permitted here.
export function retiredSource(){
 const error=new Error('LEGACY_SOURCE_RUNTIME_RETIRED: use the Local Worker/D1 runtime')
 error.code='LEGACY_SOURCE_RUNTIME_RETIRED'
 throw error
}
