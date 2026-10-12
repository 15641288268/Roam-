function roamAIInit(){const el=document.getElementById('aiEndpoint');if(el)el.value=localStorage.getItem('roam_ai_endpoint')||'';const t=document.getElementById('aiToken');if(t)t.value=sessionStorage.getItem('roam_ai_token')||''}
function roamAISave(){const url=document.getElementById('aiEndpoint').value.trim();if(url&&!url.startsWith('https://'))return alert('请输入 HTTPS 服务地址');localStorage.setItem('roam_ai_endpoint',url);sessionStorage.setItem('roam_ai_token',document.getElementById('aiToken').value);document.getElementById('aiState').textContent='配置已保存'}
function roamAIFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file)})}
async function roamAIPdfImages(file){
 if(!window.pdfjsLib){
  if(typeof externalScript==='function')await externalScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  else throw Error('PDF 预览组件未加载');
 }
 pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
 const images=[];
 for(let i=1;i<=Math.min(pdf.numPages,6);i++){
  const page=await pdf.getPage(i);
  const original=page.getViewport({scale:1});
  const scale=Math.min(2,1600/Math.max(original.width,original.height));
  const viewport=page.getViewport({scale});
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  const ctx=canvas.getContext('2d',{alpha:false});
  await page.render({canvasContext:ctx,viewport}).promise;
  images.push(canvas.toDataURL('image/jpeg',0.78));
  canvas.width=canvas.height=0;
 }
 if(!images.length)throw Error('PDF 没有可读取的页面');
 return images;
}
async function roamAIAnalyze(){if(!voucherFile)return alert('请先上传 PDF 或图片');const endpoint=document.getElementById('aiEndpoint').value.trim().replace(/\/+$/,'');if(!endpoint.startsWith('https://'))return alert('请先配置 AI 后端 HTTPS 地址');roamAISave();const state=document.getElementById('aiState');state.textContent='AI 正在分析…';try{const isPDF=voucherFile.type==='application/pdf'||/\.pdf$/i.test(voucherFile.name);if(isPDF)state.textContent='正在将 PDF 页面转换为图片，避免免费 PDF 解析限流…';const images=isPDF?await roamAIPdfImages(voucherFile):null;const data=isPDF?images[0]:await roamAIFile(voucherFile);state.textContent='AI 正在识别'+(isPDF?' PDF 页面图片':'凭证')+'…';const res=await fetch(endpoint+'/analyze',{method:'POST',headers:{'Content-Type':'application/json','X-Roam-Token':document.getElementById('aiToken').value},body:JSON.stringify({filename:voucherFile.name,mime:isPDF?'image/jpeg':voucherFile.type||'image/jpeg',data,images:images||undefined,extractedText:document.getElementById('vraw')?.value?.slice(0,18000)||''})});const payload=await res.json();if(!res.ok)throw Error(payload.error||'AI 请求失败');const x=payload.booking;if(!x||!x.nameOriginal)throw Error('AI 没有返回地点名称');const set=(id,value)=>{const e=document.getElementById(id);if(e)e.value=value??''};set('vtype',['住宿','机票','火车','门票','餐厅','其他'].includes(x.type)?x.type:'其他');const trip=x.transport||{};const routeName=(x.type==='机票'||x.type==='火车')&&trip.from&&trip.to?trip.from+' → '+trip.to:(x.nameOriginal||'');set('vname',routeName);set('vnameZh',(x.type==='机票'||x.type==='火车')?routeName:(x.nameZh||x.nameOriginal));set('vnameOriginal',routeName);set('vdate',x.date);set('vtime',x.time||'09:00');set('vEndTime',x.endTime);set('vQuantity',x.quantity||1);set('vCurrency',x.currency);set('vplatform',x.platform);set('vref',x.reference);set('vcost',x.totalAmount||0);if(typeof toggleTransportV55==='function')toggleTransportV55(x.transport||{});document.getElementById('voucherForm').hidden=false;state.textContent='AI 已识别（'+(payload.provider||'AI')+'），请核对字段后保存。';document.getElementById('voucherForm').scrollIntoView({behavior:'smooth'})}catch(e){state.textContent='AI 识别失败：'+e.message}}
document.addEventListener('DOMContentLoaded',roamAIInit);