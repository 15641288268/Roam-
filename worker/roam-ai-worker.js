// Roam V24 - Gemini document understanding. Set GEMINI_API_KEY and ROAM_ACCESS_TOKEN as Worker runtime Secrets.
const ORIGIN='https://15641288268.github.io';
const MODEL='gemini-3.8-flash';
export default {
 async fetch(request,env){
  const headers={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Roam-Token','Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store'};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST'||!['/analyze','/route-analyze'].includes(new URL(request.url).pathname))return reply({error:'Not found'},404);
  if(request.headers.get('Origin')!==ORIGIN)return reply({error:'Origin denied'},403);
  if(!env.GEMINI_API_KEY||!env.ROAM_ACCESS_TOKEN)return reply({error:'请在 Cloudflare Worker Runtime secrets 配置 GEMINI_API_KEY 和 ROAM_ACCESS_TOKEN'},503);
  if(request.headers.get('X-Roam-Token')!==env.ROAM_ACCESS_TOKEN)return reply({error:'访问口令错误'},401);
  if(Number(request.headers.get('content-length')||0)>21e6)return reply({error:'文件太大'},413);
  let payload;try{payload=await request.json()}catch{return reply({error:'Invalid JSON'},400)}
  const {data,filename}=payload||{};
  if(typeof data!=='string'||data.length>21e6)return reply({error:'文件太大或格式错误'},400);
  const match=data.match(/^data:(application\/pdf|image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if(!match)return reply({error:'仅支持 PDF、PNG、JPEG 或 WEBP'},400);
  const mime=match[1],base64=match[2];
  const isRoute=new URL(request.url).pathname==='/route-analyze';
  const prompt=isRoute?`你是交通路线截图识别助手。分析 Google Maps 路线截图，提取所有可见的备选方案、换乘步骤。只能提取截图明确可见的信息，不得推测或杜撰未显示的上下车站、班次、票价、时间。返回JSON对象：{ "from":"起点", "to":"终点", "options":[{"name":"方案1","mode":"公交","minutes":29,"cost":230,"currency":"JPY","departure":"20:43","arrival":"21:12","steps":[{"mode":"步行","line":"","from":"","to":"","minutes":10,"departure":""},{"mode":"公交","line":"202 City Bus","from":"清水道","to":"","minutes":0,"departure":"20:53"}]}] }。每种备选路线都要单独输出，若信息未显示，字符串为空、数字为0。识别公共交通、步行、JR、地铁、公交、出租车等模式。不要输出额外说明。`:`你是专业的旅行预订凭证分析助手。请直接视觉理解上传的完整 PDF/图片，提取准确的信息，不能凭空猜测。优先识别实际参观日期和预约时间而非票据打印时间。景点博物馆门票不得误识别成火车票。对同一场所同一时段的多页不同持票人票据合并为一笔预订；只汇总不同票据的票价，避免重复计算。地点请提供自然准确的简体中文翻译以及票据原文（英语或当地语言）。不要返回旅客姓名、邮箱、电话或其他个人信息。金额币种应为 ISO 4217，例如 EUR。所有不确定的字段使用空字符串或0，不得杜撰。严格返回单个 JSON 对象，字段为 type（只能是 住宿/机票/火车/门票/餐厅/其他）、nameOriginal、nameZh、date（YYYY-MM-DD）、time（HH:mm）、endTime（HH:mm或空）、quantity（整数）、currency、totalAmount（数字）、platform、reference。文件名：${String(filename||'').slice(0,120)}`;
  try{
   const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent',{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
    body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt},{inline_data:{mime_type:mime,data:base64}}]}],generationConfig:{responseMimeType:'application/json',temperature:0.1,maxOutputTokens:2048}})
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok){const detail=result.error?.message||'HTTP '+response.status;return reply({error:'Gemini API：'+detail},response.status===429?429:502)}
   const raw=(result.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');
   if(!raw)return reply({error:'Gemini 没有返回识别结果，请重试'},422);
   const booking=JSON.parse(raw);
   if(isRoute){if(!Array.isArray(booking.options)||!booking.options.length)return reply({error:'未能识别路线方案'},422);return reply({route:{from:String(booking.from||''),to:String(booking.to||''),options:booking.options.slice(0,8).map(o=>({name:String(o.name||''),mode:String(o.mode||'公交'),minutes:Math.max(0,Number(o.minutes)||0),cost:Math.max(0,Number(o.cost)||0),currency:String(o.currency||''),departure:String(o.departure||''),arrival:String(o.arrival||''),steps:Array.isArray(o.steps)?o.steps.slice(0,20):[],bookingIds:[]}))}})}

   if(!booking.nameOriginal||!booking.type)return reply({error:'未识别出有效的预订地点'},422);
   const allowed=['住宿','机票','火车','门票','餐厅','其他'];
   booking.type=allowed.includes(booking.type)?booking.type:'其他';
   booking.quantity=Math.max(1,Math.min(1000,Math.floor(Number(booking.quantity)||1)));
   booking.totalAmount=Math.max(0,Number(booking.totalAmount)||0);
   return reply({booking});
  }catch(e){return reply({error:'AI 识别异常：'+e.message},502)}
 }
};
