import {DatabaseSync} from 'node:sqlite'
import {readFileSync,readdirSync} from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {publicCompany} from '../src/modules/commerce/service.js'

test('public company projects shared contact and never publishes company private fields',async()=>{
 let select
 const row={name:'Greenview Tour',phone:'095-426-6847',email:null,lineId:'@greenviewtour',instagramUrl:'https://instagram.com/greenviewtour',bankAccountNumber:'private',taxId:'private',version:9}
 const {company}=await publicCompany({companySettings:{findFirst:async args=>{select=args.select;return row}}})
 assert.equal(company.phone,'+66954266847');assert.equal(company.email,null)
 assert.equal(company.lineId,row.lineId);assert.equal(company.instagramUrl,'https://www.instagram.com/greenviewtour/')
 for(const key of ['bankAccountNumber','taxId','version']){assert.equal(key in select,false);assert.equal(key in company,false)}
})
test('public contact omits unsafe imported channels and supports an absent company',async()=>{
 const {company}=await publicCompany({companySettings:{findFirst:async()=>({name:'Greenview',phone:'bad',email:'bad',lineId:'javascript:alert(1)',instagramUrl:'https://evil.test/'})}})
 for(const key of ['phone','email','lineId','instagramUrl'])assert.equal(company[key],null)
 assert.deepEqual(await publicCompany({companySettings:{findFirst:async()=>null}}),{company:null})
})

test('reviewed Local migration updates contact only and preserves existing company identity and private fields',()=>{
 const db=new DatabaseSync(':memory:'),directory=new URL('../prisma-d1/migrations/',import.meta.url)
 try {
  for(const name of readdirSync(directory).filter(name=>name.endsWith('.sql')&&name<'0009').sort())db.exec(readFileSync(new URL(name,directory),'utf8'))
  db.prepare('INSERT INTO "CompanySettings" (id,name,phone,email,taxId,bankAccountNumber,address,version,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)').run('company-fixture','Retained company','old phone','old@example.test','1234567890123','private account','retained address',7,'2026-01-01T00:00:00Z')
  db.exec(readFileSync(new URL('0009_company_public_contact.sql',directory),'utf8'))
  const row=db.prepare('SELECT * FROM "CompanySettings"').get()
  assert.equal(row.id,'company-fixture');assert.equal(row.name,'Retained company');assert.equal(row.address,'retained address')
  assert.equal(row.taxId,'1234567890123');assert.equal(row.bankAccountNumber,'private account');assert.equal(row.version,8)
  assert.equal(row.phone,'+66954266847');assert.equal(row.email,null);assert.equal(row.lineId,'@greenviewtour');assert.equal(row.instagramUrl,'https://www.instagram.com/greenviewtour/')
  assert.equal(db.prepare('SELECT count(*) AS total FROM "CompanySettings"').get().total,1)
 } finally {db.close()}
})
