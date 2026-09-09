import DailyClosePage from './DailyClosePage.jsx'
import DispatchPage from './DispatchPage.jsx'
import { Tabs } from '../../core/ui/Tabs.jsx'
import { TabPanel } from '../../core/ui/TabPanel.jsx'
import { useNavigation } from '../../core/navigation/Navigation.jsx'
import CatalogPage from '../settings/shared/CatalogPage.jsx'
import BookingsPage from './BookingsPage.jsx'
import StockPage from './StockPage.jsx'
import { operationGroups, operationTitles } from './operationGroups.js'
export default function OperationsPage({entity,actor}) {
 const {navigate,hrefFor,location}=useNavigation(),group=operationGroups.find(g=>g.entities.includes(entity)),prefix=`operations-${group.id}`,entities=group.entities.filter(id=>!['slots','daily-close'].includes(id)||actor?.management?.company)
 return <><Tabs items={entities.map(id=>({id,label:operationTitles[id]}))} value={entity} onChange={id=>{if(id!==entity)navigate(hrefFor(`/operations/${id}`))}} label={group.label} idPrefix={prefix}/>{entities.map(id=><TabPanel key={id} active={entity===id} id={`${prefix}-panel-${id}`} labelledBy={`${prefix}-tab-${id}`}>{entity===id&&(id==='daily-close'?<DailyClosePage key={`${entity}:${location.search}`} actor={actor}/>:['guide','driver'].includes(id)?<DispatchPage key={`${entity}:${location.search}`} mode={id==='guide'?'BOAT':'VEHICLE'} actor={actor}/>:id==='bookings'?<BookingsPage actor={actor} key={`${entity}:${location.search}`}/>:['stock','issues','movements'].includes(id)?<StockPage key={`${entity}:${location.search}`} entity={id}/>:<CatalogPage key={`${entity}:${location.search}`} entity={id}/>)}</TabPanel>)}</>
}
