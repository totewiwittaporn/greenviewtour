const roots={
  documentAsset:'document-assets',
  evidenceAttachment:'evidence',
  websiteImage:'website-images',
}

export function fileObjectKey(kind,id){
  const root=roots[kind]
  if(!root||typeof id!=='string'||!id||id.length>200||!/^[A-Za-z0-9._-]+$/.test(id))throw new Error('INVALID_FILE_OBJECT_KEY')
  return `${root}/${id}`
}

export const fileKinds=Object.freeze({...roots})
