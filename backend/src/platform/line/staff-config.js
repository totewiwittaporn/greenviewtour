// Public OA identity was checked in the owner's console; no secret is stored here.
export const staffOa=Object.freeze({name:'Greenview Staff',basicId:'@335bydey',providerId:'2005588057',channelId:'2011806264'})
export function staffLineSettings(env={}){
 const base={...staffOa,mode:'disabled',enabled:false,channelKey:'live:'+staffOa.providerId+':'+staffOa.channelId,addFriendUrl:'https://line.me/R/ti/p/%40335bydey',reason:'LINE_NOT_CONFIGURED'}
 // Local never becomes a live provider client by inheriting environment variables.
 if(env.APP_ENV!=='production'||env.LINE_STAFF_ENABLED!=='true')return {...base,reason:env.APP_ENV==='local'?'LINE_LOCAL_ONLY':'LINE_NOT_CONFIGURED'}
 let origin
 try{origin=new URL(env.BACKOFFICE_ORIGIN)}catch{return base}
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||['localhost','127.0.0.1','[::1]'].includes(origin.hostname))return base
 if(env.LINE_STAFF_CHANNEL_ID!==staffOa.channelId||env.LINE_STAFF_PROVIDER_ID!==staffOa.providerId||!/^U[0-9a-f]{32}$/.test(env.LINE_STAFF_BOT_ID||'')||!/^[a-f0-9]{32}$/i.test(env.LINE_STAFF_CHANNEL_SECRET||'')||typeof env.LINE_STAFF_ACCESS_TOKEN!=='string'||env.LINE_STAFF_ACCESS_TOKEN.length<40||typeof env.AUTH_SECRET!=='string'||env.AUTH_SECRET.length<32)return base
 const richMenu=value=>/^richmenu-[a-f0-9]{32}$/.test(value||'')?value:null
 return {...base,richMenuLinked:richMenu(env.LINE_STAFF_RICH_MENU_LINKED),richMenuUnlinked:richMenu(env.LINE_STAFF_RICH_MENU_UNLINKED),mode:'live',enabled:true,reason:null,origin:origin.origin,botId:env.LINE_STAFF_BOT_ID,secret:env.LINE_STAFF_CHANNEL_SECRET,accessToken:env.LINE_STAFF_ACCESS_TOKEN,encryptionSecret:env.AUTH_SECRET}
}
