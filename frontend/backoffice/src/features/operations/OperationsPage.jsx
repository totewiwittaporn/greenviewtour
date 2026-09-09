import { Tabs } from '../../core/ui/Tabs.jsx'
import { TabPanel } from '../../core/ui/TabPanel.jsx'
import { useNavigation } from '../../core/navigation/Navigation.jsx'
import CatalogPage from '../settings/shared/CatalogPage.jsx'
import BookingsPage from './BookingsPage.jsx'
import StockPage from './StockPage.jsx'
import { operationGroups, operationTitles } from './operationGroups.js'
export default function OperationsPage({entity}) {
 const {navigate,hrefFor,location}=useNavigation(),group=operationGroups.find(g=>g.entities.includes(entity)),prefix=`operations-${group.id}`
 return <><Tabs items={group.entities.map(id=>({id,label:operationTitles[id]}))} value={entity} onChange={id=>{if(id!==entity)navigate(hrefFor(`/operations/${id}`))}} label={group.label} idPrefix={prefix}/>{group.entities.map(id=><TabPanel key={id} active={entity===id} id={`${prefix}-panel-${id}`} labelledBy={`${prefix}-tab-${id}`}>{entity===id&&(id==='bookings'?<BookingsPage key={`${entity}:${location.search}`}/>:['stock','issues','movements'].includes(id)?<StockPage key={`${entity}:${location.search}`} entity={id}/>:<CatalogPage key={`${entity}:${location.search}`} entity={id}/>)}</TabPanel>)}</>
}
