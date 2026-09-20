import test from 'node:test'
import assert from 'node:assert/strict'
import {createDemoPayment,applyDemoPaymentEvent,demoPaymentNotification,paymentReadiness} from '../src/platform/payments/preparation.js'
const now=new Date('2026-09-15T00:00:00Z')
const create=()=>createDemoPayment({orderId:'DEMO-BOOKING-1',amountMinor:250000,expiresAt:'2026-09-15T00:15:00Z'},now)
const event=p=>({id:'event-1',provider:'SIMULATOR',paymentId:p.id,orderId:p.orderId,amountMinor:p.amountMinor,currency:'THB',status:'SUCCEEDED'})
test('demo is explicitly nonpayable and rejects live orders/amounts',()=>{assert.equal(paymentReadiness().liveEnabled,false);assert.equal(create().qr,null);assert.throws(()=>createDemoPayment({orderId:'REAL-1',amountMinor:250000},now));assert.throws(()=>createDemoPayment({orderId:'DEMO-1',amountMinor:1.5},now))})
test('payment success is idempotent and cannot regress on late failure',()=>{const p=create(),e=event(p),paid=applyDemoPaymentEvent(p,e,now);assert.equal(paid.status,'SUCCEEDED');assert.deepEqual(applyDemoPaymentEvent(paid,e,now),paid);assert.equal(applyDemoPaymentEvent(paid,{...e,id:'event-2',status:'FAILED'},now).status,'SUCCEEDED');assert.equal(demoPaymentNotification(paid).audience,'CUSTOMER')})
test('mismatched reference, amount, currency and provider never mark paid',()=>{const p=create();for(const change of [{paymentId:'wrong'},{orderId:'other'},{amountMinor:1},{currency:'USD'},{provider:'STRIPE'}])assert.throws(()=>applyDemoPaymentEvent(p,{...event(p),...change},now));assert.equal(p.status,'PENDING')})
test('late money or money after failure needs review, not automatic fulfilment',()=>{const p=create(),e=event(p);assert.equal(applyDemoPaymentEvent(p,e,new Date('2026-09-15T00:16:00Z')).status,'REVIEW_REQUIRED');const failed=applyDemoPaymentEvent(p,{...e,status:'FAILED'},now);assert.equal(applyDemoPaymentEvent(failed,{...e,id:'new'},now).status,'REVIEW_REQUIRED');assert.throws(()=>demoPaymentNotification(failed))})
test('reused event IDs with different contents are rejected',()=>{const p=create(),e=event(p),paid=applyDemoPaymentEvent(p,e,now);assert.throws(()=>applyDemoPaymentEvent(paid,{...e,status:'FAILED'},now),/PAYMENT_EVENT_CONFLICT/)})
