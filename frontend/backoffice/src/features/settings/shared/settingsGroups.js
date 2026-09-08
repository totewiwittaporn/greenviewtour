export const settingsGroups = [
  { id: 'company-tours', label: 'Company & Tours', entities: ['company', 'tours'] },
  { id: 'partners-sales', label: 'Partners & Sales', entities: ['partners', 'rates', 'channels'] },
  { id: 'transport-pickup', label: 'Transport & Pickup', entities: ['locations', 'vehicles'] },
]
export const settingsGroupFor = entity => settingsGroups.find(group => group.entities.includes(entity))
