import {useLocale} from '../useLocale.js'
import {useId,useLayoutEffect,useRef} from 'react'
export function Button({children,...props}){return <button type="button" className="public-button" {...props}>{children}</button>}
export function Dialog({title,children,onClose}){const {t}=useLocale();const ref=useRef(null),id=useId();useLayoutEffect(()=>{const old=document.activeElement;ref.current.showModal();return()=>old?.isConnected&&old.focus()},[]);return <dialog ref={ref} className="public-dialog" aria-labelledby={id} onCancel={e=>{e.preventDefault();onClose()}}><Button aria-label={t("ปิดประกาศ")} onClick={onClose}>×</Button><h2 id={id}>{title}</h2>{children}</dialog>}
