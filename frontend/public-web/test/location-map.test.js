import test from 'node:test'
import assert from 'node:assert/strict'
import {locationMapEmbed,verifiedPierEmbed,verifiedPierMapUrl} from '../src/features/home/locationMap.js'
test('verified pier embed is only used for the verified company map link',()=>{
 assert.equal(locationMapEmbed({mapUrl:verifiedPierMapUrl},null),verifiedPierEmbed)
 assert.equal(locationMapEmbed({mapUrl:'https://maps.app.goo.gl/another-location'},null),null)
 assert.equal(locationMapEmbed(null,null),null)
 assert.equal(locationMapEmbed({mapUrl:'https://maps.app.goo.gl/another-location'},'9,98'),'https://www.google.com/maps?q=9%2C98&output=embed')
})
