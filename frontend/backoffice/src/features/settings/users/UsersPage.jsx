import { Dropdown } from '../../../core/ui/Dropdown.jsx'
import { StaffInvitations } from './StaffInvitations.jsx'
import { ResetPassword } from './ResetPassword.jsx'
import { UserActions } from './UserActions.jsx'
import { api } from '../../../core/auth/api.js'
import { useEffect, useState } from 'react'
import { Button } from '../../../core/ui/Button.jsx'
import { Icon } from '../../../core/ui/Icon.jsx'
import { SearchField } from '../../../core/ui/SearchField.jsx'
import { DataTable } from '../../../core/ui/DataTable.jsx'
const formatDate = value => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : 'Not yet'
export default function UsersPage({ onProfileSaved }) {
  const [tab, setTab] = useState('users')
  const [inviteOpen, setInviteOpen] = useState(false), [resetUser, setResetUser] = useState(null)
  const [selected,setSelected] = useState(null), [notice,setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [composing, setComposing] = useState(false)
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  useEffect(() => {
    if (composing) return
    if (!search) { setQuery(''); setPage(1); return }
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search, composing])
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort('timeout'), 15000)
    let active = true
    setState(old => ({ ...old, loading: true, error: '' }))
    async function load() {
      try {
        const data = await api(`/api/users?${new URLSearchParams({ search: query, page: String(page), pageSize: '25' })}`, undefined, { signal: controller.signal })
        if (!active) return
        setState({ loading: false, data, error: '' })
      } catch (error) {
        if (active) setState({ loading: false, data: null, error: controller.signal.aborted ? 'The request timed out. Check your connection and retry.' : error.status === 403 ? 'Your access to this directory has changed. Contact your Manager.' : 'Unable to load users. Check your connection and retry.' })
      } finally { clearTimeout(timeout) }
    }
    load()
    return () => { active = false; clearTimeout(timeout); controller.abort() }
  }, [query, page, refresh])
  const { data, loading, error } = state
  const summary = data?.summary
  const connected = Boolean(data && !error && !loading)
  return <>
    {data?.canInvite && <div className="core-tabs" role="tablist" aria-label="User management" onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const next = event.key === 'Home' ? 'users' : event.key === 'End' ? 'invitations' : tab === 'users' ? 'invitations' : 'users'
      setTab(next); document.getElementById(`tab-${next}`)?.focus()
    }}>{[['users', 'Users'], ['invitations', 'Invitations']].map(([id, label]) => <button key={id} id={`tab-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls={`panel-${id}`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}>{label}</button>)}</div>}

    <section className="page-heading"><div><p className="eyebrow">YOUR TEAM, IN ONE PLACE</p><h1>{tab === 'invitations' ? 'Invitations' : 'Users'}</h1><p className="muted">{tab === 'invitations' ? 'Invite employees and follow their account activation.' : 'A clear view of the people who access Greenview Tour.'}</p></div><div className="page-actions">{data?.canInvite && <Button className="button-primary" onClick={() => { setTab('invitations'); setInviteOpen(true) }}>+ Add employee</Button>}</div></section>
    <div id="panel-users" role={data?.canInvite ? 'tabpanel' : undefined} aria-labelledby={data?.canInvite ? 'tab-users' : undefined} hidden={tab !== 'users'}>
    <section className="metrics" aria-label="Account summary">{[
      ['Total users', summary?.total, 'Accounts in this workspace', 'users'],
      ['Verified emails', summary?.verified, 'Email confirmation complete', 'check'],
      ['Have signed in', summary?.signed_in, 'Accounts with a sign-in record', 'globe'],
    ].map(([label, value, detail, icon]) => <div className="metric" key={label}><div className="metric-label">{label}<span className="metric-icon"><Icon name={icon} /></span></div><strong>{value ?? '—'}</strong><span>{detail}</span></div>)}</section>
    <section className="panel" aria-labelledby="directory-heading"><div className="panel-heading"><div><h2 id="directory-heading">User directory</h2><p>Manage your team’s access and profile details.</p></div><span className={`connection ${connected ? 'connected' : error ? 'disconnected' : ''}`} role="status"><span />{loading ? 'Checking connection' : connected ? 'Database connected' : 'Connection unavailable'}</span></div>
      <div className="filterbar"><SearchField value={search} onChange={setSearch} onCompositionChange={setComposing} /><Button busy={loading} disabled={loading} onClick={() => setRefresh(n => n + 1)}><Icon name="refresh" />Refresh</Button></div>
      {error && <div className="inline-error" role="alert"><span>{error}</span><Button onClick={() => setRefresh(n => n + 1)}>Retry</Button></div>}
      <DataTable columns={['User', 'Phone', 'Department / Role', 'Email verification', 'Last sign-in', 'Actions']} busy={loading}>
        {loading ? <tr><td colSpan="6"><div className="empty-state" role="status"><span className="spinner" />Loading users…</div></td></tr> : error ? <tr><td colSpan="6"><div className="empty-state"><Icon name="globe" /><h3>Users are temporarily unavailable</h3><p>Retry when the connection is ready.</p></div></td></tr> : data?.users.length ? data.users.map(user => <tr key={user.id}><td><div className="user-cell"><span className="avatar">{(user.email || '?')[0].toUpperCase()}</span><div><strong>{user.displayName || user.email}</strong><small>{user.email}</small></div></div></td><td><div className="phone-cell">{user.primaryPhone ? <a href={`tel:${user.primaryPhone.replace(/[^+0-9]/g, '')}`} aria-label={`Call ${user.displayName}: ${user.primaryPhone}`}>{user.primaryPhone}</a> : <span className="muted">Not provided</span>}{user.emergencyPhone && <><small>Emergency</small><a href={`tel:${user.emergencyPhone.replace(/[^+0-9]/g, '')}`} aria-label={`Call emergency number for ${user.displayName}: ${user.emergencyPhone}`}>{user.emergencyPhone}</a></>}</div></td><td><strong>{user.department || 'Not assigned'}</strong><small className="role-label">{user.roles?.map(role => role.roleCode).join(' · ')}</small></td><td><span className={`badge ${user.email_confirmed_at ? 'verified' : ''}`}>{user.email_confirmed_at ? 'Verified' : 'Pending'}</span></td><td>{formatDate(user.last_sign_in_at)}</td><td><Dropdown label={`Actions for ${user.email}`} items={[
          { label: 'View user', onSelect: () => setSelected({ user, mode: 'view' }) },
          ...(user.canEdit ? [{ label: 'Edit user', onSelect: () => setSelected({ user, mode: 'edit' }) }] : []),
          ...(user.canResetPassword ? [{ label: 'Send password reset', onSelect: () => setResetUser(user) }] : []),
        ]}><span aria-hidden="true">⋯</span></Dropdown></td></tr>) : <tr><td colSpan="6"><div className="empty-state"><span className="empty-icon"><Icon name="users" width="30" height="30" /></span><h3>{query ? 'No matching users' : 'Your team starts here'}</h3><p>{query ? 'Try another email address or clear the search.' : 'The database is connected. No user accounts have been created yet.'}</p>{query && <Button onClick={() => setSearch('')}>Clear search</Button>}</div></td></tr>}
      </DataTable>
      <div className="table-footer"><span>{data ? `${data.total} ${data.total === 1 ? 'user' : 'users'}${query ? ' matching your search' : ''}` : '—'}<span className="page-size"> · 25 per page</span></span><div className="pagination"><Button disabled={loading || !data || data.page <= 1} onClick={() => setPage((data?.page || 1) - 1)}>Previous</Button><span>Page {data?.page || 1} of {Math.max(1, Math.ceil((data?.total || 0) / 25))}</span><Button disabled={loading || !data || data.page * 25 >= data.total} onClick={() => setPage((data?.page || 1) + 1)}>Next</Button></div></div>
    </section>
    </div>
    {data?.canInvite && <div id="panel-invitations" role="tabpanel" aria-labelledby="tab-invitations" hidden={tab !== 'invitations'}><StaffInvitations open={inviteOpen} onClose={() => setInviteOpen(false)} /></div>}
    {resetUser && <ResetPassword user={resetUser} onClose={() => setResetUser(null)} />}
    {notice && <p role="status">{notice}</p>}
    {selected && <UserActions user={selected.user} initialMode={selected.mode} canChangeDepartment={data?.canChangeDepartment} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); setNotice('User profile updated.'); setRefresh(n => n + 1); onProfileSaved?.() }} />}
    {data && tab === 'users' && <p className="last-checked" role="status">Last updated {new Intl.DateTimeFormat('en-GB', { timeStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(data.checkedAt))} · Bangkok time</p>}
  </>
}
