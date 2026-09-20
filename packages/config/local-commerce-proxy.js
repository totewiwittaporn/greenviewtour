import process from 'node:process'
// Development-only proxy: member/public clients cannot borrow workspace routes.
export function commerceProxy(port, prefixes) {
 return Object.fromEntries(prefixes.map(prefix=>[prefix,{
  target:`http://127.0.0.1:${process.env.LOCAL_API_PORT||5001}`,changeOrigin:true,
  configure(proxy){proxy.on('proxyReq',(outgoing,incoming)=>{
   outgoing.removeHeader('x-greenview-local-token')
   const allowed=(!incoming.headers.origin||[`http://localhost:${port}`,`http://127.0.0.1:${port}`].includes(incoming.headers.origin))&&incoming.headers['sec-fetch-site']!=='cross-site'
   if(allowed&&process.env.LOCAL_API_TOKEN)outgoing.setHeader('x-greenview-local-token',process.env.LOCAL_API_TOKEN)
  })},
 }]))
}

// Keep tool-managed macOS writes visible to every local frontend.
export const commerceWatch=process.platform==='darwin'?{usePolling:true,interval:500}:undefined
