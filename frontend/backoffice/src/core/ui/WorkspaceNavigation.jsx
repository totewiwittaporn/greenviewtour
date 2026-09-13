import { workspaceRoute, canUseOperation } from '../navigation/workspaceRoutes.js'
import { useNavigation } from '../navigation/Navigation.jsx'
import { operationGroups } from '../../features/operations/operationGroups.js'
import { settingsGroups } from '../../features/settings/shared/settingsGroups.js'
import { Icon } from './Icon.jsx'
import {companyRoutes,canUseCompany} from '../../../../../packages/contracts/company-routes.js'
// Only implemented destinations are exposed. The full company plan is in docs/company-workflows.md.
const sections=[
 {label:'Sales & Bookings',operations:['booking'],settings:['partners-sales']},
 {label:'Tour Operations',operations:['driver','guide','schedules','daily-summary'],settings:[]},
 {label:'Inventory & Equipment',operations:['stock','stock-history'],settings:['equipment-supplies']},
 {label:'Housekeeping',operations:[],settings:[]},
 {label:'Purchasing',operations:[],settings:[]},
 {label:'Accounts & Finance',operations:[],settings:[]},
 {label:'Company & Personnel',operations:[],settings:['company-tours'],users:true},
 {label:'Settings',operations:[],settings:['tour-services','transport-pickup']},
]
export function WorkspaceNavigation({user,canReadUsers,pageTitle}) {
 const navigation=useNavigation(),route=workspaceRoute(navigation.location.pathname)
 const active=(kind,group)=>route?.kind===kind&&group.entities.includes(route.entity)
 const link=(kind,group)=><a key={`${kind}-${group.id}`} href={navigation.hrefFor(`/${kind}/${group.entities[0]}`)} aria-current={active(kind,group)?'page':undefined} className={`nav-item ${active(kind,group)?'selected':''}`}><Icon name={group.icon||'briefcase'}/>{group.label}</a>
 return <nav aria-label="Main navigation">{sections.map(section=>{
  const operations=operationGroups.filter(group=>section.operations.includes(group.id)&&canUseOperation(user,group)&&(group.id!=='daily-summary'||user?.management?.company))
  const settings=user?.management?.company?settingsGroups.filter(group=>section.settings.includes(group.id)):[]
  const company=Object.entries(companyRoutes).filter(([,r])=>r.section===section.label&&canUseCompany(user,r))
  if(!operations.length&&!settings.length&&!company.length&&!(section.users&&canReadUsers))return null
  return <div key={section.label}><div className="nav-section-label">{section.label}</div>{operations.map(group=>link('operations',group))}{settings.map(group=>link('settings',group))}
   {section.users&&canReadUsers&&<a href="/settings/users" aria-current={pageTitle==='Users'?'page':undefined} className={`nav-item ${pageTitle==='Users'?'selected':''}`}><Icon name="users"/>Users</a>}
   {company.map(([key,r])=><a key={key} href={navigation.hrefFor('/company/'+key)} aria-current={route?.kind==='company'&&route.entity===key?'page':undefined} className={`nav-item ${route?.kind==='company'&&route.entity===key?'selected':''}`}><Icon name="briefcase"/>{r.title}</a>)}
  </div>
 })}</nav>
}
