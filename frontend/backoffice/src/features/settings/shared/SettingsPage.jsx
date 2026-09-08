import { catalog } from '../../../../../../packages/contracts/catalog.js'
import { TabPanel } from '../../../core/ui/TabPanel.jsx'
import { Tabs } from '../../../core/ui/Tabs.jsx'
import { useNavigation } from '../../../core/navigation/Navigation.jsx'
import CatalogPage from './CatalogPage.jsx'
import { settingsGroupFor } from './settingsGroups.js'

export default function SettingsPage({ entity }) {
  const { navigate, hrefFor, location } = useNavigation()
  const group = settingsGroupFor(entity), prefix = `settings-${group.id}`
  return <><Tabs items={group.entities.map(id => ({id, label: catalog[id].title}))} value={entity} onChange={id => { if (id !== entity) navigate(hrefFor(`/settings/${id}`)) }} label={group.label} idPrefix={prefix} />
    {group.entities.map(id => <TabPanel key={id} active={entity === id} id={`${prefix}-panel-${id}`} labelledBy={`${prefix}-tab-${id}`}>{entity === id && <CatalogPage key={`${entity}:${location.search}`} entity={entity} />}</TabPanel>)}
  </>
}
