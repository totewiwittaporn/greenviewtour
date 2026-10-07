import test from 'node:test'
import assert from 'node:assert/strict'
import {watchMemberAuthCallbacks} from '../src/core/auth-callback.js'
function browser(){
 const listeners=new Set(),state={reloads:0}
 const target={location:{pathname:'/login',hash:'',reload(){state.reloads++}},addEventListener(event,listener){assert.equal(event,'hashchange');listeners.add(listener)},removeEventListener(event,listener){assert.equal(event,'hashchange');listeners.delete(listener)}}
 return {target,state,emit(){for(const listener of listeners)listener()},listeners}
}
test('same-document recovery and verification links restart callback bootstrap once per event',()=>{
 const b=browser(),cleanup=watchMemberAuthCallbacks(b.target)
 for(const fragment of ['#recovery=one-use-token','#verify=email-token']){b.target.location.hash=fragment;b.emit()}
 assert.equal(b.state.reloads,2)
 cleanup();b.emit();assert.equal(b.state.reloads,2)
 assert.equal(b.listeners.size,0)
})
test('ordinary hashes, empty tokens and non-login routes never reload',()=>{
 const b=browser(),cleanup=watchMemberAuthCallbacks(b.target)
 for(const fragment of ['','#content','#recovery=','#verify=','#other=value']){b.target.location.hash=fragment;b.emit()}
 b.target.location.pathname='/tours';b.target.location.hash='#recovery=token';b.emit()
 assert.equal(b.state.reloads,0);cleanup()
})
test('StrictMode mount-cleanup-remount retains one callback listener',()=>{
 const b=browser();watchMemberAuthCallbacks(b.target)()
 const cleanup=watchMemberAuthCallbacks(b.target)
 assert.equal(b.listeners.size,1);b.target.location.hash='#verify=token';b.emit()
 assert.equal(b.state.reloads,1);cleanup()
})
