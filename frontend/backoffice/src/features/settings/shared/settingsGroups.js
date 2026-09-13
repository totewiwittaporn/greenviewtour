export const settingsGroups = [
  { id: 'company-tours', label: 'Company', entities: ['company'] },
  { id: 'tour-services', label: 'Tour programs & services', entities: ['tours', 'services', 'components'] },
  { id: 'equipment-supplies', label: 'Equipment & Supplies', entities: ['equipment', 'consumables', 'stores'] },
  { id: 'partners-sales', label: 'Partners & Sales', entities: ['partners', 'rates', 'agreements', 'channels'] },
  { id: 'transport-pickup', label: 'Transport & Pickup', entities: ['locations', 'vehicles'] },
]
export const settingsGroupFor = entity => settingsGroups.find(group => group.entities.includes(entity))
