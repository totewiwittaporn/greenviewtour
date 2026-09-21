import {translateLabel as bilingualLabel} from '../../../core/i18n/runtime.js'
import { formatDate as displayDate } from '../../../core/i18n/runtime.js'
import {roleNames} from '../../../../../../packages/contracts/access.js'
import { translate as t, useLocale } from '../../../core/i18n/locale.jsx'
import {RefreshButton} from '../../../core/ui/RefreshButton.jsx'
import { TabPanel } from '../../../core/ui/TabPanel.jsx'
import { Pagination } from '../../../core/ui/Pagination.jsx'
import { SummaryCards } from '../../../core/ui/SummaryCards.jsx'
import { Tabs } from '../../../core/ui/Tabs.jsx'
import { Dropdown } from '../../../core/ui/Dropdown.jsx'
import { StaffInvitations } from './StaffInvitations.jsx'
import { ResetPassword } from './ResetPassword.jsx'
import { UserActions } from './UserActions.jsx'
import { UserAccess } from './UserAccess.jsx'
import { api } from '../../../core/auth/api.js'
import { useEffect, useState } from 'react'
import { Button } from '../../../core/ui/Button.jsx'
import { Icon } from '../../../core/ui/Icon.jsx'
import { SearchField } from '../../../core/ui/SearchField.jsx'
import { DataTable } from '../../../core/ui/DataTable.jsx'
const formatDate = value => value ? displayDate(new Date(value), { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }) : 'Not yet'
export default function UsersPage({ onProfileSaved }) {
 useLocale();
  const [selectedTab, setTab] = useState('users')
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
  const tab = data?.canInvite ? selectedTab : 'users'
  const summary = data?.summary
  const connected = Boolean(data && !error && !loading)
  return <>
    {data?.canInvite && <Tabs items={[{ id: 'users', label: 'Users' }, { id: 'invitations', label: 'Invitations' }]} value={tab} onChange={setTab} label={bilingualLabel("User management")} idPrefix="user-management" />}

    <section className="page-heading"><div><p className="eyebrow">{bilingualLabel("YOUR TEAM, IN ONE PLACE")}</p><h1>{tab === 'invitations' ? bilingualLabel('Invitations') : bilingualLabel('Users')}</h1><p className="muted">{tab === 'invitations' ? t('Invite employees and follow their account activation.') : t('A clear view of the people who access Greenview Tour.')}</p></div><div className="page-actions">{data?.canInvite && <Button className="button-primary" onClick={() => { setTab('invitations'); setInviteOpen(true) }}>{t("+ Add employee")}</Button>}</div></section>
    <div className="directory-tab-stage">
    <TabPanel active={tab === 'users'} preserveLayout className="directory-tab-panel" id="user-management-panel-users" labelledBy={data?.canInvite ? 'user-management-tab-users' : undefined}>
    <SummaryCards label={bilingualLabel("Account summary")} items={[
      { label: 'Total users', value: summary?.total, detail: 'Accounts in this workspace', icon: 'users' },
      { label: 'Verified emails', value: summary?.verified, detail: 'Email confirmation complete', icon: 'check' },
      { label: 'Have signed in', value: summary?.signed_in, detail: 'Accounts with a sign-in record', icon: 'globe' },
      { label: 'Pending verification', value: summary ? summary.total - summary.verified : undefined, detail: 'Email confirmation incomplete', icon: 'calendar' },
    ]} />
    <section className="panel table-panel" aria-labelledby="directory-heading"><div className="panel-heading"><div><h2 id="directory-heading">{bilingualLabel("User directory")}</h2><p>{t("Manage your team’s access and profile details.")}</p></div><span className={`connection ${connected ? 'connected' : error ? 'disconnected' : ''}`} role="status"><span />{loading ? t('Checking connection') : connected ? t('Database connected') : t('Connection unavailable')}</span></div>
      <div className="filterbar"><SearchField value={search} onChange={setSearch} onCompositionChange={setComposing} /><RefreshButton busy={loading} disabled={loading} onClick={() => setRefresh(n => n + 1)}/></div>
      <DataTable label={bilingualLabel("Users table")} columns={['User', 'Phone', 'Department / Role', 'Email verification', 'Last sign-in', 'Actions']} busy={loading} error={t(error)} onRetry={() => setRefresh(n => n + 1)} isEmpty={!data?.users.length} loadingLabel="Loading users…" empty={<><h3>{query ? bilingualLabel('No matching users') : bilingualLabel('Your team starts here')}</h3><p>{query ? t('Try another email address or clear the search.') : t('No user accounts have been created yet.')}</p>{query && <Button onClick={() => setSearch('')}>{t("Clear search")}</Button>}</>}>
        {data?.users.map(user => <tr key={user.id}><td><div className="user-cell"><span className="avatar">{(user.email || '?')[0].toUpperCase()}</span><div><strong>{user.displayName || user.email}</strong><small>{user.email}</small></div></div></td><td><div className="phone-cell">{user.primaryPhone ? <a href={`tel:${user.primaryPhone.replace(/[^+0-9]/g, '')}`} aria-label={t("Call {value0}: {value1}", {value0: user.displayName, value1: user.primaryPhone})}>{user.primaryPhone}</a> : <span className="muted">{t("Not provided")}</span>}{user.emergencyPhone && <><small>{t("Emergency")}</small><a href={`tel:${user.emergencyPhone.replace(/[^+0-9]/g, '')}`} aria-label={t("Call emergency number for {value0}: {value1}", {value0: user.displayName, value1: user.emergencyPhone})}>{user.emergencyPhone}</a></>}</div></td><td><strong>{t(user.department || 'Not assigned')}</strong><small className="role-label">{user.roles?.map(role => t(roleNames[role.roleCode] || role.roleCode)).join(' · ')}</small></td><td><span className={`badge ${user.email_confirmed_at ? 'verified' : ''}`}>{user.email_confirmed_at ? t('Verified') : t('Pending')}</span></td><td>{formatDate(user.last_sign_in_at)}</td><td><Dropdown rowActions label={bilingualLabel("Actions for {value0}", {value0: user.email})} items={[
          { label: 'View user', icon: 'view', onSelect: () => setSelected({ user, mode: 'view' }) },
          ...(user.canConfigureAccess ? [{label:'Configure permissions',icon:'settings',onSelect:()=>setSelected({user,mode:'access'})}] : []),
          ...(user.canEdit ? [{ label: 'Edit user', icon: 'edit', onSelect: () => setSelected({ user, mode: 'edit' }) }] : []),
          ...(user.canResetPassword ? [{ label: 'Send password reset', icon: 'mail', onSelect: () => setResetUser(user) }] : []),
        ]}/></td></tr>)}
      </DataTable>
      <Pagination page={data?.page ?? page} pageSize={25} total={error || loading ? undefined : data?.total} busy={loading} onPageChange={setPage} label={bilingualLabel("Users pagination")} />
    </section>
    </TabPanel>
    {data?.canInvite && <TabPanel active={tab === 'invitations'} preserveLayout className="directory-tab-panel" id="user-management-panel-invitations" labelledBy="user-management-tab-invitations"><StaffInvitations open={inviteOpen} onClose={() => setInviteOpen(false)} /></TabPanel>}
    </div>
    {resetUser && <ResetPassword user={resetUser} onClose={() => setResetUser(null)} />}
    {notice && <p role="status">{t(notice)}</p>}
    {selected?.mode==='access' && <UserAccess user={selected.user} onClose={()=>setSelected(null)} onSaved={()=>{setSelected(null);setNotice('User permissions updated.');setRefresh(n=>n+1);onProfileSaved?.()}}/>}
    {selected && selected.mode!=='access' && <UserActions user={selected.user} initialMode={selected.mode} canChangeDepartment={data?.canChangeDepartment} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); setNotice('User profile updated.'); setRefresh(n => n + 1); onProfileSaved?.() }} />}
    {data && <p style={{ visibility: tab === 'users' ? 'visible' : 'hidden' }} className="last-checked" role="status">{t("Last updated")}{' '}{displayDate(new Date(data.checkedAt), { timeStyle: 'medium', timeZone: 'Asia/Bangkok' })}{' '}{t("· Bangkok time")}</p>}
  </>
}
