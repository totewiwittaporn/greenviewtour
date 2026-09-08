import { Shell } from '../core/ui/Shell.jsx'
import UsersPage from '../features/settings/users/UsersPage.jsx'
export default function App() {
  const supported = ['/', '/settings/users', '/settings/users/'].includes(window.location.pathname)
  return <Shell>{supported ? <UsersPage /> : <section className="page-heading"><div><h1>Page not found</h1><p><a href="/settings/users">Return to Users</a></p></div></section>}</Shell>
}
