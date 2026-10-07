import {spawn} from 'node:child_process'
import {createWriteStream,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

const stamp=new Date().toISOString().replace(/[:.]/g,'-')
const logPath=join(tmpdir(),`greenview-check-${stamp}.log`)
const npmCli=process.env.npm_execpath
const command=npmCli?process.execPath:'npm'
const args=npmCli?[npmCli,'run','check']:['run','check']
const log=createWriteStream(logPath,{flags:'w'})
const child=spawn(command,args,{cwd:new URL('..',import.meta.url),shell:false,stdio:['ignore','pipe','pipe']})
child.stdout.pipe(log,{end:false})
child.stderr.pipe(log,{end:false})

child.on('error',error=>{
  console.error('CHECK_START_FAILED',error.code||error.name)
  log.end()
  process.exitCode=1
})

child.on('close',code=>{
  log.end(()=>{
    const output=readFileSync(logPath,'utf8')
    const lines=output.split(/\r?\n/)
    const summary=lines.filter(line=>/^# (tests|pass|fail) /.test(line)||/✓ built in /.test(line)||/Total Upload:/.test(line)||/^ERROR|^Error|^FAIL|not ok /.test(line))
    console.log(`CHECK_EXIT=${code??1}`)
    console.log(`CHECK_LOG=${logPath}`)
    for(const line of summary.slice(-80))console.log(line)
    if(code){
      console.log('--- CHECK TAIL ---')
      for(const line of lines.slice(-80))console.log(line)
    }
    process.exitCode=code??1
  })
})
