import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Dialog } from '../ui/Dialog.jsx'
import { Button } from '../ui/Button.jsx'
const Context=createContext(null)
const current=()=>({pathname:window.location.pathname,search:window.location.search})
export function NavigationProvider({children}){
 const [location,setLocation]=useState(current),[pending,setPending]=useState(null)
 const guards=useRef(new Map()),index=useRef(0),restore=useRef(null),approved=useRef(false)
 useEffect(()=>{
  index.current=window.history.state?.gvIndex??0
  window.history.replaceState({...window.history.state,gvIndex:index.current},'')
 },[])
 const commit=useCallback(target=>{
  if(target.action){target.action();return}
  if(target.delta!==undefined){approved.current=true;window.history.go(target.delta);return}
  index.current++
  window.history.pushState({gvIndex:index.current},'',target.href)
  setLocation(current());window.scrollTo(0,0)
 },[])
 const request=useCallback(target=>{
  if([...guards.current.values()].some(Boolean)){setPending(target);return}
  commit(target)
 },[commit])
 const navigate=useCallback(href=>{const url=new URL(href,window.location.href);if(url.href===window.location.href)return;request({href:url.pathname+url.search+url.hash})},[request])
 const runAction=useCallback(action=>request({action}),[request])
 useEffect(()=>{
  const clicked=event=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
   const anchor=event.target.closest?.('a[href]');if(!anchor||anchor.target||anchor.hasAttribute('download'))return
   const url=new URL(anchor.href,window.location.href)
   if(url.origin!==window.location.origin||url.hash||!(/^\/settings\//.test(url.pathname)||['/','/profile'].includes(url.pathname)))return
   event.preventDefault();navigate(url.href)
  }
  const popped=event=>{
   if(restore.current){const target=restore.current;restore.current=null;setPending(target);return}
   const next=event.state?.gvIndex
   if(typeof next!=='number'){window.location.reload();return}
   if(!approved.current&&[...guards.current.values()].some(Boolean)){
    const delta=next-index.current
    if(delta){restore.current={delta};window.history.go(-delta)}
    return
   }
   approved.current=false;index.current=next;setLocation(current())
  }
  const unload=event=>{if([...guards.current.values()].some(Boolean)){event.preventDefault();event.returnValue=''}}
  document.addEventListener('click',clicked);window.addEventListener('popstate',popped);window.addEventListener('beforeunload',unload)
  return()=>{document.removeEventListener('click',clicked);window.removeEventListener('popstate',popped);window.removeEventListener('beforeunload',unload)}
 },[navigate])
 useEffect(()=>{document.querySelector('#main h1')?.focus({preventScroll:true})},[location])
 const register=useCallback((id,dirty)=>{guards.current.set(id,dirty);return()=>guards.current.delete(id)},[])
 return <Context.Provider value={{location,navigate,runAction,register}}>{children}{pending&&<Dialog title="Unsaved changes" onClose={()=>setPending(null)}><p>Leave this page and discard your unsaved changes?</p><div className="dialog-actions"><Button autoFocus onClick={()=>setPending(null)}>Keep editing</Button><Button onClick={()=>{const target=pending;setPending(null);commit(target)}}>Discard and leave</Button></div></Dialog>}</Context.Provider>
}
// Non-component hooks share the provider in this module intentionally.
// eslint-disable-next-line react-refresh/only-export-components
export function useNavigation(){return useContext(Context)}
// eslint-disable-next-line react-refresh/only-export-components
export function useUnsavedChanges(dirty){
 const navigation=useContext(Context),id=useRef(Symbol('draft')),register=navigation?.register
 useLayoutEffect(()=>register?.(id.current,dirty),[register,dirty])
}
