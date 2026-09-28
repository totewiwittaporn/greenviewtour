export function parseUsersQuery(params) {
  const search = (params.get('search') || '').trim()
  const page = Number(params.get('page') || 1)
  const pageSize = Number(params.get('pageSize') || 25)
  if (search.length > 100 || !Number.isSafeInteger(page) || page < 1 || page > 100000 || ![10, 25, 50].includes(pageSize)) {
    throw new Error('INVALID_FILTER')
  }
  const view=params.get('view'),recordId=params.get('recordId')
  if(view&&!['list','detail'].includes(view)||recordId&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recordId))throw new Error('INVALID_FILTER')
  return { search, page, pageSize, ...(view?{view}:{}), ...(recordId?{recordId}:{}) }
}
