// Produces review artifacts only; has no Cloudflare client or deployment capability.
import {readFile,mkdir,writeFile,realpath} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {prepareOwnerBootstrap} from '../backend/src/platform/auth/cloudflare/owner-bootstrap.js'
const root=await realpath(fileURLToPath(new URL('..',import.meta.url)))
try{
 const args=process.argv.slice(2)
 if(args.length!==4||args[0]!=='--config'||args[2]!=='--output'||!path.isAbsolute(args[1])||!path.isAbsolute(args[3]))throw new Error('USAGE: --config ABSOLUTE_JSON_FILE --output NEW_ABSOLUTE_PRIVATE_DIRECTORY')
 const input=JSON.parse(await readFile(args[1],'utf8'))
 if(Object.keys(input).some(key=>!['email','displayName','origin','accountId','databaseId','databaseName','environment'].includes(key)))throw new Error('UNEXPECTED_CONFIGURATION_FIELD')
 const prepared=prepareOwnerBootstrap(input),output=path.resolve(args[3])
 const parent=await realpath(path.dirname(output))
 if(parent===root||parent.startsWith(root+path.sep))throw new Error('PRIVATE_OUTPUT_OUTSIDE_REPOSITORY_REQUIRED')
 const directory=path.join(parent,path.basename(output))
 await mkdir(directory,{mode:0o700}) // Existing directories are refused, never overwritten.
 await writeFile(path.join(directory,'owner.private.sql'),prepared.sql,{mode:0o600,flag:'wx'})
 await writeFile(path.join(directory,'onboarding.private.txt'),prepared.onboardingLink+'\n',{mode:0o600,flag:'wx'})
 await writeFile(path.join(directory,'target.private.json'),JSON.stringify(prepared.metadata,null,2)+'\n',{mode:0o600,flag:'wx'})
 console.log('OWNER_BOOTSTRAP_PREPARED: private files created; no database changed or email sent')
}catch(error){console.error(error.message?.startsWith('USAGE:')?error.message:/^[A-Z_]+$/.test(error.message||'')?error.message:'OWNER_BOOTSTRAP_PREPARATION_FAILED');process.exitCode=1}
