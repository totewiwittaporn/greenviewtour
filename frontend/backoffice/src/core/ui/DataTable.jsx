import {translateLabel as bilingualLabel} from '../i18n/runtime.js'
import {useLocale} from '../i18n/locale.jsx'
import {Children,cloneElement,isValidElement} from 'react'
import { Button } from './Button.jsx'
import { Icon } from './Icon.jsx'

function cellText(value){return Children.toArray(value).map(v=>typeof v==='string'||typeof v==='number'?v:isValidElement(v)?cellText(v.props.children):'').join(' ').trim()}
function hasControl(value){return Children.toArray(value).some(v=>isValidElement(v)&&(['input','select','textarea','button'].includes(v.type)||typeof v.type==='function'&&/^(Button|Dropdown|FormField|ReferenceField|SelectField|DateField|TextAreaField|SearchField|Checkbox)/.test(v.type.name)||hasControl(v.props.children)))}
function compactRows(children){return Children.map(children,row=>!isValidElement(row)||row.type!=='tr'?row:cloneElement(row,{},Children.map(row.props.children,cell=>{
 if(!isValidElement(cell)||cell.type!=='td'||cell.props.colSpan)return cell
 const controls=hasControl(cell.props.children)
 return cloneElement(cell,{},<div className={controls?'table-cell-controls':'table-cell-copy'} title={controls?undefined:cellText(cell.props.children)}>{cell.props.children}</div>)
})))}
export function DataTable({ columns, children, busy, label = 'Data table', error, onRetry, isEmpty = false, empty, loadingLabel = 'Loading records…', layout = 'dataset' }) {
  const {t} = useLocale()
  const weights=columns.map((col,index)=>typeof col==='object'?col.weight||1:/^(Actions?|Select)$/i.test(col)?0.55:index===0?1.8:1)
  const totalWeight=weights.reduce((a,b)=>a+b,0)
  const state = busy ? <div className="empty-state" role="status"><span className="spinner" />{t(loadingLabel)}</div>
    : error ? <div className="empty-state" role="alert"><Icon name="globe" /><h3>{bilingualLabel("Records are temporarily unavailable")}</h3><p>{t(error)}</p>{onRetry && <Button onClick={onRetry}>Retry</Button>}</div>
    : isEmpty ? <div className="empty-state"><span className="empty-icon"><Icon name="users" width="30" height="30" /></span>{(typeof empty === 'string' ? t(empty) : empty) || <><h3>{bilingualLabel("No records yet")}</h3><p>{t("Add a record to get started.")}</p></>}</div> : null
  return <div className="table-scroll" data-layout={layout} data-columns={columns.length} tabIndex="0" role="region" aria-label={t(label)} aria-busy={busy}><table><colgroup>{columns.map((col,i)=><col key={typeof col==='string'?col:col.label} style={{width:`${weights[i]/totalWeight*100}%`}}/>)}</colgroup><caption className="sr-only">{t(label)}</caption><thead><tr>{columns.map(col => <th scope="col" key={typeof col==='string'?col:col.label}><span className="table-cell-copy">{bilingualLabel(typeof col==='string'?col:col.label)}</span></th>)}</tr></thead><tbody>{state ? <tr><td colSpan={columns.length}>{state}</td></tr> : compactRows(children)}</tbody></table></div>
}
