// Booking employee commission is independent of supplier commissions and selling prices.
const rate = value => value == null ? null : String(value)
const cents = value => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')) }
const currency = value => `${value / 100n}.${String(value % 100n).padStart(2, '0')}`
export function bookingCommissionSnapshot({program, agent = null, adults, children, existing = null, ownerId = null}) {
 const previous = existing?.commissionSnapshot
 const programId = program?.id || null, agentId = agent?.id || null
 const sameIdentity = existing && (existing.trip?.tourId || existing.programSnapshot?.tourId || null) === programId && (existing.agentId || null) === agentId
 let conditions
 if (sameIdentity && previous) conditions = {...previous}
 else if (sameIdentity) conditions = {version:1,programId,agentId,eligible:false,reason:'LEGACY_UNCONFIGURED',adultRate:null,childRate:null,beneficiaryId:null}
 else conditions = {
  version:1,programId,agentId,programVersion:program?.version || null,agentVersion:agent?.version || null,
  programEligible:program?.bookingCommissionEligible === true,
  agentEligible:agent ? agent.bookingCommissionEligible === true : null,
  eligible:program?.bookingCommissionEligible === true && (!agent || agent.bookingCommissionEligible === true),
  reason:!program ? 'NO_PROGRAM' : program.bookingCommissionEligible !== true ? 'PROGRAM_DISABLED' : agent && agent.bookingCommissionEligible !== true ? 'AGENT_DISABLED' : 'ELIGIBLE',
  adultRate:rate(program?.bookingAdultCommission),childRate:rate(program?.bookingChildCommission),
  // Changing the owner or program must not transfer a previously recorded beneficiary.
  beneficiaryId:previous ? previous.beneficiaryId : ownerId,
 }
 const configured = (!adults || conditions.adultRate !== null) && (!children || conditions.childRate !== null)
 return {...conditions,adults,children,amount:!conditions.eligible?'0.00':configured?currency((adults?cents(conditions.adultRate)*BigInt(adults):0n)+(children?cents(conditions.childRate)*BigInt(children):0n)):null,status:!conditions.eligible?'NO_COMMISSION':!configured?'RATE_NOT_CONFIGURED':'CALCULATED',currency:'THB'}
}
