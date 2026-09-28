import {useEffect, useRef, useState} from 'react'
import {Button} from './ui.jsx'
import {label, t, useLocale} from './locale.js'

import {Navigation} from './member-navigation-context.js'
const routeUrl = () => location.pathname + location.search
const stateKey = 'greenviewMemberIndex'

export function MemberNavigation({children}) {
 useLocale()
 const [route, setRoute] = useState(routeUrl), [pending, setPending] = useState(null)
 const guards = useRef(new Set()), dialog = useRef(null), index = useRef(history.state?.[stateKey] ?? 0)
 const activeRoute = useRef(route), originFocus = useRef(null)
 const restoring = useRef(null), allowedPop = useRef(false)
 const commit = useRef(null)
 commit.current = (url, replace = false) => {
  if (url === routeUrl()) return
  const next = replace ? index.current : index.current + 1
  history[replace ? 'replaceState' : 'pushState']({...history.state, [stateKey]:next}, '', url)
  index.current = next
  activeRoute.current = routeUrl()
  setRoute(routeUrl())
  window.scrollTo(0, 0)
 }
 function navigate(url, {replace = false} = {}) {
  if (guards.current.size) setPending({url, replace})
  else commit.current(url, replace)
 }
 useEffect(() => {
  history.replaceState({...history.state, [stateKey]:index.current}, '', location.href)
  function click(event) {
   if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
   const anchor = event.target.closest?.('a[href]')
   if (!anchor || anchor.hasAttribute('data-reload') || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return
   const url = new URL(anchor.href)
   if (!['http:', 'https:'].includes(url.protocol)) return
   if (url.origin !== location.origin || !['/', '/login', '/profile', '/tours'].includes(url.pathname)) return
   if (url.pathname === location.pathname && url.search === location.search && url.hash) {
    event.preventDefault()
    index.current += 1
    history.pushState({...history.state, [stateKey]:index.current}, '', url)
    let id = url.hash.slice(1)
    try {id = decodeURIComponent(id)} catch { /* Keep malformed fragments harmless. */ }
    const target = document.getElementById(id)
    target?.scrollIntoView()
    if (target) {target.tabIndex = -1; target.focus({preventScroll:true})}
    return
   }
   const destination = url.pathname + url.search + url.hash
   event.preventDefault()
   if (destination === routeUrl()) return
   if (guards.current.size) {originFocus.current = anchor; setPending({url:destination})}
   else commit.current(destination)
  }
  function pop(event) {
   if (restoring.current) {
    const request = restoring.current
    restoring.current = null
    setPending(request)
    return
   }
   const next = event.state?.[stateKey]
   if (guards.current.size && routeUrl() !== activeRoute.current && !allowedPop.current && Number.isInteger(next)) {
    const delta = next - index.current
    if (delta) {
     originFocus.current = document.activeElement
     restoring.current = {delta}
     history.go(-delta)
     return
    }
   }
   allowedPop.current = false
   index.current = next ?? 0
   activeRoute.current = routeUrl()
   setRoute(routeUrl())
   window.scrollTo(0, 0)
  }
  function unload(event) {
   if (guards.current.size) {event.preventDefault(); event.returnValue = ''}
  }
  document.addEventListener('click', click)
  window.addEventListener('popstate', pop)
  window.addEventListener('beforeunload', unload)
  return () => {
   document.removeEventListener('click', click)
   window.removeEventListener('popstate', pop)
   window.removeEventListener('beforeunload', unload)
  }
 }, [])
 useEffect(() => {
  if (!pending) return
  const element = dialog.current
  element.showModal()
  return () => element.close()
 }, [pending])
 function cancel() {setPending(null); requestAnimationFrame(() => originFocus.current?.focus())}
 useEffect(() => {
  const main = document.getElementById('content')
  if (main) {main.tabIndex = -1; main.focus({preventScroll:true})}
 }, [route])
 function discard() {
  const request = pending
  setPending(null)
  if (request.delta) {allowedPop.current = true; history.go(request.delta)}
  else commit.current(request.url, request.replace)
 }
 return <Navigation.Provider value={{route, navigate, guards}}>{children}{pending && <dialog ref={dialog} aria-labelledby="leave-title" onCancel={event => {event.preventDefault(); cancel()}}><h2 id="leave-title">{label('ออกจากหน้านี้?')}</h2><p>{t('ข้อมูลที่ยังไม่ได้บันทึกหรือส่งจะหายไป')}</p><div className="actions"><Button autoFocus onClick={cancel}>{t('ทำรายการต่อ')}</Button><Button className="secondary" onClick={discard}>{t('ออกโดยไม่บันทึก')}</Button></div></dialog>}</Navigation.Provider>
}
