import OperationsPage from '../features/operations/OperationsPage.jsx'
import { operationTitles } from '../features/operations/operationGroups.js'
import { NavigationProvider, useNavigation } from '../core/navigation/Navigation.jsx'
import SettingsPage from '../features/settings/shared/SettingsPage.jsx'
import { catalog } from '../../../../packages/contracts/catalog.js'
import { useEffect, useState } from 'react'
import { Shell } from '../core/ui/Shell.jsx'
import { Button } from '../core/ui/Button.jsx'
import { api, authMessage } from '../core/auth/api.js'
import UsersPage from '../features/settings/users/UsersPage.jsx'
import ProfilePage from '../features/profile/ProfilePage.jsx'
import AuthPage from '../features/auth/AuthPage.jsx'
const routes = { '/login': 'login', '/register': 'register', '/accept-invitation': 'register', '/forgot-password': 'forgot', '/reset-password': 'reset' }
function Workspace() {
  const {location, navigate, runAction} = useNavigation()
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
  const [signingOut, setSigningOut] = useState(false), [logoutError, setLogoutError] = useState('')
  async function logout() {
    if (signingOut) return
    setSigningOut(true); setLogoutError('')
    try { await api('/api/auth/logout', {}); window.location.replace('/login') }
    catch (error) { setLogoutError(authMessage(error)); setSigningOut(false) }
  }
  const allowed = Boolean(state.user?.management)
  const path = location.pathname.replace(/\/$/, '') || '/'
  const usersRoute = path === '/settings/users' || (path === '/' && allowed)
  const profileRoute = path === '/profile'
  const entity = path.startsWith('/settings/') ? path.slice('/settings/'.length) : ''
  const settingsRoute = Object.hasOwn(catalog, entity) && !catalog[entity].operation
  const operationEntity = path.startsWith('/operations/') ? path.slice('/operations/'.length) : ''
  const operationsRoute = Object.hasOwn(operationTitles, operationEntity)
  const title = operationsRoute ? operationTitles[operationEntity] : settingsRoute ? catalog[entity].title : profileRoute ? 'Edit profile' : usersRoute ? 'Users' : 'Workspace'
  useEffect(() => { document.title = `${title} · Greenview Tour` }, [title])
  return <Shell user={state.user} onLogout={() => runAction(logout)} signingOut={signingOut} canReadUsers={allowed} logoutError={logoutError} pageTitle={title} onEditProfile={() => navigate('/profile')}>
    {state.loading ? <p role="status">Checking your account…</p> : state.error ? <section className="panel auth-result" role="alert"><h1>Unable to open workspace</h1><p>{state.error}</p><Button onClick={() => { setState({ loading: true }); setAttempt(n => n + 1) }}>Retry</Button><a href="/login">Return to sign in</a></section>
      : operationsRoute ? state.user.management?.company ? <OperationsPage entity={operationEntity} /> : <section className="panel auth-result"><h1>Access restricted</h1><p>Tour operations are available to company managers.</p><a href="/">Return to workspace</a></section> : settingsRoute ? state.user.management?.company ? <SettingsPage entity={entity} /> : <section className="panel auth-result"><h1>Access restricted</h1><p>Company settings are available to company managers.</p><a href="/">Return to workspace</a></section> : profileRoute ? <ProfilePage user={state.user} onSaved={user => setState({ user })} /> : usersRoute ? allowed ? <UsersPage onProfileSaved={() => setAttempt(n => n + 1)} /> : <section className="panel auth-result"><h1>Access restricted</h1><p>Your account does not have permission to view the company user directory.</p><a href="/">Go to your workspace</a></section>
        : path === '/' ? <section className="panel auth-result"><span className="eyebrow">YOUR WORKSPACE</span><h1>Welcome, {state.user.displayName}</h1><p>You are signed in. Your work modules will appear here as they become available.</p><p>{state.user.roles.map(role => role.name).join(' · ')}</p></section>
          : <section className="panel auth-result"><h1>Page not found</h1><a href="/">Return to workspace</a></section>}
  </Shell>
}
function RoutedApp() {
  const { location } = useNavigation()
  const mode = routes[location.pathname.replace(/\/$/, '')]
  return mode ? <AuthPage mode={mode} /> : <Workspace />
}

export default function App() { return <NavigationProvider><RoutedApp /></NavigationProvider> }
