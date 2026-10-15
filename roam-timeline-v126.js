/* Roam V126: day timeline/list switch. No map API needed. */
(function(){
 let mode=localStorage.getItem('roam_plan_view_v126')==='timeline'?'timeline':'list';
 const minutes=t=>{const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(t||''));return m?Number(m[1])*60+Number(m[2]):null};
 const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function build(){
  const host=document.getElementById('planList');if(!host)return;
  let controls=document.getElementById('roamPlanViewSwitchV126');
  if(!controls){
   controls=document.createElement('div');controls.id='roamPlanViewSwitchV126';controls.className='roam-plan-view-switch';
   controls.innerHTML='<span>行程视图</span><div role="group" aria-label="行程视图切换"><button type="button" data-view="list">☷ 列表</button><button type="button" data-view="timeline">◷ 时间轴</button></div>';
   host.before(controls);
   controls.addEventListener('click',e=>{const button=e.target.closest('button[data-view]');if(!button)return;mode=button.dataset.view;try{localStorage.setItem('roam_plan_view_v126',mode)}catch{};build()});
  }
  controls.querySelectorAll('[data-view]').forEach(btn=>{const active=btn.dataset.view===mode;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active))});
  let timeline=document.getElementById('roamTimelineV126');
  if(!timeline){timeline=document.createElement('div');timeline.id='roamTimelineV126';timeline.className='roam-timeline-v126';host.after(timeline)}
  host.hidden=mode==='timeline';timeline.hidden=mode!=='timeline';
  if(mode!=='timeline')return;
  const day=Number(selectedPlanDay)||1;
  const places=(db.places||[]).filter(p=>Number(p.day)===day).map((p,i)=>({...p,_minutes:minutes(p.time),_index:i})).sort((a,b)=>(a._minutes??99999)-(b._minutes??99999)||a._index-b._index);
  const start=db.start?Date.parse(db.start+'T12:00:00Z'):NaN;
  const date=Number.isFinite(start)?new Date(start+(day-1)*86400000).toISOString().slice(0,10):'日期未设置';
  const bookings=(db.bookings||[]).filter(b=>b.date===date&&minutes(b.time)!==null);
  const items=[...places.map(p=>({...p,_kind:'place',_name:p.name||'未命名地点'})),...bookings.map(b=>({...b,_kind:'booking',_name:b.name||'预订',_minutes:minutes(b.time)}))].sort((a,b)=>(a._minutes??99999)-(b._minutes??99999));
  const conflicts=new Set();
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
   if(items[i]._minutes===null||items[j]._minutes===null)continue;
   const diff=items[j]._minutes-items[i]._minutes;if(diff>=30)break;
   conflicts.add(i);conflicts.add(j);
  }
  const heading=document.createElement('div');heading.className='roam-timeline-heading';
  heading.innerHTML='<strong>第 '+day+' 天 · '+clean(date)+'</strong><small>'+places.length+' 个地点 · '+bookings.length+' 项有时间的预订</small>';
  timeline.replaceChildren(heading);
  if(!items.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='当天没有活动。可以在列表视图中添加地点。';timeline.appendChild(empty);return}
  items.forEach((p,i)=>{
   const row=document.createElement('div');row.className='roam-timeline-row'+(conflicts.has(i)?' conflict':'')+(p._kind==='booking'?' booking':'');
   const time=document.createElement('div');time.className='roam-timeline-time';time.textContent=p.time||'待定';
   const marker=document.createElement('div');marker.className='roam-timeline-marker';marker.textContent=p._kind==='booking'?'◆':'●';
   const body=document.createElement('div');body.className='roam-timeline-card';
   const title=document.createElement('strong');title.textContent=p._name;
   const meta=document.createElement('small');meta.textContent=p._kind==='booking'?'📌 '+(p.type||'预订')+(p.endTime?' · 至 '+p.endTime:''):(p.type||'地点')+(p.note?' · '+p.note:'');
   body.append(title,meta);
   if(conflicts.has(i)){const warning=document.createElement('span');warning.className='roam-timeline-warning';warning.textContent='⚠ 与相邻活动开始时间相差不到30分钟';body.appendChild(warning)}
   if(p._kind==='place'){const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='编辑时间 / 地点';edit.onclick=()=>{mode='list';build();if(typeof editPlace==='function')editPlace(p.id)};body.appendChild(edit)}
   row.append(time,marker,body);timeline.appendChild(row);
  });
  const note=document.createElement('p');note.className='muted';note.textContent='时间轴按开始时间排序；预订按日期匹配。红色提醒仅表示开始时间接近，未包含实际停留时长或交通耗时。';timeline.appendChild(note);
 }
 const previous=render;
 render=function(...args){const result=previous.apply(this,args);build();return result};
 build();
})();
