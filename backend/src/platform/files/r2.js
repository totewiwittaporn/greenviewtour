const bytes=value=>value instanceof Uint8Array?value:new Uint8Array(value)

export class R2FileStore{
  constructor(bucket){
    if(!bucket?.put||!bucket?.get||!bucket?.delete)throw new Error('R2_BUCKET_REQUIRED')
    this.bucket=bucket
  }
  async put(key,value,{mimeType='application/octet-stream',sha256=null}={}){
    const body=bytes(value)
    await this.bucket.put(key,body,{
      httpMetadata:{contentType:mimeType},
      customMetadata:sha256?{sha256}:undefined,
    })
    return {key,size:body.byteLength,mimeType,sha256}
  }
  async putIfAbsent(key,value,{mimeType='application/octet-stream',sha256=null}={}){
    const body=bytes(value)
    const object=await this.bucket.put(key,body,{
      onlyIf:{etagDoesNotMatch:'*'},
      httpMetadata:{contentType:mimeType},
      customMetadata:sha256?{sha256}:undefined,
    })
    if(object)return {created:true,key,size:body.byteLength,mimeType,sha256}
    const existing=await this.head(key)
    if(!existing)throw new Error('R2_CONDITIONAL_WRITE_LOST')
    return {created:false,...existing}
  }
  async get(key){
    const object=await this.bucket.get(key)
    if(!object)return null
    const body=new Uint8Array(await object.arrayBuffer())
    return {
      key,
      body,
      size:object.size??body.byteLength,
      mimeType:object.httpMetadata?.contentType||'application/octet-stream',
      sha256:object.customMetadata?.sha256||null,
    }
  }
  async head(key){
    const object=await this.bucket.head(key)
    if(!object)return null
    return {
      key,
      size:object.size,
      mimeType:object.httpMetadata?.contentType||'application/octet-stream',
      sha256:object.customMetadata?.sha256||null,
    }
  }
  async delete(key){await this.bucket.delete(key)}
}
