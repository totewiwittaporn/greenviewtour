export function catalogPage(search){
 const value=new URLSearchParams(search).get('page')
 return value&&/^[1-9]\d*$/.test(value)&&Number(value)<=100000?Number(value):1
}
export function catalogPageHref(path,search,page){
 const params=new URLSearchParams(search)
 params.delete('page')
 if(page>1)params.set('page',String(page))
 return path+(params.size?'?'+params.toString():'')
}
export function catalogIndexing(path,search,actualPage=catalogPage(search)){
 const params=new URLSearchParams(search),slug=params.get('tour')
 if(slug)return {canonical:'/tours?tour='+encodeURIComponent(slug),noindex:path!=='/tours'||[...params.keys()].some(key=>key!=='tour')||params.getAll('tour').length!==1}
 const canonical=new URLSearchParams()
 for(const key of ['ownership','duration'])if(params.has(key))canonical.set(key,params.get(key))
 if(actualPage>1)canonical.set('page',String(actualPage))
 const noindex=[...params.keys()].some(key=>key!=='page')||params.getAll('page').length>1||(params.has('page')&&params.get('page')!==String(actualPage))
 return {canonical:path+(canonical.size?'?'+canonical.toString():''),noindex}
}
