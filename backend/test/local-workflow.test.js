import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import path from 'node:path'
import {auditLocalWorkflow} from '../../scripts/audit-local-workflow.js'
import {root,localEnvironment} from '../../scripts/local-cloudflare-policy.js'
import {createAuthProvider} from '../src/platform/auth/provider.js'
import {createDatabasePool} from '../src/platform/database/pool.js'
import {createPrisma} from '../src/platform/database/prisma.js'
import {databaseConfig} from '../src/platform/database/config.js'
const environment=localEnvironment()
test('the active workflow contains no source-provider entrypoints or hosted configuration',async()=>{
 const report=await auditLocalWorkflow();assert.equal(report.status,'PASS',JSON.stringify(report.failures));assert.equal(report.retiredEntrypoints,35)
})
test('former source factories fail before reading even a supplied credential object',()=>{
 const unreadable=new Proxy({},{get(){throw new Error('ENVIRONMENT_MUST_NOT_BE_READ')}})
 for(const factory of [createAuthProvider,createDatabasePool,createPrisma,databaseConfig])assert.throws(()=>factory(unreadable),{code:'LEGACY_SOURCE_RUNTIME_RETIRED'})
})
test('all retired CLI paths reject execution, including apply, send and remote flags',()=>{
 const retired=JSON.parse(readFileSync(path.join(root,'scripts/retired-commands.json'),'utf8'))
 for(const entry of retired){
  assert.throws(()=>execFileSync(process.execPath,[entry.path,'--apply','--send','--remote'],{cwd:root,env:environment,stdio:'pipe',timeout:5000}),error=>{
   assert.equal(error.status,1,entry.path);assert.match(error.stderr.toString(),/LEGACY_SOURCE_COMMAND_RETIRED/,entry.path);return true
  })
 }
})
test('Prisma reference CLI refuses database commands before any connection',()=>{
 assert.throws(()=>execFileSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','status','--config','prisma.config.ts'],{cwd:path.join(root,'backend'),env:environment,stdio:'pipe',timeout:10000}),error=>{
  assert.notEqual(error.status,0);assert.match(error.stderr.toString()+error.stdout.toString(),/REFERENCE_DATABASE_COMMAND_RETIRED/);return true
 })
})
test('development and migration CLIs reject hosted flags without starting services',()=>{
 for(const args of [['scripts/dev.js','--remote'],['scripts/local-cloudflare.js','migrate','--remote'],['scripts/local-cloudflare.js','deploy']])assert.throws(()=>execFileSync(process.execPath,args,{cwd:root,env:environment,stdio:'pipe',timeout:5000}),error=>{assert.equal(error.status,1);return true})
 assert.throws(()=>execFileSync(process.execPath,['scripts/dev.js'],{cwd:root,env:{...environment,APP_ENV:'production'},stdio:'pipe',timeout:5000}),error=>{assert.match(error.stderr.toString(),/PRODUCTION_CONTEXT_FORBIDDEN/);return true})
})
