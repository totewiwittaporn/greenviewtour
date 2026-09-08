import { useEffect, useState } from 'react'
import { Shell } from '../core/ui/Shell.jsx'
import { Button } from '../core/ui/Button.jsx'
import { api, authMessage } from '../core/auth/api.js'
import UsersPage from '../features/settings/users/UsersPage.jsx'
import { UserActions } from '../features/settings/users/UserActions.jsx'
import AuthPage from '../features/auth/AuthPage.jsx'
const routes = { '/login': 'login', '/register': 'register', '/accept-invitation': 'register', '/forgot-password': 'forgot', '/reset-password': 'reset' }
function Workspace() {
  const [state, setState] = useState({ loading: true }), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    api('/api/me', undefined, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) }).then(data => setState({ user: data.user })).catch(error => {
      if (controller.signal.aborted) return
      if (error.status === 401) { window.location.replace('/login'); return }
      setState({ error: authMessage(error) })
    })
    return () => controller.abort()
  }, [attempt])
  const [editSelf, setEditSelf] = useState(false)
  const [signingOut, setSigningOut] = useState(false), [logoutError, setLogoutError] = useState('')
  async function logout() {
    if (signingOut) return
    setSigningOut(true); setLogoutError('')
    try { await api('/api/auth/logout', {}); window.location.replace('/login') }
    catch (error) { setLogoutError(authMessage(error)); setSigningOut(false) }
  }
  const allowed = Boolean(state.user?.management)
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const usersRoute = path === '/settings/users' || (path === '/' && allowed)
  useEffect(() => { document.title = `${usersRoute ? 'Users' : 'Workspace'} · Greenview Tour` }, [usersRoute])
  return <Shell user={state.user} onLogout={logout} signingOut={signingOut} canReadUsers={allowed} logoutError={logoutError} onEditProfile={() => setEditSelf(true)}>
    {state.loading ? <p role="status">Checking your account…</p> : state.error ? <section className="panel auth-result" role="alert"><h1>Unable to open workspace</h1><p>{state.error}</p><Button onClick={() => { setState({ loading: true }); setAttempt(n => n + 1) }}>Retry</Button><a href="/login">Return to sign in</a></section>
      : usersRoute ? allowed ? <UsersPage onProfileSaved={() => setAttempt(n => n + 1)} /> : <section className="panel auth-result"><h1>Access restricted</h1><p>Your account does not have permission to view the company user directory.</p><a href="/">Go to your workspace</a></section>
        : path === '/' ? <section className="panel auth-result"><span className="eyebrow">YOUR WORKSPACE</span><h1>Welcome, {state.user.displayName}</h1><p>You are signed in. Your work modules will appear here as they become available.</p><p>{state.user.roles.map(role => role.name).join(' · ')}</p></section>
          : <section className="panel auth-result"><h1>Page not found</h1><a href="/">Return to workspace</a></section>}
    {editSelf && state.user && <UserActions self initialMode="edit" user={{ ...state.user, roles: state.user.roles.map(role => ({ roleCode: role.code })) }} onClose={() => setEditSelf(false)} onSaved={() => { setEditSelf(false); setAttempt(n => n + 1) }} />}
  </Shell>
}
export default function App() {
  const mode = routes[window.location.pathname.replace(/\/$/, '')]
  return mode ? <AuthPage mode={mode} /> : <Workspace />
}
