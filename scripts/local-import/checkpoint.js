// Source identity and schema provenance are separate from mutable application data.
// Only this reviewed, additive Auth schema transition can match a legacy marker.
import {createHash} from 'node:crypto'
const hash=value=>createHash('sha256').update(value).digest('hex')
export const reviewedAuthTransition=Object.freeze({
 id:'0007_local_auth_sessions',
 from:'de3711940fffb12c4fb3e060b7549a3a13f7fccaebba09f6a34fb059b3ce5a23',
 to:'dda84c6ec392771b8187902e3c24204485d238be985c7cf4c1534f71781592e6',
})
export const reviewedLineTransition=Object.freeze({id:'0008_staff_line_link',from:'dda84c6ec392771b8187902e3c24204485d238be985c7cf4c1534f71781592e6',to:'885c6f8403ac3d1615a526f355e9de9ad9e14c8d72a93a4f6bc6d258bb2547bc'})
export const reviewedContactTransition=Object.freeze({id:'0009_company_public_contact',from:reviewedLineTransition.to,to:'60f035f127e7dbeb5e20de33a2ac1347b135f2c14965daf1dad059a47115d52a'})
export const reviewedDigestTransition=Object.freeze({id:'0010_staff_daily_digest',from:reviewedContactTransition.to,to:'d3bc7582973c3106bd69fb8c4f37af13636f0da76239fa532097d3b65addbf76'})
export const reviewedOnboardingTransition=Object.freeze({id:'0011_employee_onboarding',from:reviewedDigestTransition.to,to:'a4735b0cb00a67c00e1e28bda3cacc2e4053984d716e8f18ecd540cf9b795d5b'})
export const reviewedAddressTransition=Object.freeze({id:'0012_onboarding_structured_address',from:reviewedOnboardingTransition.to,to:'4345270d2a11e3c2eb9b7d803c8900976549b5817d6a18190d7870dd018bf709'})
export const reviewedUndatedTransition=Object.freeze({id:'0013_undated_booking_drafts',from:reviewedAddressTransition.to,to:'108b948293e0f84f9a0184db5d6bef80592769ef915b6d41043a9dded031f543'})
export function sourceProvenance(manifest,postgres,d1){
 return {manifestSha256:hash(manifest),postgresSchemaSha256:hash(postgres),d1SchemaSha256:hash(d1)}
}
export function sourceFingerprint(provenance){
 const values=['manifestSha256','postgresSchemaSha256','d1SchemaSha256'].map(key=>provenance?.[key])
 if(values.some(value=>typeof value!=='string'||!/^[0-9a-f]{64}$/.test(value)))throw new Error('SOURCE_PROVENANCE_REQUIRED')
 return hash(values.join(':'))
}
export function verifySourceCheckpoint(marker,summary){
 const provenance=summary.provenance,current=sourceFingerprint(provenance)
 if(current!==summary.fingerprint||marker?.sourceRef!==summary.sourceRef||marker?.sourceSnapshotAt!==summary.sourceSnapshotAt)throw new Error('SOURCE_CHECKPOINT_MISMATCH')
 let mode='exact',transition=null
 if(marker.fingerprint!==current){
  let schema=provenance.d1SchemaSha256,matched=false;const applied=[]
  for(const step of [reviewedUndatedTransition,reviewedAddressTransition,reviewedOnboardingTransition,reviewedDigestTransition,reviewedContactTransition,reviewedLineTransition,reviewedAuthTransition]){
   if(schema!==step.to)continue
   schema=step.from;applied.push(step.id)
   if(marker.fingerprint===sourceFingerprint({...provenance,d1SchemaSha256:schema})){matched=true;break}
  }
  if(!matched)throw new Error('SOURCE_CHECKPOINT_MISMATCH')
  mode='reviewed-schema-transition';transition=applied.reverse().join(' -> ')
 }
 return {status:'PASS',mode,transition,originalFingerprint:marker.fingerprint,currentFingerprint:current,sourceUnchanged:true,historicalCheckpointRewritten:false}
}
