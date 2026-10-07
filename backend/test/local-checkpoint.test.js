import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {sourceProvenance,sourceFingerprint,verifySourceCheckpoint,reviewedAuthTransition,reviewedLineTransition,reviewedContactTransition,reviewedDigestTransition,reviewedOnboardingTransition,reviewedAddressTransition,reviewedUndatedTransition} from '../../scripts/local-import/checkpoint.js'
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8')
const hash=value=>createHash('sha256').update(value).digest('hex')
const undatedTarget=read('../prisma-d1/schema.prisma')
const addressTarget=undatedTarget.replace(' tripId String?\n',' tripId String\n').replace(' trip OperationTrip? @relation(fields:[tripId],references:[id],onDelete:Restrict)\n',' trip OperationTrip @relation(fields:[tripId],references:[id],onDelete:Restrict)\n')
const onboardingTarget=addressTarget.replace(' addressDetails Json?\n',''),onboardingAppendix='\n'+read('../prisma-d1/onboarding-models.prisma').replace(' addressDetails Json?\n','')
const digestTarget=onboardingTarget.slice(0,-onboardingAppendix.length).replace('model UserProfile {\n  firstName String?\n  lastName String?','model UserProfile {'),digestAppendix='\n'+read('../prisma-d1/digest-models.prisma')
const contactTarget=digestTarget.slice(0,-digestAppendix.length)
const currentTarget=contactTarget.replace('model CompanySettings {\n lineId String?\n instagramUrl String?','model CompanySettings {'),lineAppendix='\n'+read('../prisma-d1/line-models.prisma')
const target=currentTarget.slice(0,-lineAppendix.length),appendix='\n'+read('../prisma-d1/auth-models.prisma')
const summary=()=>{const provenance=sourceProvenance('verified-manifest','canonical-postgres',target);return {sourceRef:'fixture-source',sourceSnapshotAt:'2026-09-30',provenance,fingerprint:sourceFingerprint(provenance)}}
const original=s=>({sourceRef:s.sourceRef,sourceSnapshotAt:s.sourceSnapshotAt,fingerprint:sourceFingerprint({...s.provenance,d1SchemaSha256:reviewedAuthTransition.from})})
test('reviewed transition is exactly the existing D1 schema plus six Auth models',()=>{
 assert.ok(target.endsWith(appendix))
 const previous=target.slice(0,-appendix.length)
 assert.equal(hash(previous),reviewedAuthTransition.from)
 assert.equal(hash(target),reviewedAuthTransition.to)
 const names=source=>[...source.matchAll(/^model\s+(\w+)/gm)].map(match=>match[1])
 assert.deepEqual(names(appendix).sort(),['AuthAccount','AuthSession','AuthUser','AuthVerification','LocalMail','WebSession'])
 assert.equal(names(previous).length,75)
})
test('unchanged schema matches exact checkpoint without a transition',()=>{
 const s=summary(),marker={...original(s),fingerprint:s.fingerprint}
 assert.equal(verifySourceCheckpoint(marker,s).mode,'exact')
})
test('reviewed additive Auth schema verifies original binding without rewriting its marker',()=>{
 const s=summary(),marker=original(s),before=JSON.stringify(marker)
 const proof=verifySourceCheckpoint(marker,s)
 assert.equal(proof.mode,'reviewed-schema-transition');assert.equal(proof.transition,'0007_local_auth_sessions')
 assert.equal(proof.historicalCheckpointRewritten,false);assert.equal(JSON.stringify(marker),before)
})
test('source changes, unreviewed schema and metadata mismatches remain blocked',()=>{
 const s=summary(),marker=original(s)
 for(const key of ['manifestSha256','postgresSchemaSha256','d1SchemaSha256']){
  const provenance={...s.provenance,[key]:hash('changed-'+key)}
  assert.throws(()=>verifySourceCheckpoint(marker,{...s,provenance,fingerprint:sourceFingerprint(provenance)}),/SOURCE_CHECKPOINT_MISMATCH/)
 }
 for(const changed of [{sourceRef:'other-source'},{sourceSnapshotAt:'other-date'},{fingerprint:hash('invented')},{provenance:null}])assert.throws(()=>verifySourceCheckpoint(marker,{...s,...changed}),/SOURCE_(CHECKPOINT_MISMATCH|PROVENANCE_REQUIRED)/)
 assert.throws(()=>verifySourceCheckpoint({...marker,fingerprint:hash('wrong-marker')},s),/SOURCE_CHECKPOINT_MISMATCH/)
})
test('provenance accepts only SHA-256 digests and reuses the historical fingerprint format',()=>{
 const p=sourceProvenance('manifest','postgres','d1')
 assert.equal(sourceFingerprint(p),hash([hash('manifest'),hash('postgres'),hash('d1')].join(':')))
 for(const value of [null,{}, {...p,d1SchemaSha256:'bad'},{...p,manifestSha256:42}])assert.throws(()=>sourceFingerprint(value),/SOURCE_PROVENANCE_REQUIRED/)
})
test('staff LINE schema appends only three models and preserves both reviewed provenance steps',()=>{
 assert.ok(currentTarget.endsWith(lineAppendix))
 assert.equal(hash(target),reviewedLineTransition.from)
 assert.equal(hash(currentTarget),reviewedLineTransition.to)
 assert.deepEqual([...lineAppendix.matchAll(/^model\s+(\w+)/gm)].map(match=>match[1]).sort(),['StaffLineBinding','StaffLineEvent','StaffLineRequest'])
 const s=summary(),provenance={...s.provenance,d1SchemaSha256:hash(currentTarget)},next={...s,provenance,fingerprint:sourceFingerprint(provenance)}
 assert.equal(verifySourceCheckpoint(original(s),next).transition,'0007_local_auth_sessions -> 0008_staff_line_link')
 assert.equal(verifySourceCheckpoint({...original(s),fingerprint:s.fingerprint},next).transition,'0008_staff_line_link')
 assert.throws(()=>verifySourceCheckpoint({...original(s),fingerprint:hash('unreviewed')},next),/SOURCE_CHECKPOINT_MISMATCH/)
})

test('company contact extends only reviewed nullable D1 fields without changing source provenance',()=>{
 assert.equal(hash(currentTarget),reviewedContactTransition.from)
 assert.equal(hash(contactTarget),reviewedContactTransition.to)
 const s=summary(),provenance={...s.provenance,d1SchemaSha256:hash(contactTarget)},next={...s,provenance,fingerprint:sourceFingerprint(provenance)}
 assert.equal(verifySourceCheckpoint(original(s),next).transition,'0007_local_auth_sessions -> 0008_staff_line_link -> 0009_company_public_contact')
})

test('staff digest schema is additive and has an exact reviewed provenance step',()=>{
 assert.ok(digestTarget.endsWith(digestAppendix))
 assert.equal(hash(contactTarget),reviewedDigestTransition.from)
 assert.equal(hash(digestTarget),reviewedDigestTransition.to)
 const s=summary(),provenance={...s.provenance,d1SchemaSha256:hash(digestTarget)},next={...s,provenance,fingerprint:sourceFingerprint(provenance)}
 assert.equal(verifySourceCheckpoint(original(s),next).transition,'0007_local_auth_sessions -> 0008_staff_line_link -> 0009_company_public_contact -> 0010_staff_daily_digest')
})

test('employee onboarding preserves the previous schema and pins its additive transition',()=>{
 assert.ok(onboardingTarget.endsWith(onboardingAppendix))
 assert.equal(hash(digestTarget),reviewedOnboardingTransition.from)
 assert.equal(hash(onboardingTarget),reviewedOnboardingTransition.to)
 const s=summary(),provenance={...s.provenance,d1SchemaSha256:hash(onboardingTarget)},next={...s,provenance,fingerprint:sourceFingerprint(provenance)}
 assert.match(verifySourceCheckpoint(original(s),next).transition,/0011_employee_onboarding$/)
})

test('structured onboarding address is an exact additive provenance transition',()=>{
 assert.equal(hash(addressTarget.replace(' addressDetails Json?\n','')),reviewedAddressTransition.from)
 assert.equal(hash(addressTarget),reviewedAddressTransition.to)
 const s=summary(),provenance={...s.provenance,d1SchemaSha256:hash(addressTarget)},next={...s,provenance,fingerprint:sourceFingerprint(provenance)}
 assert.match(verifySourceCheckpoint(original(s),next).transition,/0012_onboarding_structured_address$/)
})
test('undated booking schema is the reviewed 0013 transition after structured onboarding',()=>{
 assert.equal(hash(addressTarget),reviewedUndatedTransition.from)
 assert.equal(hash(undatedTarget),reviewedUndatedTransition.to)
 const s=summary(),provenance={...s.provenance,d1SchemaSha256:hash(undatedTarget)},next={...s,provenance,fingerprint:sourceFingerprint(provenance)}
 assert.match(verifySourceCheckpoint(original(s),next).transition,/0013_undated_booking_drafts$/)
})
