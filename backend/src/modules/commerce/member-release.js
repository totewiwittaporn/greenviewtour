// Phase-one release: customer self-service is closed, including direct API requests.
// The final argument is an internal injection used by isolated Local regression tests.
// It is never read from HTTP headers, cookies, query strings or deployment variables.
export function memberSurfacePaused(path,environment,regression=false){
  const member=path==='/api/member'||path.startsWith('/api/member/')
  return member&&!(environment==='local'&&regression===true)
}
