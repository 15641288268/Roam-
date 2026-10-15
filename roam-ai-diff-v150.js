/* V150: non-destructive comparison between AI drafts before import. */
(()=>{'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const escText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=p=>String(p?.name||'').normalize('NFKC').trim().toLowerCase();
const label=p=>p?escText((p.time||'时间未设')+' · '+(p.name||'未命名')+(p.activity?' · '+p.activity:'')+(p.note?' · '+p.note:'')):'—';
function mount(){const preview=document.getElementById('aiPreview');if(!preview)return null;let box=document.getElementById('roamDiffV150');if(!box){box=document.createElement('section');box.id='roamDiffV150';box.className='roam-v150-diff';box.hidden=true;preview.appendChild(box)}return box}
function compare(before,after){
 const box=mount();if(!box)return;
 if(!before||!after||!Array.isArray(before.days)||!Array.isArray(after.days)){box.hidden=true;return}
 let added=0,removed=0,changed=0;const sections=[];
 const total=Math.max(before.days.length,after.days.length);
 for(let i=0;i<total;i++){
  const old=before.days[i]?.places||[],now=after.days[i]?.places||[];
  const used=new Set(),rows=[];
  for(const p of old){
   const j=now.findIndex((q,n)=>!used.has(n)&&key(q)===key(p));
   if(j<0){removed++;rows.push(['删除',p,null]);continue}
   used.add(j);const q=now[j];
   if(JSON.stringify([p.time,p.activity,p.note,p.cost,p.type])!==JSON.stringify([q.time,q.activity,q.note,q.cost,q.type])){changed++;rows.push(['调整',p,q])}
  }
  now.forEach((p,j)=>{if(!used.has(j)){added++;rows.push(['新增',null,p])}});
  if(!rows.length)continue;
  const parts=rows.map(([kind,a,b])=>'<div class="roam-v150-change"><div><b>修改前 · '+escText(kind)+'</b><br>'+label(a)+'</div><div><b>修改后</b><br>'+label(b)+'</div></div>').join('');
  sections.push('<details class="roam-v150-day" open><summary>第 '+(i+1)+' 天 · '+rows.length+' 项变化</summary>'+parts+'</details>');
 }
 const protectedChange=before.start!==after.start||before.end!==after.end||before.destination!==after.destination||before.days.length!==after.days.length;
 box.hidden=false;
 box.innerHTML='<h3>🔎 AI 修改前后对比</h3><p class="roam-v150-summary">新增 '+added+' 项 · 调整 '+changed+' 项 · 删除 '+removed+' 项 · 未列出的活动保持不变。</p>'+
 (protectedChange?'<div class="roam-v150-warning">⚠ 检测到目的地、日期或旅行天数变化，请核对草稿；不要直接导入。</div>':'')+
 (sections.join('')||'<p class="roam-v150-summary">未检测到活动内容变化。</p>')+
 '<p class="roam-v150-summary">仅对比 AI 草稿。这里不会修改已保存的正式行程；仍需点击原有「确认导入」流程。</p>';
}
function init(){
 mount();
 if(typeof aiGenerateV68!=='function')return;
 const original=aiGenerateV68;
 aiGenerateV68=async function(revise=false){
  const previous=revise&&typeof aiPlanDraftV68!=='undefined'&&aiPlanDraftV68?clone(aiPlanDraftV68):null;
  const box=mount();if(box)box.hidden=true;
  const result=await original.apply(this,arguments);
  if(revise&&previous&&typeof aiPlanDraftV68!=='undefined'&&aiPlanDraftV68)compare(previous,aiPlanDraftV68);
  return result;
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
