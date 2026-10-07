// Read-only operator mailbox; links are never returned in the default listing.
import {DatabaseSync} from 'node:sqlite'
import {readdir,realpath} from 'node:fs/promises'
import path from 'node:path'
export function parseMailArgs(args){
 const options={}
 for(let i=0;i<args.length;i+=2){
  const key=args[i],value=args[i+1]
  if(!['--email','--kind','--open'].includes(key)||!value||value.startsWith('--')||options[key])throw new Error('LOCAL_MAIL_ARGUMENTS_INVALID')
  options[key]=value
 }
 if(options['--kind']&&!['reset','verify','invite'].includes(options['--kind']))throw new Error('LOCAL_MAIL_KIND_INVALID')
 if(options['--email']&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options['--email']))throw new Error('LOCAL_MAIL_EMAIL_INVALID')
 if(options['--open']&&!/^[a-f0-9-]{36}$/i.test(options['--open']))throw new Error('LOCAL_MAIL_ID_INVALID')
 return options
}
export function validateMailLink(link,kind){
 const url=new URL(link),fragment=new URLSearchParams(url.hash.slice(1))
 const key=kind==='reset'?'recovery':kind==='verify'?'verify':kind==='invite'?'invitation':null
 if(!key||url.protocol!=='http:'||!['localhost','127.0.0.1'].includes(url.hostname)||!['5174','5175'].includes(url.port)||url.username||url.password||url.search||!['/login','/reset-password','/onboarding'].includes(url.pathname)||[...fragment.keys()].join(',')!==key||!fragment.get(key))throw new Error('LOCAL_MAIL_LINK_INVALID')
 return url.href
}
export async function readLocalMail(state,options={}){
 const base=await realpath(state),directory=path.join(base,'v3/d1/miniflare-D1DatabaseObject')
 const candidates=(await readdir(directory,{withFileTypes:true})).filter(file=>file.isFile()&&file.name.endsWith('.sqlite'))
 const sources=[]
 for(const file of candidates){
  const target=await realpath(path.join(directory,file.name))
  if(!target.startsWith(base+path.sep))throw new Error('LOCAL_MAIL_DATABASE_INVALID')
  const db=new DatabaseSync(target,{readOnly:true})
  try{
   if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='LocalMail'").get())continue
   const clauses=[],values=[]
   for(const [key,column] of [['--email','recipient'],['--kind','kind'],['--open','id']])if(options[key]){clauses.push('"'+column+'"=?');values.push(key==='--email'?options[key].trim().toLowerCase():options[key])}
   const fields=options['--open']?'id,recipient,kind,createdAt,link':'id,recipient,kind,createdAt'
   sources.push(db.prepare('SELECT '+fields+' FROM LocalMail'+(clauses.length?' WHERE '+clauses.join(' AND '):'')+' ORDER BY createdAt DESC,id DESC LIMIT 20').all(...values))
  }finally{db.close()}
 }
 if(sources.length!==1)throw new Error('LOCAL_MAIL_DATABASE_NOT_READY')
 return sources[0]
}
