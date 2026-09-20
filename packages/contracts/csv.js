// Text cells are always quoted, with spreadsheet formula prefixes neutralized.
export function csvCell(value){const text=String(value??'');return '"'+(/^[\s]*[=+@\-\t\r\n]/.test(text)?"'":'')+text.replaceAll('"','""')+'"'}
export function csvDocument(rows){return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'}
