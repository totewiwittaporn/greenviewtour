// Calendar dates and fixed-cent amounts; no provider or database side effects.
import { cents } from './personnel-finance.js'

export function billingDate(value) {
 if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(+new Date(value)) || new Date(value).toISOString().slice(0,10) !== value) throw new Error('INVALID_BILLING_DATE')
 return value
}
export function addBillingPeriod(day, count, unit) {
 billingDate(day)
 if (!Number.isSafeInteger(count) || count < 0 || count > 3660 || !['DAY','WEEK','MONTH'].includes(unit)) throw new Error('INVALID_BILLING_PERIOD')
 const date = new Date(day+'T00:00:00Z')
 if (unit === 'MONTH') {
  const target = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+count,1))
  const last = new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate()
  target.setUTCDate(Math.min(date.getUTCDate(),last))
  return target.toISOString().slice(0,10)
 }
 date.setUTCDate(date.getUTCDate()+count*(unit==='WEEK'?7:1))
 return date.toISOString().slice(0,10)
}
export function validateBillingPolicy(policy) {
 if (policy == null) return null
 if (typeof policy !== 'object' || Array.isArray(policy) || Object.keys(policy).some(k=>!['mode','cycleCount','cycleUnit','cycleAnchor','creditCount','creditUnit','creditAnchor'].includes(k))) throw new Error('INVALID_BILLING_POLICY')
 if (!['IMMEDIATE','BILLING'].includes(policy.mode)) throw new Error('INVALID_BILLING_POLICY')
 if (policy.mode === 'IMMEDIATE') return {mode:'IMMEDIATE'}
 billingDate(policy.cycleAnchor)
 if (!Number.isSafeInteger(policy.cycleCount) || policy.cycleCount < 1 || !['CYCLE_CLOSE','BILL_ISSUED','BILL_RECEIVED'].includes(policy.creditAnchor)) throw new Error('INVALID_BILLING_POLICY')
 addBillingPeriod(policy.cycleAnchor,policy.cycleCount,policy.cycleUnit)
 addBillingPeriod(policy.cycleAnchor,policy.creditCount,policy.creditUnit)
 return {...policy}
}
export function billingCycleClose(policy, completedOn) {
 policy=validateBillingPolicy(policy);billingDate(completedOn)
 if (!policy || policy.mode==='IMMEDIATE') return policy?completedOn:null
 if(completedOn<policy.cycleAnchor)return null
 // Calculate every boundary from the original anchor, preserving month-end intent.
 for(let n=0;n<=3660;n++){
  const count=n*policy.cycleCount
  if(count>3660)return null
  const boundary=addBillingPeriod(policy.cycleAnchor,count,policy.cycleUnit)
  if(boundary>=completedOn)return boundary
 }
 return null
}
export function billingDueDate(policy,{cycleCloseOn,issuedOn,receivedOn}={}) {
 policy=validateBillingPolicy(policy)
 if(!policy)return null
 const anchor=policy.mode==='IMMEDIATE'?issuedOn:{CYCLE_CLOSE:cycleCloseOn,BILL_ISSUED:issuedOn,BILL_RECEIVED:receivedOn}[policy.creditAnchor]
 if(!anchor)return null
 return addBillingPeriod(anchor,policy.mode==='IMMEDIATE'?0:policy.creditCount,policy.mode==='IMMEDIATE'?'DAY':policy.creditUnit)
}
export function agentCollection({net,received,basis,outstanding='0'}) {
 const netCents=cents(net),receivedCents=cents(received),outstandingCents=cents(outstanding)
 if(netCents<=0 || !['NET_ONLY','FULL'].includes(basis) || receivedCents<netCents || basis==='NET_ONLY'&&receivedCents!==netCents)throw new Error('INVALID_AGENT_COLLECTION')
 const margin=receivedCents-netCents,offset=Math.min(margin,outstandingCents)
 return {netCents,receivedCents,marginCents:margin,offsetCents:offset,refundableCents:margin-offset,outstandingCents:outstandingCents-offset}
}
