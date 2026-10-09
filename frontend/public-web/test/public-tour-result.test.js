import test from 'node:test'
import assert from 'node:assert/strict'
import {publicTourResult} from '../../../packages/contracts/public-tour-result.js'

test('Tour status contract distinguishes absence from malformed or unrelated service data',()=>{
 assert.deepEqual(publicTourResult({rows:[],total:0},'wanted'),{status:404})
 for(const data of [null,{}, {rows:null,total:0},{rows:[],total:1},{rows:[],total:-1},{rows:[{slug:'wanted'}],total:0},{rows:[{slug:'other'}],total:1}])assert.equal(publicTourResult(data,'wanted').status,503)
 const wanted={slug:'wanted',name:'Requested tour'}
 assert.deepEqual(publicTourResult({rows:[wanted],total:1},'wanted'),{status:200,tour:wanted})
 assert.deepEqual(publicTourResult({rows:[{slug:'other'},wanted],total:2},'wanted'),{status:200,tour:wanted})
})
