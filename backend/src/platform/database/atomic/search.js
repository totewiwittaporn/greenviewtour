import {tokens,text,upper,group} from './sql.js'
const bytes=value=>new TextEncoder().encode(value).length
function leftOperand(input,end){
 let start=end
 if(input[end]?.raw===')'){
  let depth=1;start=end-1
  while(start>=0&&depth){if(input[start].raw===')')depth++;if(input[start].raw==='(')depth--;if(depth)start--}
  if(depth)throw new Error('D1_LIKE_EXPRESSION_INVALID')
  if(['word','identifier'].includes(input[start-1]?.kind)&&!['AND','OR','WHERE','NOT','ON','WHEN','THEN','SELECT'].includes(upper(input[start-1])))start--
 }else{
  while(start>=2&&input[start-1].raw==='.'&&['word','identifier'].includes(input[start-2].kind))start-=2
 }
 if(start<0)throw new Error('D1_LIKE_EXPRESSION_INVALID')
 return start
}
function patternTokens(pattern,escape){
 const chars=[...pattern],pieces=[]
 for(let i=0;i<chars.length;i++){
  const char=chars[i]
  if(escape&&char===escape){if(++i>=chars.length)return null;pieces.push([0,i+1])}
  else pieces.push([char==='%'?2:char==='_'?1:0,i+1])
 }
 return pieces
}
function longLike(left,right,pattern,escape){
 const pieces=patternTokens(pattern,escape)
 if(!pieces)return '(0)'
 if(pieces.length>1024)throw new Error('D1_SEARCH_PATTERN_TOO_LONG')
 const chars=[...pattern],prefix=chars[0]==='%',suffix=chars.at(-1)==='%'
 const core=chars.slice(prefix?1:0,suffix?-1:undefined)
 if(!escape&&core.every(char=>char!=='%'&&char!=='_')){
  const needle=`substr(${right},${prefix?2:1},${core.length})`
  const lhs=`lower(${left})`,rhs=`lower(${needle})`
  if(prefix&&suffix)return `(instr(${lhs},${rhs})>0)`
  if(suffix)return `(substr(${lhs},1,${core.length})=${rhs})`
  if(prefix)return `(substr(${lhs},length(${lhs})-${core.length}+1)=${rhs})`
  return `(${lhs}=${rhs})`
 }
 // UNION de-duplicates states: bounded dynamic programming, not exponential wildcard backtracking.
 // Only token kinds and integer positions are embedded. Search characters stay in the original bind.
 const structure=JSON.stringify(pieces),count=pieces.length
 return `(CASE WHEN ${left} IS NULL THEN NULL ELSE EXISTS (
 WITH RECURSIVE __gv_l_input(s,p) AS (SELECT ${left},${right}),
 __gv_l_tokens(i,k,at) AS (SELECT CAST(key AS INTEGER),json_extract(value,'$[0]'),json_extract(value,'$[1]') FROM json_each('${structure}')),
 __gv_l_state(i,j) AS (
  SELECT 0,1 UNION
  SELECT CASE WHEN t.k=2 AND branch.b=1 THEN m.i ELSE m.i+1 END,
   CASE WHEN t.k=2 AND branch.b=0 THEN m.j ELSE m.j+1 END
  FROM __gv_l_state m JOIN __gv_l_tokens t ON t.i=m.i CROSS JOIN __gv_l_input v
  CROSS JOIN (SELECT 0 AS b UNION ALL SELECT 1) branch
  WHERE (t.k=2 AND (branch.b=0 OR m.j<=length(v.s)))
   OR (branch.b=0 AND t.k<>2 AND m.j<=length(v.s) AND (t.k=1 OR lower(substr(v.s,m.j,1))=lower(substr(v.p,t.at,1))))
 ) SELECT 1 FROM __gv_l_state m CROSS JOIN __gv_l_input v WHERE m.i=${count} AND m.j=length(v.s)+1
 ) END)`
}
export function d1SearchQuery(query){
 const input=tokens(query.sql),args=query.args
 let changed=false
 for(let i=0;i<input.length;i++){
  if(upper(input[i])!=='LIKE')continue
  const first=input[i+1]
  if(!first)continue
  const grouped=first.raw==='('?group(input,i+1):null
  const expression=grouped?input.slice(i+1,grouped.end):[first]
  const parts=expression.filter(token=>!['(',')','||'].includes(token.raw))
  if(parts.some(token=>!['parameter','string'].includes(token.kind)))continue
  const values=parts.map(token=>token.kind==='parameter'?args[token.index]:token.raw.slice(1,-1).replaceAll("''","'"))
  if(values.some(value=>typeof value!=='string'))continue
  const pattern=values.join('')
  if(bytes(pattern)<=50)continue
  let end=grouped?grouped.end:i+2,escape=null
  if(upper(input[end])==='ESCAPE'){
   const token=input[end+1];if(token?.kind!=='string')throw new Error('D1_ESCAPE_LITERAL_REQUIRED')
   escape=token.raw.slice(1,-1).replaceAll("''","'");if([...escape].length!==1)throw new Error('D1_ESCAPE_CHARACTER_REQUIRED');end+=2
  }
  const negative=upper(input[i-1])==='NOT',last=i-(negative?2:1),start=leftOperand(input,last)
  const left=text(input.slice(start,last+1)),right=text(expression)
  const comparison=longLike(left,right,pattern,escape)
  input.splice(start,end-start,{raw:negative?`NOT ${comparison}`:comparison,kind:'word'})
  i=start;changed=true
 }
 return changed?{...query,sql:text(input)}:query
}
