import {fileURLToPath} from 'node:url'
import path from 'node:path'
export const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)))
export const configPath=path.join(root,'backend/wrangler.jsonc')
export const statePath=path.join(root,'.local/cloudflare')
export const localDatabaseId='00000000-0000-0000-0000-000000000002'
export const commands=['setup','generate','migrate','types','dev','bundle','test']
export function validateCommand(args){
  if(args.length!==1||!commands.includes(args[0]))throw new Error('LOCAL_COMMAND_ONLY: setup, generate, migrate, types, dev, bundle, test; no flags or remote commands')
  return args[0]
}
export function validateLocalConfig(config){
  const allowed=['$schema','name','main','compatibility_date','compatibility_flags','observability','d1_databases','r2_buckets','vars','workers_dev','preview_urls','dev']
  if(Object.keys(config).some(key=>!allowed.includes(key)))throw new Error('UNREVIEWED_LOCAL_CONFIG')
  if(config.name!=='greenviewtour-api-local'||config.main!=='src/cloudflare/worker.ts'||config.vars?.APP_ENV!=='local')throw new Error('LOCAL_CONFIG_REQUIRED')
  if(config.workers_dev!==false||config.preview_urls!==false)throw new Error('LOCAL_PUBLISHING_MUST_BE_DISABLED')
  if(config.dev?.ip!=='127.0.0.1'||config.dev?.local_protocol!=='http')throw new Error('LOOPBACK_ONLY')
  const [database,...extraDatabases]=config.d1_databases||[]
  const [files,...extraBuckets]=config.r2_buckets||[]
  if(extraDatabases.length||database?.binding!=='DB'||database.database_id!==localDatabaseId||database.database_name!=='greenviewtour-local'||database.remote!==false||database.migrations_dir!=='prisma-d1/migrations')throw new Error('LOCAL_D1_ONLY')
  if(extraBuckets.length||files?.binding!=='FILES'||files.bucket_name!=='greenviewtour-local-files'||files.remote!==false)throw new Error('LOCAL_R2_ONLY')
  if(Object.keys(config.vars).some(key=>!['APP_ENV','D1_LOCATION_HINT'].includes(key)))throw new Error('UNREVIEWED_LOCAL_VARIABLE')
  return config
}
export function localEnvironment(source=process.env){
  const allowed=['HOME','USERPROFILE','TMPDIR','TEMP','TMP','SystemRoot','WINDIR','COMSPEC','TERM']
  const env=Object.fromEntries(allowed.filter(key=>typeof source[key]==='string').map(key=>[key,source[key]]))
  env.PATH=[path.dirname(process.execPath),'/opt/homebrew/bin','/usr/bin','/bin','/usr/sbin','/sbin'].join(path.delimiter)
  return {...env,NODE_ENV:'development',APP_ENV:'local',TZ:'UTC',CI:'true',WRANGLER_SEND_METRICS:'false',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false',CLOUDFLARE_INCLUDE_PROCESS_ENV:'false'}
}
export function localPlan(command,persist=statePath){
  validateCommand([command])
  const wrangler=path.join(root,'node_modules/wrangler/bin/wrangler.js')
  const common=['--config','backend/wrangler.jsonc','--env-file','backend/cloudflare.env']
  const wrangle=args=>[wrangler,...args,...common]
  const generate=[
    ['backend/scripts/generate-d1-schema.js'],
    ['backend/scripts/generate-d1-atomic-metadata.mjs'],
    ['node_modules/prisma/build/index.js','generate','--schema','backend/prisma-d1/schema.prisma','--config','backend/prisma-d1/prisma.config.ts'],
  ]
  const types=wrangle(['types','backend/src/cloudflare/env.d.ts'])
  const migrate=wrangle(['d1','migrations','apply','DB','--local','--persist-to',persist])
  const plans={
    setup:[...generate,types,migrate],generate,migrate:[migrate],types:[types],
    dev:[wrangle(['dev','--local','--ip','127.0.0.1','--port','8787','--persist-to',persist])],
    bundle:[...generate,types,wrangle(['deploy','--dry-run'])],
    test:[['scripts/test-local-cloudflare.mjs']],
  }
  return plans[command]
}
