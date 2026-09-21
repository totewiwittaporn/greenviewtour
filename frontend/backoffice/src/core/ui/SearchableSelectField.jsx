import {translateLabel as bilingualLabel} from '../i18n/runtime.js'
import {useLocale} from '../i18n/locale.jsx'
import { useCallback, useId, useRef, useState } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { normalizeAreaSearch } from '../../../../../packages/contracts/thai-address.js'
export function SearchableSelectField({label,value,options,onChange,error,hint,disabled=false}) {
 const {t}=useLocale()
 const id=useId(),input=useRef(null),[host,setHost]=useState(null),[query,setQuery]=useState(''),[keyboard,setKeyboard]=useState(false)
 const mount=useCallback(node=>{if(node)setHost(node.closest('dialog')||document.body)},[])
 const selected=options.find(option=>option.value===value)||null
 return <div className="form-field" ref={mount}><Combobox.Root items={options} value={selected} onValueChange={item=>onChange({target:{value:item?.value||''}})} itemToStringLabel={item=>item?.label||''} isItemEqualToValue={(a,b)=>a?.value===b?.value} filter={(item,text)=>normalizeAreaSearch(item.label).includes(normalizeAreaSearch(text))} inputValue={query} onInputValueChange={setQuery} disabled={disabled} onOpenChange={()=>setQuery('')}>
 <Combobox.Label className="field-label">{bilingualLabel(label)}</Combobox.Label><Combobox.Trigger onPointerDown={()=>setKeyboard(false)} onKeyDown={()=>setKeyboard(true)} className="core-select-trigger" aria-invalid={Boolean(error)} aria-describedby={`${id}-help`}><span>{selected?.label||value||t('Select')}</span><span aria-hidden="true">⌄</span></Combobox.Trigger>
 <Combobox.Portal container={host}><Combobox.Positioner className="core-combobox-positioner" positionMethod="fixed" sideOffset={6} align="start" collisionPadding={8}><Combobox.Popup data-keyboard={keyboard||undefined} onKeyDown={()=>setKeyboard(true)} onPointerMove={()=>setKeyboard(false)} className="core-dropdown core-combobox-popup" aria-label={t('Choose {label}',{label:t(label)})}>
 <div className="core-combobox-search"><Combobox.Input ref={input} aria-label={t('Search {label}',{label:t(label)})} placeholder={t("Search English / ค้นหาภาษาไทย")} onKeyDown={event=>{if(event.nativeEvent.isComposing&&event.key==='Enter')event.preventDefault()}}/>{query&&<button type="button" className="icon-button" aria-label={t('Clear search {label}',{label:t(label)})} onClick={()=>{setQuery('');input.current?.focus()}}>×</button>}</div>
 <Combobox.Empty className="field-help">{t("No matches / \u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25")}</Combobox.Empty><Combobox.List className="core-combobox-list">{option=><Combobox.Item key={option.value} value={option} className="core-select-option" disabled={option.disabled}><span>{option.label}</span><Combobox.ItemIndicator className="select-check">✓</Combobox.ItemIndicator></Combobox.Item>}</Combobox.List>
 </Combobox.Popup></Combobox.Positioner></Combobox.Portal></Combobox.Root><span id={`${id}-help`} className={`field-help ${error?'field-error':''}`}>{t(error||hint)||'\u00a0'}</span></div>
}
