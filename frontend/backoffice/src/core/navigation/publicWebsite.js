// Keep Local navigation on the developer's machine; hosted staff pages link to the public domain.
export function publicWebsiteOrigin(hostname=globalThis.location?.hostname){
 return ['localhost','127.0.0.1','[::1]'].includes(hostname)?'http://localhost:5173':'https://greenviewtour.com'
}
