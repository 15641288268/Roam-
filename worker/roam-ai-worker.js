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
  if(Number(request.headers.get('content-length')||0)>55e6)return reply({error:'文件太大'},413);
  let payload;try{payload=await request.json()}catch{return reply({error:'Invalid JSON'},400)}
  const isRoute=new URL(request.url).pathname==='/route-analyze';
  const {data,filename}=payload||{};
  const inputs=isRoute&&Array.isArray(payload.images)?payload.images:[data];
  if(!inputs.length||inputs.length>6)return reply({error:'请选择1到6张截图'},400);
  if(inputs.some(v=>typeof v!=='string'||v.length>20e6)||inputs.reduce((n,v)=>n+v.length,0)>28e6)return reply({error:'图片总大小超过限制，请缩小截图'},413);
  const parsed=inputs.map(v=>v.match(/^data:(application\\/pdf|image\\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/));
  if(parsed.some(v=>!v))return reply({error:'仅支持 PDF、PNG、JPEG 或 WEBP'},400);
  const parts=parsed.map((m,i)=>({inline_data:{mime_type:m[1],data:m[2]}}));
  const prompt=isRoute?`你是交通路线截图识别助手。同时分析用户上传的 ${inputs.length} 张 Google Maps 路线截图。这些截图属于同一条长路线，可能有上下重叠的区域、不同滚动位置或多个备选方案。必须跨图联合重建完整路线，按实际出行顺序合并步骤，识别上下图重叠的相同步骤并去重，切勿把同一线路拆成多个独立路线。若截图显示不同备选方案，分别输出为 options。不得重复累计费用和耗时。提取所有可见的备选方案、换乘步骤。只能提取截图明确可见的信息，不得推测或杜撰未显示的上下车站、班次、票价、时间。返回JSON对象：{ "from":"起点", "to":"终点", "options":[{"name":"方案1","mode":"公交","minutes":29,"cost":230,"currency":"JPY","departure":"20:43","arrival":"21:12","steps":[{"mode":"步行","line":"","from":"","to":"","minutes":10,"departure":""},{"mode":"公交","line":"202 City Bus","from":"清水道","to":"","minutes":0,"departure":"20:53"}]}] }。每种备选路线都要单独输出，若信息未显示，字符串为空、数字为0。识别公共交通、步行、JR、地铁、公交、出租车等模式。不要输出额外说明。`:`你是专业的旅行预订凭证分析助手。请直接视觉理解上传的完整 PDF/图片，提取准确的信息，不能凭空猜测。优先识别实际参观日期和预约时间而非票据打印时间。景点博物馆门票不得误识别成火车票。对同一场所同一时段的多页不同持票人票据合并为一笔预订；只汇总不同票据的票价，避免重复计算。地点请提供自然准确的简体中文翻译以及票据原文（英语或当地语言）。不要返回旅客姓名、邮箱、电话或其他个人信息。金额币种应为 ISO 4217，例如 EUR。所有不确定的字段使用空字符串或0，不得杜撰。严格返回单个 JSON 对象，字段为 type（只能是 住宿/机票/火车/门票/餐厅/其他）、nameOriginal、nameZh、date（YYYY-MM-DD）、time（HH:mm）、endTime（HH:mm或空）、quantity（整数）、currency、totalAmount（数字）、platform、reference。如果是机票或火车票，还要在 JSON 中提供 transport 对象，字段 carrier、number、from、to、departureDate、departureTime、arrivalDate、arrivalTime、boardingTime、terminal、gate、arrivalTerminal、platform、carriage、seat、cabin、baggage、ticketNumber。日期 YYYY-MM-DD，时间 HH:mm，必须分别使用出发地和到达地的当地时间，跨日航班不得将到达日期误填为出发日期。仅提取票据明确标注的内容，不要猜测机场、航站楼、登机口、检票时间。其他类型 transport 为 {}。文件名：${String(filename||'').slice(0,120)}`;
  try{
   const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent',{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
    body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt},...parts]}],generationConfig:{responseMimeType:'application/json',temperature:0.1,maxOutputTokens:isRoute?8192:2048}})
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
