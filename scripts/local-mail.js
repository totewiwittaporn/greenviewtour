// Local operator command. No SMTP, provider calls, state writes or printed tokens.
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {statePath} from './local-cloudflare-policy.js'
import {localPreflight} from './local-cloudflare-safety.js'
import {parseMailArgs,readLocalMail,validateMailLink} from './local-mail-lib.js'
try{
 const options=parseMailArgs(process.argv.slice(2))
 await localPreflight()
 const rows=await readLocalMail(statePath,options)
 if(options['--open']){
  if(rows.length!==1)throw new Error('LOCAL_MAIL_NOT_FOUND')
  const link=validateMailLink(rows[0].link,rows[0].kind)
  if(process.platform!=='darwin')throw new Error('LOCAL_MAIL_OPEN_REQUIRES_OWNER_MAC')
  await promisify(execFile)('/usr/bin/open',[link],{timeout:10000})
  console.log('Opened the selected Local '+rows[0].kind+' message. The token was not printed.')
 }else{
  console.table(rows)
  console.log('Local messages only; no email is sent. Open one with: npm run local:mail -- --open <id>')
 }
}catch(error){console.error('LOCAL_MAIL_FAILED',/^[A-Z_]+$/.test(error.message)?error.message:'LOCAL_MAIL_READ_FAILED');process.exitCode=1}
