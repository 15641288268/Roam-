/* Roam V128 — preview-only delay adjustment for remaining activities on selected day. */
(function(){
 const parse=s=>{const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s||''));return m?Number(m[1])*60+Number(m[2]):null};
 const fmt=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
 const dayDate=day=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(db.start||''))return null;const base=Date.parse(db.start+'T12:00:00Z');return Number.isFinite(base)?new Date(base+(day-1)*86400000).toISOString().slice(0,10):null};
 let preview=null;
 function mount(){
  const travel=document.getElementById('roamTravelModeV127');if(!travel)return;
  let root=document.getElementById('roamDelayV128');
  if(!root){
   root=document.createElement('section');root.id='roamDelayV128';root.className='roam-delay-v128';
   root.innerHTML='<details id="roamDelayDetailsV128"><summary>⏱ 当天延误 · 调整后续行程</summary><p class="muted">选择已延误的活动及延误分钟数，仅顺延同一天之后有开始时间的景点。预订不会自动修改。</p><label>从哪一站之后开始顺延<select id="roamDelayAnchorV128"></select></label><label>延误时间（分钟）<input id="roamDelayMinutesV128" type="number" min="5" max="240" step="5" value="30"></label><button type="button" id="roamDelayPreviewV128">预览变更</button><div id="roamDelayResultV128" aria-live="polite"></div></details>';
   travel.after(root);
   root.querySelector('#roamDelayPreviewV128').onclick=makePreview;
   root.querySelector('#roamDelayAnchorV128').onchange=clearPreview;
   root.querySelector('#roamDelayMinutesV128').oninput=clearPreview;
  }
  const select=root.querySelector('#roamDelayAnchorV128'),old=select.value;
  const day=Number(selectedPlanDay)||1;
  const stops=(db.places||[]).filter(p=>Number(p.day)===day&&parse(p.time)!==null).sort((a,b)=>parse(a.time)-parse(b.time));
  select.replaceChildren();
  stops.forEach(p=>{const opt=document.createElement('option');opt.value=p.id;opt.textContent=p.time+' · '+p.name;select.append(opt)});
  if(stops.some(p=>p.id===old))select.value=old;
  root.querySelector('#roamDelayPreviewV128').disabled=stops.length<2;
  if(stops.length<2){root.querySelector('#roamDelayResultV128').textContent='当天至少需要两个设置了开始时间的景点。'}
  if(preview&&preview.day!==day)clearPreview();
 }
 function clearPreview(){preview=null;const el=document.getElementById('roamDelayResultV128');if(el)el.replaceChildren()}
 function makePreview(){
  clearPreview();
  const root=document.getElementById('roamDelayV128'),output=root.querySelector('#roamDelayResultV128');
  const day=Number(selectedPlanDay)||1,anchorId=root.querySelector('#roamDelayAnchorV128').value;
  const amount=Number(root.querySelector('#roamDelayMinutesV128').value);
  if(!Number.isInteger(amount)||amount<5||amount>240)return output.textContent='延误时间需为5–240分钟。';
  const all=(db.places||[]).filter(p=>Number(p.day)===day&&parse(p.time)!==null).sort((a,b)=>parse(a.time)-parse(b.time));
  const index=all.findIndex(p=>p.id===anchorId);if(index<0)return output.textContent='请先选择延误的活动。';
  const anchor=all[index],after=all.slice(index+1).filter(p=>parse(p.time)>parse(anchor.time));
  if(!after.length)return output.textContent='这站之后没有可顺延的景点；同一开始时间的活动也不会自动移动。';
  if(after.some(p=>parse(p.time)+amount>=1440))return output.textContent='调整后有活动跨越午夜。为避免改变日期，本次不允许应用；请缩短延误时间或手动编辑。';
  const changes=after.map(p=>({id:p.id,name:p.name,from:p.time,to:fmt(parse(p.time)+amount)}));
  const date=dayDate(day);
  const bookings=(db.bookings||[]).filter(b=>b.date===date&&parse(b.time)!==null);
  const warnings=[];
  for(const c of changes)for(const b of bookings){if(Math.abs(parse(c.to)-parse(b.time))<30)warnings.push('「'+c.name+'」新时间 '+c.to+' 距预订「'+b.name+'」'+b.time+' 不足30分钟')}
  const unaffected=all.filter(p=>!changes.some(c=>c.id===p.id));
  for(const c of changes)for(const p of unaffected){if(p.id!==anchorId&&Math.abs(parse(c.to)-parse(p.time))<30)warnings.push('「'+c.name+'」与未移动的「'+p.name+'」开始时间接近')}
  const header=document.createElement('p');header.textContent='第 '+day+' 天 · 顺延 '+changes.length+' 个地点（+'+amount+'分钟）';output.append(header);
  for(const c of changes){const row=document.createElement('div');row.className='roam-delay-change';row.textContent=c.name+'：'+c.from+' → '+c.to;output.append(row)}
  if(warnings.length){const title=document.createElement('strong');title.textContent='⚠ 请检查：';output.append(title);for(const w of [...new Set(warnings)]){const p=document.createElement('p');p.className='roam-delay-warning';p.textContent=w;output.append(p)}}
  const note=document.createElement('p');note.className='muted';note.textContent='固定预订、其他日期、未设置时间的地点不会更改。此预览尚未保存。';output.append(note);
  const apply=document.createElement('button');apply.type='button';apply.textContent='确认顺延 '+changes.length+' 个地点';output.append(apply);
  preview={day,anchorId,amount,changes};
  apply.onclick=()=>{
   if(!preview||preview.day!==Number(selectedPlanDay))return alert('日期已改变，请重新预览。');
   if(preview.changes.some(c=>{const p=db.places.find(x=>x.id===c.id);return !p||Number(p.day)!==preview.day||p.time!==c.from}))return alert('行程已变化，请重新预览。');
   if(!confirm('确认仅顺延第 '+day+' 天的 '+changes.length+' 个景点？预订和其他日期保持不变。'))return;
   for(const c of preview.changes){const p=db.places.find(x=>x.id===c.id);p.time=c.to}
   preview=null;persist();alert('已更新 '+changes.length+' 个地点的开始时间。');
  };
 }
 const previous=render;
 render=function(...args){const v=previous.apply(this,args);mount();return v};
 mount();
})();
