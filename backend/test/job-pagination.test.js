import test from 'node:test'
import assert from 'node:assert/strict'
import {paginateJobRuns} from '../../packages/contracts/job-pagination.js'
import {documentRows,manifestPrograms} from '../../packages/contracts/job-print.js'
import {jobCodeGuide} from '../../packages/contracts/job-code-guide.js'
const geometry={pageHeight:1000,firstHeader:200,nextHeader:70,tail:60,maxRows:20}
const run=(count,rowHeight=30)=>({head:70,foot:50,rows:Array(count).fill(rowHeight)})
test('twenty-row cap uses balanced pages for 22 groups instead of twenty plus two',()=>{
 const pages=paginateJobRuns([run(22)],geometry)
 assert.deepEqual(pages.map(p=>p.rowCount),[11,11])
 assert.deepEqual(pages.flatMap(p=>p.parts.map(x=>[x.start,x.end,x.final])),[[0,11,false],[11,22,true]])
})
test('twenty short rows can fit one page; measured long rows start another earlier',()=>{
 assert.equal(paginateJobRuns([run(20)],geometry).length,1)
 const pages=paginateJobRuns([run(20,65)],geometry)
 assert.ok(pages.length>1)
 assert.ok(pages.every(p=>p.height+geometry.tail<=geometry.pageHeight))
 assert.equal(pages.reduce((n,p)=>n+p.rowCount,0),20)
})
test('outbound and return remain separate, with final totals only once per run',()=>{
 const pages=paginateJobRuns([run(20),run(20)],geometry)
 assert.equal(pages.length,2)
 assert.deepEqual(pages.map(p=>p.parts[0].run),[0,1])
 assert.equal(pages.flatMap(p=>p.parts).filter(p=>p.final).length,2)
})
test('rebalancing retains every row and a tail cannot be orphaned on an empty page',()=>{
 const pages=paginateJobRuns([run(18,40)],geometry)
 assert.deepEqual(pages.map(p=>p.rowCount),[9,9])
 assert.ok(pages.every(p=>p.height+geometry.tail<=geometry.pageHeight&&p.parts.length))
})
test('oversized rows and invalid measurements are reported instead of clipped',()=>{
 assert.throws(()=>paginateJobRuns([run(1,2000)],geometry),/DOCUMENT_ROW_TOO_TALL/)
 assert.throws(()=>paginateJobRuns([run(1)],{...geometry,firstHeader:1200}),/DOCUMENT_LAYOUT_UNAVAILABLE/)
 assert.throws(()=>paginateJobRuns([{head:1,foot:1,rows:[NaN]}],geometry),/DOCUMENT_LAYOUT_UNAVAILABLE/)
})
test('long instructions remain complete across continuation rows',()=>{
 const instruction='Peanut allergy. Read the complete instruction. '.repeat(80)
 const base={id:'a',adults:2,children:1,booking:{code:'B10',name:'Group',allergyStatus:'HAS',allergies:instruction}}
 const rows=documentRows([base],200)
 assert.ok(rows.length>1);assert.equal(rows.map(r=>r.remarks).join(''),'ALLERGY: '+instruction)
 assert.equal(rows.filter(r=>!r.continued).length,1);assert.ok(rows.every(r=>r.number===1))
 assert.equal(rows.filter(r=>!r.continued).reduce((n,r)=>n+r.adults+r.children,0),3)
})
test('missing or colliding program abbreviations fall back to full names',()=>{
 const programs=manifestPrograms([{assignments:[{booking:{programId:'a',programName:'Day Trip Classic'}},{booking:{programId:'b',programName:'Family',programPrintCode:'DT'}},{booking:{programId:'c',programName:'Plus',programPrintCode:'DT'}}]}])
 assert.deepEqual(programs.map(p=>p.code),['Day Trip Classic','Family','Plus'])
})
test('code reference distinguishes unknown services and dietary requirements',()=>{
 const rows=jobCodeGuide.flatMap(g=>g.rows),codes=rows.map(r=>r[0])
 for(const code of ['GV','CT','NP','BUN','SELF','?','VGN','VEG'])assert.ok(codes.includes(code))
 assert.notEqual(rows.find(r=>r[0]==='VGN')[1],rows.find(r=>r[0]==='VEG')[1])
})
