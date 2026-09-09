export const settingsGroups = [
  { id: 'company-tours', label: 'Company & Tours', entities: ['company', 'tours'] },
  { id: 'tour-services', label: 'Tour services', entities: ['services', 'components'] },
  { id: 'equipment-supplies', label: 'Equipment & Supplies', entities: ['equipment', 'consumables', 'stores'] },
  { id: 'partners-sales', label: 'Partners & Sales', entities: ['partners', 'rates', 'channels'] },
  { id: 'transport-pickup', label: 'Transport & Pickup', entities: ['locations', 'vehicles'] },
]
export const settingsGroupFor = entity => settingsGroups.find(group => group.entities.includes(entity))
