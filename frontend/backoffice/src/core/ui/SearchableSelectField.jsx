import { useCallback, useId, useRef, useState } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { normalizeAreaSearch } from '../../../../../packages/contracts/thai-address.js'
export function SearchableSelectField({label,value,options,onChange,error,hint,disabled=false}) {
 const id=useId(),input=useRef(null),[host,setHost]=useState(null),[query,setQuery]=useState(''),[keyboard,setKeyboard]=useState(false)
 const mount=useCallback(node=>{if(node)setHost(node.closest('dialog')||document.body)},[])
 const selected=options.find(option=>option.value===value)||null
 return <div className="form-field" ref={mount}><Combobox.Root items={options} value={selected} onValueChange={item=>onChange({target:{value:item?.value||''}})} itemToStringLabel={item=>item?.label||''} isItemEqualToValue={(a,b)=>a?.value===b?.value} filter={(item,text)=>normalizeAreaSearch(item.label).includes(normalizeAreaSearch(text))} inputValue={query} onInputValueChange={setQuery} disabled={disabled} onOpenChange={()=>setQuery('')}>
 <Combobox.Label className="field-label">{label}</Combobox.Label><Combobox.Trigger onPointerDown={()=>setKeyboard(false)} onKeyDown={()=>setKeyboard(true)} className="core-select-trigger" aria-invalid={Boolean(error)} aria-describedby={`${id}-help`}><span>{selected?.label||value||'Select / เลือก'}</span><span aria-hidden="true">⌄</span></Combobox.Trigger>
 <Combobox.Portal container={host}><Combobox.Positioner className="core-combobox-positioner" sideOffset={6} align="start" collisionPadding={8}><Combobox.Popup data-keyboard={keyboard||undefined} onKeyDown={()=>setKeyboard(true)} onPointerMove={()=>setKeyboard(false)} className="core-dropdown core-combobox-popup" aria-label={`Choose ${label}`}>
 <div className="core-combobox-search"><Combobox.Input ref={input} aria-label={`Search ${label}`} placeholder="Search English / ค้นหาภาษาไทย" onKeyDown={event=>{if(event.nativeEvent.isComposing&&event.key==='Enter')event.preventDefault()}}/>{query&&<button type="button" className="icon-button" aria-label={`Clear search ${label}`} onClick={()=>{setQuery('');input.current?.focus()}}>×</button>}</div>
 <Combobox.Empty className="field-help">No matches / ไม่พบข้อมูล</Combobox.Empty><Combobox.List className="core-combobox-list">{option=><Combobox.Item key={option.value} value={option} className="core-select-option" disabled={option.disabled}><span>{option.label}</span><Combobox.ItemIndicator className="select-check">✓</Combobox.ItemIndicator></Combobox.Item>}</Combobox.List>
 </Combobox.Popup></Combobox.Positioner></Combobox.Portal></Combobox.Root><span id={`${id}-help`} className={`field-help ${error?'field-error':''}`}>{error||hint||'\u00a0'}</span></div>
}
