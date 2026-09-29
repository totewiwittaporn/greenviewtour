
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

test('Tour Detail delegates gallery interaction to Public Core',()=>{
 const detail=readFileSync(new URL('../src/features/catalog/TourDetail.jsx',import.meta.url),'utf8')
 const gallery=readFileSync(new URL('../src/core/ui/ImageGallery.jsx',import.meta.url),'utf8')
 assert.match(detail,/core\/ui\/ImageGallery\.jsx/)
 assert.match(detail,/<ImageGallery /)
 assert.doesNotMatch(detail,/tour-thumb-row|tour-gallery-count|tour-hero-image/)
 assert.match(gallery,/ArrowLeft/)
 assert.match(gallery,/ArrowRight/)
 assert.match(gallery,/onTouchStart/)
 assert.match(gallery,/showModal/)
 assert.match(gallery,/CloseButton/)
})
