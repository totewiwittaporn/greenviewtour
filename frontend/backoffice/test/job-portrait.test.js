import test from 'node:test'
import assert from 'node:assert/strict'
import {documentDateCode} from '../src/features/operations/boat-document-format.js'
import {documentRows} from '../../../packages/contracts/job-print.js'
test('document identity follows Thailand service date across midnight and year-end',()=>{
 assert.equal(documentDateCode('2026-09-25T17:15:00Z'),'20260926')
 assert.equal(documentDateCode('2026-12-31T18:00:00Z'),'20270101')
 assert.equal(documentDateCode(new Date('2026-09-26T02:00:00Z')),'20260926')
})
test('invalid text-fragment sizes fail instead of looping',()=>{
 for(const size of [0,-1,1.5,NaN])assert.throws(()=>documentRows([],size),/INVALID_DOCUMENT_FRAGMENT_SIZE/)
})
