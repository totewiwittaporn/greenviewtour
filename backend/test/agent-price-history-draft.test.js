import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {readFileSync,readdirSync} from 'node:fs'
test('price history draft protects immutable audit revisions and command/version uniqueness',t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close())
 const directory=new URL('../prisma-d1/migrations/',import.meta.url)
 for(const file of readdirSync(directory).filter(n=>n.endsWith('.sql')).sort())db.exec(readFileSync(new URL(file,directory),'utf8'))
 db.exec(readFileSync(new URL('../prisma-d1/drafts/agent-price-history.sql',import.meta.url),'utf8'))
 const insert=db.prepare('INSERT INTO AuditEvent (id,actorId,targetId,action,details) VALUES (?,?,?,?,?)')
 insert.run('revision','actor','rate','settings.rates.revision',JSON.stringify({version:1,adultPrice:'1000.10',childPrice:null,seasonId:null}))
 assert.throws(()=>insert.run('duplicate','actor','rate','settings.rates.revision',JSON.stringify({version:1})),/UNIQUE/)
 assert.throws(()=>db.exec("UPDATE AuditEvent SET details='{}' WHERE id='revision'"),/PRICE_HISTORY_IMMUTABLE/)
 assert.throws(()=>db.exec("DELETE FROM AuditEvent WHERE id='revision'"),/PRICE_HISTORY_IMMUTABLE/)
 insert.run('confirmation','actor','booking','operations.booking.price.confirmed',JSON.stringify({bookingVersion:4,commandId:'command',choice:'KEEP_STORED'}))
 assert.throws(()=>insert.run('duplicate-command','actor','booking-2','operations.booking.price.confirmed',JSON.stringify({bookingVersion:1,commandId:'command'})),/UNIQUE/)
 assert.throws(()=>insert.run('concurrent-command','actor','booking','operations.booking.price.confirmed',JSON.stringify({bookingVersion:4,commandId:'other-command'})),/UNIQUE/)
 assert.throws(()=>db.exec("UPDATE AuditEvent SET action='other' WHERE id='confirmation'"),/PRICE_HISTORY_IMMUTABLE/)
 assert.throws(()=>db.exec("DELETE FROM AuditEvent WHERE id='confirmation'"),/PRICE_HISTORY_IMMUTABLE/)
 assert.equal(db.prepare('SELECT count(*) AS n FROM AuditEvent').get().n,2)
})
