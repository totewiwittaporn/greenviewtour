// Heights are measured at the unscaled A4 content width after fonts load.
// Screen width never changes the document's pagination or passenger totals.
export function paginateJobRuns(runs, { pageHeight, firstHeader, nextHeader, tail = 0, maxRows = 20 }) {
 if (![pageHeight, firstHeader, nextHeader, tail].every(Number.isFinite) || pageHeight <= firstHeader + tail || pageHeight <= nextHeader + tail || !Number.isInteger(maxRows) || maxRows < 1) throw Error('DOCUMENT_LAYOUT_UNAVAILABLE')
 const pages = []
 const newPage = () => { const page = { parts: [], used: pages.length ? nextHeader : firstHeader, rows: 0 }; pages.push(page); return page }
 let page = newPage()
 const heightOf = part => runs[part.run].head + runs[part.run].rows.slice(part.start, part.end).reduce((a,b) => a+b, 0) + (part.final ? runs[part.run].foot : 0)
 for (let r = 0; r < runs.length; r++) {
  const source = runs[r]
  if (![source.head, source.foot, ...source.rows].every(v => Number.isFinite(v) && v >= 0)) throw Error('DOCUMENT_LAYOUT_UNAVAILABLE')
  if (!source.rows.length) continue
  let start = 0
  const balancedLimit = source.rows.length > maxRows ? Math.ceil(source.rows.length / Math.ceil(source.rows.length / maxRows)) : maxRows
  while (start < source.rows.length) {
   const available = pageHeight - tail - page.used
   const all = { run:r, start, end:source.rows.length, final:true }
   if (page.parts.length && (heightOf(all) > available || page.rows + all.end - start > maxRows)) page = newPage()
   let end = start, used = source.head
   while (end < source.rows.length && end - start < balancedLimit && page.rows + end - start < maxRows) {
    const final = end + 1 === source.rows.length
    if (page.used + used + source.rows[end] + (final ? source.foot : 0) + tail > pageHeight) break
    used += source.rows[end]; end++
   }
   if (end === start) {
    if (page.parts.length) { page = newPage(); continue }
    throw Error('DOCUMENT_ROW_TOO_TALL')
   }
   const part = { run:r, start, end, final:end === source.rows.length }
   page.parts.push(part); page.rows += end - start; page.used += heightOf(part)
   start = end
   if (start < source.rows.length) page = newPage()
  }
 }
 // Rebalance a short continuation instead of leaving just a row and sign-off.
 for (let i = 1; i < pages.length; i++) {
  const left = pages[i-1], right = pages[i]
  if (left.parts.length !== 1 || right.parts.length !== 1) continue
  const a = left.parts[0], b = right.parts[0]
  if (a.run !== b.run || !b.final || b.end - b.start >= 5) continue
  const firstBase = left.used - heightOf(a), nextBase = right.used - heightOf(b)
  const middle = Math.ceil((a.start + b.end) / 2)
  for (let pivot = middle; pivot < a.end; pivot++) {
   const nextA = {...a, end:pivot}, nextB = {...b, start:pivot}
   if (pivot-a.start > maxRows || b.end-pivot > maxRows) continue
   const leftHeight = firstBase + heightOf(nextA), rightHeight = nextBase + heightOf(nextB)
   if (leftHeight+tail <= pageHeight && rightHeight+tail <= pageHeight) {
    left.parts[0]=nextA; right.parts[0]=nextB
    left.used=leftHeight; right.used=rightHeight; left.rows=pivot-a.start; right.rows=b.end-pivot; break
   }
  }
 }
 return pages.filter(p => p.parts.length).map(p => ({ parts:p.parts, height:p.used, rowCount:p.rows }))
}
