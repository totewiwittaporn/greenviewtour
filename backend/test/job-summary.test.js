import test from 'node:test'
import assert from 'node:assert/strict'
import { programSummary } from '../../packages/contracts/job-summary.js'
test('package totals use assigned passengers per direction, including split and returning groups',()=>{
 const group=(programId,programName,adults,children)=>({booking:{programId,programName,adults:99},adults,children})
 const runs=[{direction:'OUTBOUND',assignments:[group('day','Day trip',20,5),group('day','Day trip',5,0),group('night','2D1N',8,2),group('ticket','Boat ticket',4,0)]},{direction:'RETURN',assignments:[group('day','Day trip',25,5),group('night','2D1N',10,0)]}]
 assert.deepEqual(programSummary(runs,'OUTBOUND').map(p=>p.passengers),[30,10,4])
 assert.deepEqual(programSummary(runs,'RETURN').map(p=>p.passengers),[30,10])
 assert.equal(programSummary(runs,'OUTBOUND').reduce((n,p)=>n+p.passengers,0),44)
 assert.deepEqual(programSummary([],'RETURN'),[])
})
