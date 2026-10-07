import test from 'node:test'
import assert from 'node:assert/strict'
import {migratedDirectoryExpected} from '../../scripts/local-import/directory.js'
const row={id:'fixture',email:'fixture@example.test',created_at:null,email_confirmed_at:null,last_sign_in_at:null,provider:'supabase-source'}
test('a matching migrated Auth row changes only the expected provider label',()=>{
 const expected=migratedDirectoryExpected([row],[{id:row.id,email:row.email}])
 assert.deepEqual(expected,[{...row,provider:'better-auth'}]);assert.equal(row.provider,'supabase-source')
 assert.equal(expected[0].created_at,null)
})
test('a non-migrated source identity retains its exact original projection',()=>{
 assert.deepEqual(migratedDirectoryExpected([row],[]),[row])
})
test('migration metadata cannot hide changed source email or duplicate account identity',()=>{
 assert.throws(()=>migratedDirectoryExpected([row],[{id:row.id,email:'different@example.test'}]),/IDENTITY_AUTH_EMAIL_DIFFERS/)
 assert.throws(()=>migratedDirectoryExpected([row],[{id:row.id,email:row.email},{id:row.id,email:row.email}]),/IDENTITY_AUTH_DUPLICATE/)
})
