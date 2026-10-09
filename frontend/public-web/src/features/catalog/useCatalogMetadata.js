import {useEffect} from 'react'
import {catalogIndexing} from '../../../../../packages/contracts/public-catalog-url.js'
export function useCatalogMetadata(path,search,page){
 useEffect(()=>{
  const policy=catalogIndexing(path,search,page)
  const canonical=document.createElement('link')
  canonical.rel='canonical';canonical.href=new URL(policy.canonical,location.origin).href
  document.head.append(canonical)
  const robots=policy.noindex?document.createElement('meta'):null
  if(robots){robots.name='robots';robots.content='noindex, follow';document.head.append(robots)}
  return()=>{canonical.remove();robots?.remove()}
 },[path,search,page])
}
