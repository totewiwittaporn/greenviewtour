import test from 'node:test'
import assert from 'node:assert/strict'
import {catalogPage,catalogPageHref,catalogIndexing} from '../../../packages/contracts/public-catalog-url.js'
test('Catalog page links preserve filters and travel inputs, with a stable first page',()=>{
 const search='ownership=PARTNER&duration=overnight&date=2026-11-01&pax=3&page=2'
 assert.equal(catalogPage(search),2)
 const next=catalogPageHref('/tours',search,3)
 assert.equal(next,'/tours?ownership=PARTNER&duration=overnight&date=2026-11-01&pax=3&page=3')
 assert.equal(catalogPageHref('/promotions','page=2',1),'/promotions')
 for(const value of ['0','-1','oops','1.5','100001'])assert.equal(catalogPage('page='+value),1)
})
test('Page2 stays self-canonical; filters and clamped pages are not indexable combinations',()=>{
 assert.deepEqual(catalogIndexing('/tours','page=2'),{canonical:'/tours?page=2',noindex:false})
 assert.deepEqual(catalogIndexing('/tours','ownership=PARTNER&duration=day&page=2&pax=3'),{canonical:'/tours?ownership=PARTNER&duration=day&page=2',noindex:true})
 assert.deepEqual(catalogIndexing('/tours','page=999',3),{canonical:'/tours?page=3',noindex:true})
 assert.deepEqual(catalogIndexing('/promotions','tour=reef%26boats&date=2026-11-01'),{canonical:'/tours?tour=reef%26boats',noindex:true})
 assert.deepEqual(catalogIndexing('/tours','tour=reef'),{canonical:'/tours?tour=reef',noindex:false})
})
