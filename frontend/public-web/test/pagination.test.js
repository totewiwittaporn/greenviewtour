
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {paginationItems} from '../src/core/ui/pagination.js'

test('Core pagination keeps first/last pages visible and adds ellipsis only when needed',()=>{
 assert.deepEqual(paginationItems(1,1),[1])
 assert.deepEqual(paginationItems(1,5),[1,2,3,4,5])
 assert.deepEqual(paginationItems(1,7),[1,2,3,'ellipsis',7])
 assert.deepEqual(paginationItems(4,7),[1,'ellipsis',3,4,5,'ellipsis',7])
 assert.deepEqual(paginationItems(7,7),[1,'ellipsis',5,6,7])
})

test('Tour catalog delegates page navigation to Public Core Pagination',()=>{
 const source=readFileSync(new URL('../src/features/catalog/Catalog.jsx',import.meta.url),'utf8')
 assert.match(source,/core\/ui\/Pagination\.jsx/)
 assert.match(source,/<Pagination /)
 assert.doesNotMatch(source,/className="catalog-pages"/)
})
