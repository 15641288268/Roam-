/* V151 — conservative time feasibility checker + explicit approval for adjustments.
   Uses ONLY user-entered route minutes and stay durations. Does not invent travel times. */
(()=>{'use strict';
const parse=t=>{const m=String(t||'').match(/^([01]?\d|2[0-3]):([0-5]\d)$/);return m?+m[1]*60+(+m[2]):null};
const fmt=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function routeMinutes(a,b,day){
 const r=(db.routes||[]).find(x=>Number(x.day)===day&&x.from===a.name&&x.to===b.name);if(!r)return null;
 const opts=Array.isArray(r.options)?r.options:[];
 const o=opts.length?opts[Math.min(Math.max(0,Number(r.selectedOption)||0),opts.length-1)]:r;
 const n=Number(o.minutes);return Number.isFinite(n)&&n>0&&n<=1440?n:null;
}
function stayMinutes(p){for(const k of ['durationMinutes','stayMinutes']){const n=Number(p[k]);if(Number.isFinite(n)&&n>0&&n<=1440)return n}return null}
function calculate(){
 const day=Number(selectedPlanDay)||1,places=orderedPlaces(day);
 const conflicts=[];for(let i=1;i<places.length;i++){
  const a=places[i-1],b=places[i],at=parse(a.time),bt=parse(b.time),travel=routeMinutes(a,b,day),stay=stayMinutes(a);
  if(at===null||bt===null||travel===null)continue;
  const earliest=at+(stay||0)+travel;
  if(earliest>bt&&earliest<1440)conflicts.push({from:a,to:b,travel,stay,delay:earliest-bt,earliest});
 }
 return {day,places,conflicts};
}
let dialog=null;
function propose(){
 const {day,places,conflicts}=calculate();if(!conflicts.length)return;
 const times=new Map();const updates=[];let overflow=false;
 places.forEach((p,i)=>{
  const current=parse(p.time);if(current===null){times.set(p.id,null);return}
  let next=current;
  if(i>0){const prev=places[i-1],prevTime=times.get(prev.id),travel=routeMinutes(prev,p,day),stay=stayMinutes(prev);
   if(prevTime!==null&&prevTime!==undefined&&travel!==null)next=Math.max(current,prevTime+(stay||0)+travel);
  }
  if(next>=1440){overflow=true;times.set(p.id,null);return}
  times.set(p.id,next);if(next!==current)updates.push({id:p.id,name:p.name,before:p.time,after:fmt(next)});
 });
 if(!updates.length)return;
 if(dialog)dialog.remove();
 dialog=document.createElement('dialog');dialog.className='roam-v151-dialog';
 dialog.innerHTML='<h3>⏱ 建议顺延时间</h3><p>第 '+day+' 天有 '+conflicts.length+' 处时间冲突，以下是按已填写交通时间推算的建议：</p><ol>'+updates.map(x=>'<li>'+escape(x.name)+'：'+escape(x.before)+' → <strong>'+escape(x.after)+'</strong></li>').join('')+'</ol>'+
 (overflow?'<p style="color:#9a4027">⚠ 部分地点顺延后会跨越午夜，未纳入修改；建议手动调整。</p>':'')+
 '<p>只调整列出的到达时间，不改变日期、地点、交通或预订。交通数据未填写的路段不会估算。</p><div class="actions"><button class="roam-v151-accept" data-action="apply">确认修改</button><button data-action="cancel">取消</button></div>';
 document.body.appendChild(dialog);
 dialog.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(action==='cancel')dialog.close();if(action==='apply'){
  if(Number(selectedPlanDay)!==day){dialog.close();alert('日期已切换，请重新检查冲突。');return}
  const previous=updates.map(x=>({id:x.id,time:db.places.find(p=>p.id===x.id)?.time}));
  const ok=updates.every(x=>db.places.some(p=>p.id===x.id&&p.time===x.before));
  if(!ok){dialog.close();alert('行程已变化，请重新生成调整建议。');return}
  updates.forEach(x=>{const p=db.places.find(p=>p.id===x.id);if(p)p.time=x.after});
  dialog.close();persist();showUndo(previous);
 }});
 dialog.addEventListener('close',()=>{dialog.remove();if(dialog?.open===false)dialog=null});
 dialog.showModal();
}
function showUndo(previous){
 let bar=document.getElementById('roamUndoV151');if(bar)bar.remove();
 bar=document.createElement('div');bar.id='roamUndoV151';bar.className='roam-v151-box';
 bar.innerHTML='<p>✓ 已按确认方案调整 '+previous.length+' 个地点的时间。</p><button type="button">撤销本次调整</button>';
 bar.querySelector('button').onclick=()=>{
  const safe=previous.every(x=>db.places.some(p=>p.id===x.id));
  if(!safe){alert('地点已发生变化，无法安全撤销。');return}
  previous.forEach(x=>{const p=db.places.find(p=>p.id===x.id);if(p)p.time=x.time});bar.remove();persist();
 };
 document.getElementById('planList')?.prepend(bar);
}
function decorate(){
 const list=document.getElementById('planList');if(!list)return;
 list.querySelector('#roamConflictV151')?.remove();
 const {conflicts}=calculate();if(!conflicts.length)return;
 const box=document.createElement('div');box.id='roamConflictV151';box.className='roam-v151-box';
 box.innerHTML='<h3>⚠ 发现 '+conflicts.length+' 处时间可能冲突</h3>'+
 conflicts.slice(0,4).map(x=>'<p>'+escape(x.from.name)+' → '+escape(x.to.name)+'：交通 '+x.travel+' 分钟'+(x.stay?'，停留 '+x.stay+' 分钟':'（未填写停留时长）')+'，预计至少晚 '+x.delay+' 分钟。</p>').join('')+
 '<p>仅根据已填写的时间计算，未填写的路段不会被判断为无冲突。</p><button type="button">预览顺延方案</button>';
 box.querySelector('button').onclick=propose;
 const top=list.querySelector('.plan-top');if(top)top.after(box);else list.prepend(box);
}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate()})}
function init(){const list=document.getElementById('planList');if(!list)return;new MutationObserver(schedule).observe(list,{childList:true});document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',schedule));schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
