// Narrow SQLite grammar used by the pinned Prisma compiler. Values remain bound.
export function tokens(sql) {
  const out = []
  for (let i = 0; i < sql.length;) {
    const rest = sql.slice(i), space = /^\s+/.exec(rest)
    if (space) { i += space[0].length; continue }
    if (rest.startsWith('--')) { const n = rest.indexOf('\n'); i += n < 0 ? rest.length : n; continue }
    if (rest.startsWith('/*')) { const n = rest.indexOf('*/', 2); if (n < 0) throw new Error('D1_SQL_COMMENT_INVALID'); i += n + 2; continue }
    const q = sql[i]
    if (q === '"' || q === "'" || q === '`') {
      let j = i + 1, done = false
      while (j < sql.length) {
        if (sql[j] !== q) { j++; continue }
        if (sql[j + 1] === q) { j += 2; continue }
        j++; done = true; break
      }
      if (!done) throw new Error('D1_SQL_QUOTE_INVALID')
      out.push({ raw: sql.slice(i, j), kind: q === "'" ? 'string' : 'identifier' }); i = j; continue
    }
    const match = /^(?:\?\d*|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z_][A-Za-z_0-9$]*|->>|->|!=|<>|<=|>=|\|\||[^\s])/.exec(rest)
    if (!match) throw new Error('D1_SQL_TOKEN_INVALID')
    const raw = match[0]
    out.push({ raw, kind: raw[0] === '?' ? 'parameter' : /^[A-Za-z_]/.test(raw) ? 'word' : 'symbol' }); i += raw.length
  }
  if (out.at(-1)?.raw === ';') out.pop()
  if (out.some(t => t.raw === ';')) throw new Error('D1_SINGLE_STATEMENT_REQUIRED')
  let position = 0
  for (const token of out) if (token.kind === 'parameter') {
    const index = token.raw.length > 1 ? Number(token.raw.slice(1)) - 1 : position
    if (!Number.isSafeInteger(index) || index < 0) throw new Error('D1_SQL_PARAMETER_INVALID')
    position = Math.max(position, index + 1); token.raw = '?' + (index + 1); token.index = index
  }
  return out
}
export const text = input => input.map(t => t.raw).join(' ')
export const upper = token => token?.raw.toUpperCase()
export function identifier(token) {
  if (!token || !['word', 'identifier'].includes(token.kind)) throw new Error('D1_SQL_IDENTIFIER_REQUIRED')
  const name = token.kind === 'identifier' ? token.raw.slice(1, -1).replaceAll(token.raw[0] + token.raw[0], token.raw[0]) : token.raw
  if (!name || name.includes('\0')) throw new Error('D1_SQL_IDENTIFIER_INVALID')
  return name
}
export const quote = value => '"' + value.replaceAll('"', '""') + '"'
export function findTop(input, word, start = 0) {
  let depth = 0
  for (let i = start; i < input.length; i++) {
    if (depth === 0 && upper(input[i]) === word.toUpperCase()) return i
    if (input[i].raw === '(') depth++
    if (input[i].raw === ')') depth--
    if (depth < 0) throw new Error('D1_SQL_PARENTHESES_INVALID')
  }
  return -1
}
export function splitTop(input, separator = ',') {
  const parts = []; let start = 0, depth = 0
  for (let i = 0; i < input.length; i++) {
    if (input[i].raw === '(') depth++
    if (input[i].raw === ')') depth--
    if (depth === 0 && input[i].raw === separator) { parts.push(input.slice(start, i)); start = i + 1 }
  }
  if (depth !== 0) throw new Error('D1_SQL_PARENTHESES_INVALID')
  parts.push(input.slice(start)); return parts
}
export function group(input, index) {
  if (input[index]?.raw !== '(') throw new Error('D1_SQL_GROUP_REQUIRED')
  let depth = 0
  for (let i = index; i < input.length; i++) {
    if (input[i].raw === '(') depth++
    if (input[i].raw === ')' && --depth === 0) return { body: input.slice(index + 1, i), end: i + 1 }
  }
  throw new Error('D1_SQL_PARENTHESES_INVALID')
}
export function qualify(input) {
  const out = []
  for (let i = 0; i < input.length; i++) {
    const t = input[i]
    if (['word', 'identifier'].includes(t.kind) && ['main', 'app_private'].includes(identifier(t)) && input[i + 1]?.raw === '.') { i++; continue }
    out.push(t)
  }
  return out
}
export function boundText(input, args) {
  return text(qualify(input).map(t => {
    if (t.kind !== 'parameter') return t
    if (t.index >= args.length) throw new Error('D1_SQL_PARAMETER_MISSING')
    return { ...t, raw: `json_extract(?1, '$.args[${t.index}]')` }
  }))
}
function tableAt(input, offset) {
  let table = identifier(input[offset]), end = offset + 1
  if (input[end]?.raw === '.') {
    if (!['main', 'app_private'].includes(table)) throw new Error('D1_SQL_SCHEMA_INVALID')
    table = identifier(input[end + 1]); end += 2
  }
  return { table, end }
}
export function assignments(input) {
  return splitTop(input).map(part => {
    const equals = findTop(part, '=')
    if (equals < 1) throw new Error('D1_SQL_ASSIGNMENT_INVALID')
    const lhs = qualify(part.slice(0, equals))
    return { field: identifier(lhs.at(-1)), expression: part.slice(equals + 1) }
  })
}
export function mutation(sql) {
  const input = tokens(sql), kind = upper(input[0]), returningAt = findTop(input, 'RETURNING')
  const body = returningAt < 0 ? input : input.slice(0, returningAt)
  const returning = returningAt < 0 ? [] : input.slice(returningAt + 1)
  if (kind === 'INSERT') {
    let offset = 1, conflictMode = null
    if (upper(body[offset]) === 'OR') { conflictMode = upper(body[offset + 1]); offset += 2; if (!['IGNORE', 'REPLACE'].includes(conflictMode)) throw new Error('D1_INSERT_MODE_UNSUPPORTED') }
    if (upper(body[offset++]) !== 'INTO') throw new Error('D1_INSERT_INVALID')
    const { table, end } = tableAt(body, offset); offset = end
    const columns = group(body, offset); offset = columns.end
    const fields = splitTop(columns.body).map(part => { if (part.length !== 1) throw new Error('D1_INSERT_COLUMNS_INVALID'); return identifier(part[0]) })
    let on = findTop(body, 'ON', offset)
    while (on >= 0 && upper(body[on+1]) !== 'CONFLICT') on = findTop(body, 'ON', on+1)
    const payload = body.slice(offset, on < 0 ? undefined : on)
    let values = null, select = null, conflict = null
    if (upper(payload[0]) === 'VALUES') {
      values = []; let cursor = 1
      while (cursor < payload.length) { const tuple = group(payload, cursor); values.push(splitTop(tuple.body)); cursor = tuple.end; if (payload[cursor]?.raw === ',') cursor++ }
      if (values.some(tuple => tuple.length !== fields.length)) throw new Error('D1_INSERT_VALUES_INVALID')
    } else if (['SELECT', 'WITH'].includes(upper(payload[0]))) select = payload
    else throw new Error('D1_INSERT_PAYLOAD_UNSUPPORTED')
    if (on >= 0) {
      let cursor = on + 2, keys = null
      if (body[cursor]?.raw === '(') { const target = group(body, cursor); keys = splitTop(target.body).map(part => identifier(part[0])); cursor = target.end }
      if (upper(body[cursor++]) !== 'DO') throw new Error('D1_CONFLICT_INVALID')
      const action = upper(body[cursor++])
      if (action === 'NOTHING') conflict = { keys, action }
      else if (action === 'UPDATE' && upper(body[cursor++]) === 'SET') {
        const where = findTop(body, 'WHERE', cursor)
        conflict = { keys, action, assignments: assignments(body.slice(cursor, where < 0 ? undefined : where)), where: where < 0 ? [] : body.slice(where + 1) }
      } else throw new Error('D1_CONFLICT_ACTION_UNSUPPORTED')
    }
    return { kind, table, fields, values, select, conflict, conflictMode, returning }
  }
  if (kind === 'UPDATE') {
    const { table, end } = tableAt(body, 1)
    if (upper(body[end]) !== 'SET') throw new Error('D1_UPDATE_INVALID')
    const where = findTop(body, 'WHERE', end + 1)
    return { kind, table, assignments: assignments(body.slice(end + 1, where < 0 ? undefined : where)), where: where < 0 ? [] : body.slice(where + 1), returning }
  }
  if (kind === 'DELETE') {
    if (upper(body[1]) !== 'FROM') throw new Error('D1_DELETE_INVALID')
    const { table, end } = tableAt(body, 2)
    if (body[end] && upper(body[end]) !== 'WHERE') throw new Error('D1_DELETE_INVALID')
    return { kind, table, where: body.slice(end + 1), returning }
  }
  return null
}
