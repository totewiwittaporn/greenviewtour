
import {useLocale} from '../useLocale.js'
import {useId,useLayoutEffect,useRef} from 'react'
export function Button({children,...props}){return <button type="button" className="public-button" {...props}>{children}</button>}
export function CloseButton({label,onClick,className=''}){return <button type="button" className={`public-close-button ${className}`.trim()} aria-label={label} onClick={onClick}><span aria-hidden="true">×</span></button>}
export function Dialog({title,children,onClose,closeLabel}){const {t}=useLocale();const ref=useRef(null),restore=useRef(null),id=useId();useLayoutEffect(()=>{const node=ref.current;if(!restore.current)restore.current=document.activeElement;node.showModal();return()=>{node.close();queueMicrotask(()=>{if(!node.isConnected&&restore.current?.isConnected)restore.current.focus()})}},[]);return <dialog ref={ref} className="public-dialog" aria-labelledby={id} onCancel={e=>{e.preventDefault();onClose()}}><CloseButton label={closeLabel || t("ปิดประกาศ")} onClick={onClose}/><h2 id={id}>{title}</h2>{children}</dialog>}

export function Field({label,...props}){const id=useId();return <div className="public-field"><label htmlFor={id}>{label}</label><input id={id} {...props}/></div>}
export function Select({label,children,...props}){const id=useId();return <div className="public-field"><label htmlFor={id}>{label}</label><select id={id} {...props}>{children}</select></div>}
