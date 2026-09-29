import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=relative=>readFileSync(new URL(relative,import.meta.url),'utf8')
test('Member explicitly blocks search indexing at document and crawler layers',()=>{
 const html=read('../index.html'),robots=read('../public/robots.txt'),headers=read('../public/_headers')
 assert.match(html,/name="robots" content="noindex, nofollow, noarchive, nosnippet"/)
 assert.match(robots,/User-agent: \*\s+Disallow: \//)
 assert.match(headers,/X-Robots-Tag: noindex, nofollow, noarchive, nosnippet/)
})
