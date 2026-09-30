import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {root,configPath,statePath,validateCommand,validateLocalConfig,localEnvironment,localPlan} from '../../scripts/local-cloudflare-policy.js'
const readConfig=()=>JSON.parse(readFileSync(configPath,'utf8'))
test('Local Cloudflare uses only local D1/R2 with publishing disabled',()=>{
  assert.equal(validateLocalConfig(readConfig()).vars.APP_ENV,'local')
  for(const change of [c=>{c.vars.APP_ENV='production'},c=>{c.d1_databases[0].remote=true},c=>{c.d1_databases[0].database_id='actual-id'},c=>{c.r2_buckets[0].remote=true},c=>{c.workers_dev=true},c=>{c.preview_urls=true},c=>{c.env={preview:{}}},c=>{c.services=[{binding:'API'}]},c=>{c.dev.ip='0.0.0.0'},c=>{c.vars.PGPASSWORD='test-only'}]){
    const config=readConfig();change(config);assert.throws(()=>validateLocalConfig(config))
  }
})
test('Local commands reject remote, production and arbitrary flag injection',()=>{
  assert.equal(validateCommand(['setup']),'setup')
  for(const args of [[],['deploy'],['dev','--remote'],['migrate','--env','production'],['dev','--config','another.json'],['test','--temporary']])assert.throws(()=>validateCommand(args),/LOCAL_COMMAND_ONLY/)
})
test('Local child processes receive no provider credentials or shell overrides',()=>{
  const env=localEnvironment({HOME:'/local-home',CLOUDFLARE_API_TOKEN:'test-only',SUPABASE_URL:'test-only',PGPASSWORD:'test-only',LINE_CHANNEL_ACCESS_TOKEN:'test-only',NODE_OPTIONS:'test-only',CLOUDFLARE_INCLUDE_PROCESS_ENV:'true'})
  assert.equal(env.HOME,'/local-home');assert.equal(env.APP_ENV,'local');assert.equal(env.TZ,'UTC')
  assert.equal(env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV,'false')
  assert.equal(env.CLOUDFLARE_INCLUDE_PROCESS_ENV,'false')
  for(const key of ['CLOUDFLARE_API_TOKEN','SUPABASE_URL','PGPASSWORD','LINE_CHANNEL_ACCESS_TOKEN','NODE_OPTIONS'])assert.equal(env[key],undefined)
})
test('Every mutating D1 plan is local and every deploy plan is dry-run only',()=>{
  for(const command of ['setup','generate','migrate','types','dev','bundle','test'])for(const args of localPlan(command)){
    assert.ok(!args.includes('--remote'));assert.ok(!args.includes('--env'));assert.ok(!args.includes('--temporary'))
    if(args.includes('migrations')){assert.ok(args.includes('--local'));assert.ok(args.includes(statePath))}
    if(args.includes('dev'))assert.ok(args.includes('--local'))
    if(args.includes('deploy'))assert.ok(args.includes('--dry-run'))
  }
})
test('Existing D1 migration SQL has not been rewritten',()=>{
  const directory=path.join(root,'backend/prisma-d1')
  const hashes=JSON.parse(readFileSync(path.join(directory,'migration-checksums.json'),'utf8'))
  assert.equal(Object.keys(hashes).length,3)
  for(const [name,expected] of Object.entries(hashes))assert.equal(createHash('sha256').update(readFileSync(path.join(directory,'migrations',name))).digest('hex'),expected)
})
test('Production config remains an unbound example, not an enabled environment',()=>{
  const production=JSON.parse(readFileSync(path.join(root,'backend/wrangler.production.jsonc.example'),'utf8'))
  assert.equal(production.vars.APP_ENV,'production')
  assert.match(production.d1_databases[0].database_id,/SET_ONLY_AFTER_PRODUCTION_RELEASE_APPROVAL/)
  assert.equal(production.preview_urls,false);assert.equal(production.workers_dev,false)
  assert.throws(()=>validateLocalConfig(production))
})
