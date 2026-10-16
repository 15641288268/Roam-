// Roam v178 — deploy separately to Cloudflare Workers or equivalent.
// Configure ALLOWED_ORIGIN for your own GitHub Pages domain.
// GET /?url=https%3A%2F%2Fmaps.app.goo.gl%2F...
const ALLOWED_ORIGIN='https://15641288268.github.io';
export default {async fetch(request){
 const cors={'Access-Control-Allow-Origin':ALLOWED_ORIGIN,'Vary':'Origin','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const input=new URL(request.url).searchParams.get('url');
 let u;try{u=new URL(input)}catch{return Response.json({error:'Invalid URL'},{status:400,headers:cors})}
 if(u.protocol!=='https:'||!['maps.app.goo.gl','goo.gl'].includes(u.hostname)||u.username||u.password)return Response.json({error:'Unsupported host'},{status:400,headers:cors});
 try{
  let resolved=u.href;
  for(let i=0;i<5;i++){
   const r=await fetch(resolved,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(6000),headers:{'User-Agent':'Mozilla/5.0'}});
   const next=r.headers.get('location');
   if(!next)break;
   const n=new URL(next,resolved);
   if(n.protocol!=='https:'||!(/(^|\\.)google\\.[a-z.]+$/.test(n.hostname)||n.hostname==='maps.app.goo.gl'||n.hostname==='goo.gl'))return Response.json({error:'Unexpected redirect'},{status:422,headers:cors});
   resolved=n.href;
  }
  return Response.json({url:resolved},{headers:cors});
 }catch{return Response.json({error:'Resolution failed'},{status:502,headers:cors})}
}};