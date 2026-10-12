// Roam V24 - Gemini document understanding. Set GEMINI_API_KEY and ROAM_ACCESS_TOKEN as Worker runtime Secrets.
const ORIGIN='https://15641288268.github.io';
const MODEL='gemini-2.5-flash';
export default {
 async fetch(request,env){
  const headers={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Roam-Token','Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store'};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST'||new URL(request.url).pathname!=='/analyze')return reply({error:'Not found'},404);
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
  const prompt=`你是专业的旅行预订凭证分析助手。请直接视觉理解上传的完整 PDF/图片，提取准确的信息，不能凭空猜测。优先识别实际参观日期和预约时间而非票据打印时间。景点博物馆门票不得误识别成火车票。对同一场所同一时段的多页不同持票人票据合并为一笔预订；只汇总不同票据的票价，避免重复计算。地点请提供自然准确的简体中文翻译以及票据原文（英语或当地语言）。不要返回旅客姓名、邮箱、电话或其他个人信息。金额币种应为 ISO 4217，例如 EUR。所有不确定的字段使用空字符串或0，不得杜撰。严格返回单个 JSON 对象，字段为 type（只能是 住宿/机票/火车/门票/餐厅/其他）、nameOriginal、nameZh、date（YYYY-MM-DD）、time（HH:mm）、endTime（HH:mm或空）、quantity（整数）、currency、totalAmount（数字）、platform、reference。文件名：${String(filename||'').slice(0,120)}`;
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
   if(!booking.nameOriginal||!booking.type)return reply({error:'未识别出有效的预订地点'},422);
   const allowed=['住宿','机票','火车','门票','餐厅','其他'];
   booking.type=allowed.includes(booking.type)?booking.type:'其他';
   booking.quantity=Math.max(1,Math.min(1000,Math.floor(Number(booking.quantity)||1)));
   booking.totalAmount=Math.max(0,Number(booking.totalAmount)||0);
   return reply({booking});
  }catch(e){return reply({error:'AI 识别异常：'+e.message},502)}
 }
};
