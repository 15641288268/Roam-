/* Roam V126: day timeline/list switch. No map API needed. */
(function(){
 let mode=localStorage.getItem('roam_plan_view_v126')==='timeline'?'timeline':'list';
 const minutes=t=>{const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(t||''));return m?Number(m[1])*60+Number(m[2]):null};
 const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function movePlace(day,sourceId,targetId){
  if(sourceId===targetId)return;
  const ordered=(db.places||[]).filter(p=>Number(p.day)===day).slice().sort((a,b)=>(minutes(a.time)??99999)-(minutes(b.time)??99999));
  const from=ordered.findIndex(p=>p.id===sourceId),to=ordered.findIndex(p=>p.id===targetId);
  if(from<0||to<0)return;
  const slots=ordered.map(p=>p.time||'');
  const shifted=ordered.slice();shifted.splice(to,0,shifted.splice(from,1)[0]);
  const affected=shifted.filter((p,i)=>p.time!==slots[i]);
  const routeCount=(db.routes||[]).filter(r=>Number(r.day)===day).length;
  const reservations=(db.bookings||[]).filter(b=>b.date&&db.start&&b.date===new Date(Date.parse(db.start+'T12:00:00Z')+(day-1)*86400000).toISOString().slice(0,10));
  const msg='将「'+ordered[from].name+'」移动到「'+ordered[to].name+'」'+(from<to?'后':'前')+'。\\n\\n将沿用原时间轴的时间位置，预计修改 '+affected.length+' 个地点的开始时间。'+(routeCount?'\\n已有 '+routeCount+' 条交通路线需要重新核对；不自动编造新路线。':'')+(reservations.length?'\\n当天有 '+reservations.length+' 项预订，预订时间保持不变，请检查冲突。':'')+'\\n\\n确认应用调整吗？';
  if(!confirm(msg))return;
  shifted.forEach((p,i)=>{const original=db.places.find(x=>x.id===p.id);if(original){original.time=slots[i];original.order=i+1}});
  persist();
 }
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
  // Timeline needs its own day navigation: the original day selector lives inside hidden #planList.
  const maxDay=Math.max(1,Number(db.days)||1,...(db.places||[]).map(p=>Number(p.day)||1));
  const navigation=document.createElement('div');navigation.className='roam-timeline-day-nav';
  const prev=document.createElement('button');prev.type='button';prev.textContent='‹ 前一天';prev.disabled=day<=1;
  const next=document.createElement('button');next.type='button';next.textContent='后一天 ›';next.disabled=day>=maxDay;
  const select=document.createElement('select');select.setAttribute('aria-label','选择时间轴日期');
  for(let i=1;i<=maxDay;i++){
   const option=document.createElement('option');option.value=String(i);
   if(Number.isFinite(start)){option.textContent='第 '+i+' 天 · '+new Date(start+(i-1)*86400000).toISOString().slice(0,10)}
   else option.textContent='第 '+i+' 天';
   select.appendChild(option);
  }
  select.value=String(day);
  prev.onclick=()=>changePlanDay(day-1);
  next.onclick=()=>changePlanDay(day+1);
  select.onchange=()=>changePlanDay(Number(select.value));
  navigation.append(prev,select,next);
  timeline.replaceChildren(navigation,heading);
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
   if(p._kind==='place'){
    row.dataset.placeId=p.id;row.draggable=true;row.title='电脑可拖动调整顺序；手机请使用上移/下移';
    row.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',p.id);e.dataTransfer.effectAllowed='move'});
    row.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move'});
    row.addEventListener('drop',e=>{e.preventDefault();const source=e.dataTransfer.getData('text/plain');if(source)movePlace(day,source,p.id)});
    const position=places.findIndex(x=>x.id===p.id);
    for(const [label,offset] of [['↑ 上移',-1],['↓ 下移',1]]){
     if(position+offset<0||position+offset>=places.length)continue;
     const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=label;
     button.onclick=()=>movePlace(day,p.id,places[position+offset].id);body.appendChild(button);
    }
    const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='编辑时间 / 地点';edit.onclick=()=>{if(typeof editPlace==='function')editPlace(p.id)};body.appendChild(edit)}
   row.append(time,marker,body);
   // Show travel segments between consecutive itinerary places (not bookings).
   if(p._kind==='place'){
    const next=places.find((candidate,j)=>places.findIndex(v=>v.id===p.id)===j-1);
    if(next){
     const route=(db.routes||[]).find(r=>Number(r.day)===day&&r.from===p.name&&r.to===next.name);
     const segment=document.createElement('div');segment.className='roam-timeline-route-v141';
     const info=document.createElement('div');info.className='roam-timeline-route-info-v141';
     if(route){
      const options=typeof routeOptionsV55==='function'?routeOptionsV55(route):[];
      const option=options[Math.min(Number(route.selectedOption)||0,Math.max(0,options.length-1))]||route;
      info.textContent='↳ '+(option.mode||route.mode||'交通')+' · '+(Number(option.minutes||route.minutes)>0?(option.minutes||route.minutes)+' 分钟':'时长待确认')+(Number(option.cost||route.cost)>0?' · '+(option.cost||route.cost)+' '+(route.currency||db.currency||''):'')+' · '+p.name+' → '+next.name;
      const editRoute=document.createElement('button');editRoute.type='button';editRoute.className='secondary';editRoute.textContent='编辑路段';
      editRoute.onclick=()=>{if(typeof editRouteV55==='function')editRouteV55(route.id);else if(typeof editRouteFull==='function')editRouteFull(route.id)};
      segment.append(info,editRoute);
     }else{
      info.textContent='↳ '+p.name+' → '+next.name+' · 尚未设置交通';
      const add=document.createElement('button');add.type='button';add.className='secondary';add.textContent='添加路段';
      add.onclick=()=>{
       const modes=['步行','公交','地铁','火车','出租车','自行车','其他'];
       const answer=prompt('交通方式：'+modes.join(' / '),'步行');if(answer===null)return;
       const mode=answer.trim();if(!mode)return;
       const mins=prompt('预计交通时间（分钟）','30');if(mins===null)return;
       const minutes=Number(mins);if(!Number.isFinite(minutes)||minutes<0){alert('请输入有效的交通分钟数');return}
       db.routes.push({id:uid(),day,from:p.name,to:next.name,mode,minutes,cost:0,currency:db.currency});
       persist();
      };
      segment.append(info,add);
     }
     timeline.appendChild(row);timeline.appendChild(segment);
    }else timeline.appendChild(row);
   }else timeline.appendChild(row);
  });
  const note=document.createElement('p');note.className='muted';note.textContent='可拖动地点调整顺序（手机使用上移/下移）；调整后保留原时间位置，不会自动计算新路线。预订按日期匹配。红色提醒仅表示开始时间接近，未包含实际停留时长或交通耗时。';timeline.appendChild(note);
 }
 const previous=render;
 render=function(...args){const result=previous.apply(this,args);build();return result};
 build();
})();
