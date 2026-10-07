const bindings=new WeakMap()

export function registerD1Client(client,database,{files=null}={}){
  if(!client||!database)throw new Error('D1_CLIENT_BINDING_REQUIRED')
  bindings.set(client,{database,files})
  return client
}

export function d1DatabaseFor(client){
  return client&&typeof client==='object'?bindings.get(client)?.database||null:null
}

export function d1FilesFor(client){
  return client&&typeof client==='object'?bindings.get(client)?.files||null:null
}

export function isD1Client(client){
  return Boolean(d1DatabaseFor(client))
}
