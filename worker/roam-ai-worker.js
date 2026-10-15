function parseAIJSON(text){
 const raw=String(text||'').trim();
 const candidates=[raw,raw.replace(/^\`\`\`(?:json)?\s*/i,'').replace(/\s*\`\`\`$/,'')];
 const start=raw.indexOf('{'),end=raw.lastIndexOf('}');
 if(start>=0&&end>start)candidates.push(raw.slice(start,end+1));
 for(const candidate of candidates){try{const obj=JSON.parse(candidate);if(obj&&typeof obj==='object'&&!Array.isArray(obj))return obj}catch{}}
 // Recover a complete days array when the response was truncated mid-JSON.
 const daysKey=raw.indexOf('"days"');
 const bracket=daysKey>=0?raw.indexOf('[',daysKey):-1;
 const m=bracket>=0?{index:daysKey}:null;
 if(m){const start=raw.indexOf('[',m.index),items=[];let depth=0,inString=false,escaped=false,objStart=-1;
  for(let i=start+1;i<raw.length;i++){const c=raw[i];if(inString){if(escaped)escaped=false;else if(c==='\\\\')escaped=true;else if(c==='"')inString=false;continue}
   if(c==='"'){inString=true;continue}if(c==='{'){if(depth++===0)objStart=i}else if(c==='}'&&depth>0){if(--depth===0&&objStart>=0){try{items.push(JSON.parse(raw.slice(objStart,i+1)))}catch{}objStart=-1}}}
  if(items.length)return {summary:'已保留成功生成的部分行程',days:items};
 }
 return null;
}
// Roam V24 - Gemini document understanding. Set GEMINI_API_KEY and ROAM_ACCESS_TOKEN as Worker runtime Secrets.
const ORIGIN='https://15641288268.github.io';
const MODEL='gemini-3.8-flash';

async function textAssistantV68(payload,env){
 const mode=String(payload.mode||'chat'),question=String(payload.prompt||'').slice(0,5000),context=JSON.stringify(payload.context||{}).slice(0,8000);
 if(!question.trim())return {error:'请输入 AI 请求',status:400};
 const schemas={plan:'{"summary":"说明","destination":"城市","days":[{"day":1,"places":[{"name":"真实景点名称","activity":"游玩活动","time":"09:00","type":"景点","minutes":90,"cost":0}]}]}',place:'{"answer":"景点建议、附近餐饮、游览时长及待核实信息"}',optimize:'{"answer":"优化建议，按天说明行程与交通安排"}',budget:'{"answer":"预算分析与省钱建议"}'};
 const prompt='你是 Roam 旅行助手。仅用简体中文，不能虚构实时票价、营业时间、实时班次、预约网址。JSON 必须有效。'+(mode==='plan'?'地点名必须是地图上的真实实体，活动另写activity。每天最多8个地点，按用户指定的全部日期输出；如输出受限，优先保留已完成的天数。输出简洁，每个景点不超过60字。':'')+'按照 JSON 格式返回：'+(schemas[mode]||'{"answer":"中文答复"}')+'\n旅行上下文：'+context+'\n用户要求：'+question;
 const errors=[];
 const repairPlan=(p)=>{
  if(mode!=='plan'||!p||typeof p!=='object')return p;
  if(!Array.isArray(p.days)&&Array.isArray(p.itinerary))p.days=p.itinerary;
  if(!Array.isArray(p.days))return p;
  p.days=p.days.map((d,i)=>({...d,day:Number(d.day)||i+1,places:(Array.isArray(d.places)?d.places:Array.isArray(d.activities)?d.activities:[]).map(x=>typeof x==='string'?{name:x,time:'09:00',activity:''}:{...x,name:x.name||x.place||x.title||'',activity:x.activity||x.description||'',time:/^[0-9]{2}:[0-9]{2}$/.test(x.time||'')?x.time:'09:00'}).filter(x=>x.name)})).filter(d=>d.places.length);
  return p;
 };
 const accept=(value,provider)=>{const parsed=repairPlan(parseAIJSON(typeof value==='string'?value:JSON.stringify(value||'')));if(!parsed)return null;if(mode==='plan'&&(!Array.isArray(parsed.days)||!parsed.days.length))return null;return {result:parsed,provider}};
 async function limited(label,url,options,parseReply,ms=11500,retries=0){
  for(let attempt=0;attempt<=retries;attempt++){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{
   const r=await fetch(url,{...options,signal:controller.signal});
   const d=await r.json().catch(()=>({}));
   if(!r.ok){if((r.status===503||r.status===429)&&attempt<retries){await new Promise(resolve=>setTimeout(resolve,700));continue}errors.push(label+' HTTP '+r.status+': '+String(d.error?.message||'服务限流或模型不可用').slice(0,120));return null}
   const result=accept(parseReply(d),label);
   if(!result)errors.push(label+' 返回格式不符合要求');
   return result;
  }catch(e){errors.push(label+(controller.signal.aborted?' 响应超时（'+Math.round(ms/1000)+'秒）':': '+String(e.message||e).slice(0,100)));return null}
  finally{clearTimeout(timer)}
  }
  return null;
 }
 // Provider priority: Gemini → OpenRouter → Groq → Cloudflare Workers AI.
 if(env.GEMINI_API_KEY){
  const result=await limited('Gemini','https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent',{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
   body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.2,maxOutputTokens:6000}})
  },d=>(d.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join(''),8500,1);
  if(result)return result;
 }
 if(env.OPENROUTER_API_KEY){
  const result=await limited('OpenRouter','https://openrouter.ai/api/v1/chat/completions',{
   method:'POST',headers:{Authorization:'Bearer '+env.OPENROUTER_API_KEY,'Content-Type':'application/json','HTTP-Referer':'https://15641288268.github.io/Roam-/','X-Title':'Roam Travel Planner'},
   body:JSON.stringify({model:'openrouter/free',messages:[{role:'user',content:prompt}],temperature:0.2,max_tokens:6500})
  },d=>d.choices?.[0]?.message?.content);
  if(result)return result;
 }
 if(env.GROQ_API_KEY){
  const result=await limited('Groq','https://api.groq.com/openai/v1/chat/completions',{
   method:'POST',headers:{Authorization:'Bearer '+env.GROQ_API_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({model:'openai/gpt-oss-120b',messages:[{role:'user',content:prompt}],temperature:0.2,max_tokens:4200})
  },d=>d.choices?.[0]?.message?.content);
  if(result)return result;
 }
 // Cloudflare Workers AI: fourth, quota-limited free text fallback; requires AI binding, not another API key.
 if(env.AI&&typeof env.AI.run==='function'){
  try{
   const output=await Promise.race([
    env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8',{messages:[{role:'system',content:'你是旅行规划助手。只返回合法 JSON 对象，不要附加解释。'},{role:'user',content:prompt}],max_tokens:3200,temperature:0.2}),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('响应超时')),14500))
   ]);
   const answer=typeof output==='string'?output:output?.response||output?.result?.response||'';
   const result=accept(answer,'Cloudflare Workers AI');
   if(result)return result;
   errors.push('Cloudflare Workers AI 返回格式不符合要求');
  }catch(e){errors.push('Cloudflare Workers AI：'+String(e?.message||e).slice(0,120))}
 }
 return {error:'AI 服务均未成功（每个服务最多等待约12秒）：'+errors.join('；'),status:503};
}


export default {
 async fetch(request,env){
  const headers={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Roam-Token','Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store','X-Roam-Version':'V101','Access-Control-Expose-Headers':'X-Roam-Version'};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST'||!['/analyze','/route-analyze','/assistant'].includes(new URL(request.url).pathname))return reply({error:'Not found'},404);
  if(request.headers.get('Origin')!==ORIGIN)return reply({error:'Origin denied'},403);
  if(!env.ROAM_ACCESS_TOKEN)return reply({error:'请在 Cloudflare Worker Runtime secrets 配置 ROAM_ACCESS_TOKEN'},503);
  const path=new URL(request.url).pathname;
  if(!env.GEMINI_API_KEY&&!env.OPENROUTER_API_KEY&&!env.GROQ_API_KEY&&!(path==='/assistant'&&env.AI))return reply({error:path==='/assistant'?'请配置 Groq、Gemini、OpenRouter 任一密钥，或添加 Cloudflare Workers AI 绑定（名称 AI）':'截图与凭证识别需要 GEMINI_API_KEY、OPENROUTER_API_KEY 或 GROQ_API_KEY'},503);
  if(request.headers.get('X-Roam-Token')!==env.ROAM_ACCESS_TOKEN)return reply({error:'访问口令错误'},401);
  if(Number(request.headers.get('content-length')||0)>55e6)return reply({error:'文件太大'},413);
  let payload;try{payload=await request.json()}catch{return reply({error:'Invalid JSON'},400)}
  if(new URL(request.url).pathname==='/assistant'){const answer=await textAssistantV68(payload,env);return reply(answer,answer.status||200)}
  const isRoute=new URL(request.url).pathname==='/route-analyze';
  const {data,filename}=payload||{};
  const extractedText=String(payload?.extractedText||'').slice(0,18000);
  const inputs=Array.isArray(payload.images)&&payload.images.length?payload.images:[data];
  if(!inputs.length||inputs.length>6)return reply({error:'请选择1到6张截图'},400);
  if(inputs.some(v=>typeof v!=='string'||v.length>20e6)||inputs.reduce((n,v)=>n+v.length,0)>28e6)return reply({error:'图片总大小超过限制，请缩小截图'},413);
  const parsed=inputs.map(v=>v.match(/^data:(application\/pdf|image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/));
  if(parsed.some(v=>!v))return reply({error:'仅支持 PDF、PNG、JPEG 或 WEBP'},400);
  const parts=parsed.map((m,i)=>({inline_data:{mime_type:m[1],data:m[2]}}));
  const prompt=isRoute?`你是交通路线截图识别助手。同时分析用户上传的 ${inputs.length} 张 Google Maps 路线截图。这些截图属于同一条长路线，可能有上下重叠的区域、不同滚动位置或多个备选方案。必须跨图联合重建完整路线，按实际出行顺序合并步骤，识别上下图重叠的相同步骤并去重，切勿把同一线路拆成多个独立路线。若截图显示不同备选方案，分别输出为 options。不得重复累计费用和耗时。提取所有可见的备选方案、换乘步骤。只能提取截图明确可见的信息，不得推测或杜撰未显示的上下车站、班次、票价、时间。返回JSON对象：{ "from":"起点", "to":"终点", "options":[{"name":"方案1","mode":"公交","minutes":29,"cost":230,"currency":"JPY","departure":"20:43","arrival":"21:12","steps":[{"mode":"步行","line":"","from":"","to":"","minutes":10,"departure":""},{"mode":"公交","line":"202 City Bus","from":"清水道","to":"","minutes":0,"departure":"20:53"}]}] }。每种备选路线都要单独输出，若信息未显示，字符串为空、数字为0。识别公共交通、步行、JR、地铁、公交、出租车等模式。不要输出额外说明。`:`你是专业的旅行预订凭证分析助手。用户可能提供同一份 PDF 转换的多张连续页面图片，必须联合阅读所有页面，避免遗漏航班区段和时间。请直接视觉理解上传的完整 PDF/图片，提取准确的信息，不能凭空猜测。优先识别实际参观日期和预约时间而非票据打印时间。景点博物馆门票不得误识别成火车票。对同一场所同一时段的多页不同持票人票据合并为一笔预订；只汇总不同票据的票价，避免重复计算。地点请提供自然准确的简体中文翻译以及票据原文（英语或当地语言）。不要返回旅客姓名、邮箱、电话或其他个人信息。金额币种应为 ISO 4217，例如 EUR。所有不确定的字段使用空字符串或0，不得杜撰。严格返回单个 JSON 对象，字段为 type（只能是 住宿/机票/火车/门票/餐厅/其他）、nameOriginal、nameZh、date（YYYY-MM-DD）、time（HH:mm）、endTime（HH:mm或空）、quantity（整数）、currency、totalAmount（数字）、platform、reference。如果是机票或火车票，还要在 JSON 中提供 transport 对象，字段 carrier、number、from、to、departureDate、departureTime、arrivalDate、arrivalTime、boardingTime、terminal、gate、arrivalTerminal、platform、carriage、seat、cabin、baggage、ticketNumber。日期 YYYY-MM-DD，时间 HH:mm，必须分别使用出发地和到达地的当地时间，跨日航班不得将到达日期误填为出发日期。特别注意航班或车票的行程区段，例如 Bali - Xiamen、DPS → XMN、From / To、Departure / Arrival；从这些明确的原文中提取 transport.from 和 transport.to，即使未写出完整机场名称，也应保留票面城市或机场代码。航班号例如 MF892 必须写入 transport.number。优先提取准确的起飞机场和降落机场（完整机场名、IATA 三字码及其所在城市）；火车票优先提取完整的出发车站和到达车站（不要只写城市），并分别填入 transport.from、transport.to。票据若同时列出城市与机场/车站，以机场/车站为准，例如 Denpasar (DPS) → Xiamen (XMN)、Kyoto Station → Osaka Station。机票中的 Departure airport / Origin / From / Departing 与 Arrival airport / Destination / To / Arriving 要区分；火车票中的 From station / Departure station 和 To station / Arrival station 同理。不得将航司、航班号、酒店名、旅客姓名误当成地点。若仅能识别城市而不能确认机场或车站全称，就填写城市原文，不能根据航班号或城市推测具体机场。仅提取票据明确标注的内容，不要猜测机场、航站楼、登机口、检票时间。其他类型 transport 为 {}。文件名：${String(filename||'').slice(0,120)}`;
  const fullPrompt=prompt+(extractedText?'\n\n以下是浏览器从票据提取的文字，请结合图片核对，不要将旅客姓名当作地点：\n'+extractedText:'');
  try{
   let raw='',provider='',geminiError='';
   if(env.GEMINI_API_KEY){
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent',{
     method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
     body:JSON.stringify({contents:[{role:'user',parts:[{text:fullPrompt},...parts]}],generationConfig:{responseMimeType:'application/json',temperature:0.1,maxOutputTokens:isRoute?8192:2048}})
    });
    const result=await response.json().catch(()=>({}));
    if(response.ok){raw=(result.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');provider='Gemini'}
    else{
     geminiError=result.error?.message||'HTTP '+response.status;
     if(![429,500,502,503,504].includes(response.status)||(!env.OPENROUTER_API_KEY&&!env.GROQ_API_KEY))return reply({error:'Gemini API：'+geminiError+(response.status===429&&!env.OPENROUTER_API_KEY?'。可在 Worker 添加 OPENROUTER_API_KEY 启用免费备用 AI。':'')},response.status===429?429:502);
    }
   }
   if((!raw||!parseAIJSON(raw))&&env.OPENROUTER_API_KEY){
    const content=[{type:'text',text:fullPrompt+'\\n只返回一个合法 JSON 对象，不要 Markdown 代码块。'},...inputs.map((input,i)=>parsed[i][1]==='application/pdf'?{type:'file',file:{filename:(filename||'ticket.pdf'),file_data:input}}:{type:'image_url',image_url:{url:input}})];
    const alt=await fetch('https://openrouter.ai/api/v1/chat/completions',{
     method:'POST',headers:{'Authorization':'Bearer '+env.OPENROUTER_API_KEY,'Content-Type':'application/json','HTTP-Referer':'https://15641288268.github.io/Roam-/','X-Title':'Roam Travel Planner'},
     body:JSON.stringify({model:'openrouter/free',messages:[{role:'user',content}],temperature:0.1,max_tokens:isRoute?8192:4096})
    });
    const altResult=await alt.json().catch(()=>({}));
    if(!alt.ok){geminiError+='；OpenRouter：'+(altResult.error?.message||'HTTP '+alt.status);raw='';}else{
    const answer=altResult.choices?.[0]?.message?.content;
    raw=typeof answer==='string'?answer:Array.isArray(answer)?answer.map(p=>p.text||'').join(''):'';
    provider='OpenRouter 免费模型';
    if(!parseAIJSON(raw)){
     const repair=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+env.OPENROUTER_API_KEY,'Content-Type':'application/json','HTTP-Referer':'https://15641288268.github.io/Roam-/','X-Title':'Roam Travel Planner'},body:JSON.stringify({model:'openrouter/free',messages:[{role:'user',content:[{type:'text',text:fullPrompt+'\\n必须只输出合法JSON对象，不要解释、分析、User Safety说明。'},...content.slice(1)]}],temperature:0,max_tokens:isRoute?8192:4096})});
     if(repair.ok){const rr=await repair.json().catch(()=>({}));const aa=rr.choices?.[0]?.message?.content;const repaired=typeof aa==='string'?aa:Array.isArray(aa)?aa.map(p=>p.text||'').join(''):'';if(parseAIJSON(repaired))raw=repaired}
    }
    }
   }
   if(!parseAIJSON(raw)&&env.GROQ_API_KEY){
    const groqInputs=inputs.slice(0,3).map(input=>({type:'image_url',image_url:{url:input}}));
    const groqContent=[{type:'text',text:fullPrompt+'\n请仅输出合法 JSON 对象。'},...groqInputs];
    const groq=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+env.GROQ_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'qwen/qwen3.8-27b',messages:[{role:'user',content:groqContent}],response_format:{type:'json_object'},temperature:0,max_completion_tokens:isRoute?4096:3000})});
    const groqResult=await groq.json().catch(()=>({}));
    if(groq.ok){const answer=groqResult.choices?.[0]?.message?.content;const candidate=typeof answer==='string'?answer:Array.isArray(answer)?answer.map(p=>p.text||'').join(''):'';if(parseAIJSON(candidate)){raw=candidate;provider='Groq Qwen Vision'}}
    if(!parseAIJSON(raw))return reply({error:'三个 AI 服务均未成功：'+(groqResult.error?.message||'Groq 未返回有效 JSON')+(geminiError?'；'+geminiError:'')},groq.status===429?429:502);
   }
   if(!raw)return reply({error:'AI 没有返回识别结果，请重试'},422);
   const booking=parseAIJSON(raw);
   if(!booking)return reply({error:'AI 返回内容不是有效 JSON，自动重试后仍无法解析；请稍后重试。'},422);
   if(isRoute){if(!Array.isArray(booking.options)||!booking.options.length)return reply({error:'未能识别路线方案'},422);return reply({provider,route:{from:String(booking.from||''),to:String(booking.to||''),options:booking.options.slice(0,8).map(o=>({name:String(o.name||''),mode:String(o.mode||'公交'),minutes:Math.max(0,Number(o.minutes)||0),cost:Math.max(0,Number(o.cost)||0),currency:String(o.currency||''),departure:String(o.departure||''),arrival:String(o.arrival||''),steps:Array.isArray(o.steps)?o.steps.slice(0,20):[],bookingIds:[]}))}})}

   if(!booking.nameOriginal||!booking.type)return reply({error:'未识别出有效的预订地点'},422);
   const allowed=['住宿','机票','火车','门票','餐厅','其他'];
   booking.type=allowed.includes(booking.type)?booking.type:'其他';
   booking.quantity=Math.max(1,Math.min(1000,Math.floor(Number(booking.quantity)||1)));
   booking.totalAmount=Math.max(0,Number(booking.totalAmount)||0);
   return reply({booking,provider});
  }catch(e){return reply({error:'AI 识别异常：'+e.message},502)}
 }
};
