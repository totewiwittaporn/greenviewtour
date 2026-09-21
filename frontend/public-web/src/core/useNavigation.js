import {useEffect, useLayoutEffect, useState} from 'react'

const ownedPaths = new Set(['/', '/tours', '/promotions'])
const currentRoute = () => ({pathname: location.pathname, search: location.search, hash: location.hash})

// Public-web owns navigation only inside its known routes; member and external links stay native.
export function useNavigation() {
  const [route, setRoute] = useState(currentRoute)
  useEffect(() => {
    const sync = () => setRoute(currentRoute())
    const click = event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target.closest?.('a[href]')
      if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return
      const url = new URL(anchor.href, location.href)
      if (url.origin !== location.origin || !ownedPaths.has(url.pathname)) return
      event.preventDefault()
      if (url.href !== location.href) history.pushState(null, '', url.pathname + url.search + url.hash)
      sync()
    }
    document.addEventListener('click', click)
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      document.removeEventListener('click', click)
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])
  useLayoutEffect(() => {
    let hash = route.hash.slice(1)
    try { hash = decodeURIComponent(hash) } catch { /* Invalid fragments simply have no matching target. */ }
    const target = (hash && document.getElementById(hash)) || document.querySelector('main')
    if (hash && target) target.scrollIntoView()
    else window.scrollTo(0, 0)
    if (target) {
      target.setAttribute('tabindex', '-1')
      target.focus({preventScroll: true})
    }
  }, [route])
  return route
}
