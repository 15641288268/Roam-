/* Roam V127: travel-day execution mode. Per-trip progress is stored with itinerary. */
(function(){
 let open=false;
 const minute=s=>{const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s||''));return m?+m[1]*60 + +m[2]:null};
 const dateAtDay=day=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(db.start||''))return '';const t=Date.parse(db.start+'T12:00:00Z');return Number.isFinite(t)?new Date(t+(day-1)*86400000).toISOString().slice(0,10):''};
 function status(id){return db.executionProgress?.[id]||'pending'}
 function mount(){
  const list=document.getElementById('planList');if(!list)return;
  let panel=document.getElementById('roamTravelModeV127');
  if(!panel){
   panel=document.createElement('div');panel.id='roamTravelModeV127';panel.className='roam-travel-mode';
   panel.innerHTML='<div class="roam-travel-head"><div><strong>🚶 旅行执行模式</strong><small>当天进度、下一站与预订</small></div><button type="button" id="roamTravelToggleV127" aria-expanded="false">开启</button></div><div id="roamTravelContentV127" hidden></div>';
   const controls=document.getElementById('roamPlanViewSwitchV126');(controls||list).before(panel);
   panel.querySelector('#roamTravelToggleV127').onclick=()=>{open=!open;draw()};
  }
  draw();
 }
 function draw(){
  const panel=document.getElementById('roamTravelModeV127');if(!panel)return;
  const btn=panel.querySelector('#roamTravelToggleV127'),box=panel.querySelector('#roamTravelContentV127');
  btn.textContent=open?'收起':'开启';btn.setAttribute('aria-expanded',String(open));box.hidden=!open;
  if(!open)return;
  const day=Number(selectedPlanDay)||1,date=dateAtDay(day);
  const ps=(db.places||[]).filter(p=>Number(p.day)===day).map((p,i)=>({...p,_i:i,_t:minute(p.time)})).sort((a,b)=>(a._t??9999)-(b._t??9999)||a._i-b._i);
  const completed=ps.filter(p=>status(p.id)==='done').length;
  const next=ps.find(p=>status(p.id)!=='done'&&status(p.id)!=='skipped');
  box.replaceChildren();
  const top=document.createElement('div');top.className='roam-travel-summary';
  const title=document.createElement('div');title.innerHTML='<strong>第 '+day+' 天'+(date?' · '+date:'')+'</strong><small>已完成 '+completed+' / '+ps.length+' 个地点</small>';
  const actions=document.createElement('div');actions.className='roam-travel-actions';
  const today=document.createElement('button');today.type='button';today.className='secondary';today.textContent='跳转到今天';
  today.onclick=()=>{const local=new Date(),todayString=local.getFullYear()+'-'+String(local.getMonth()+1).padStart(2,'0')+'-'+String(local.getDate()).padStart(2,'0');const start=Date.parse(db.start+'T12:00:00Z'),now=Date.parse(todayString+'T12:00:00Z');const index=Math.round((now-start)/86400000)+1;const max=Math.max(1,Number(db.days)||1);if(!Number.isFinite(index)||index<1||index>max)return alert('今天不在这段旅行的日期范围内，请检查出发日期。');changePlanDay(index)};
  actions.appendChild(today);top.append(title,actions);box.appendChild(top);
  const nextInfo=document.createElement('div');nextInfo.className='roam-travel-next';nextInfo.textContent=next?'下一站：'+(next.time||'时间待定')+' · '+next.name:'当天已无待执行地点';box.appendChild(nextInfo);
  if(!ps.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='当天没有地点。请先在行程列表添加。';box.appendChild(empty)}
  for(const p of ps){
   const row=document.createElement('div');row.className='roam-travel-stop '+status(p.id);
   const name=document.createElement('div');name.className='roam-travel-stop-name';
   const strong=document.createElement('strong');strong.textContent=(p.time||'待定')+' · '+(p.name||'未命名地点');
   const small=document.createElement('small');small.textContent=p.note||p.type||'地点';
   name.append(strong,small);
   const select=document.createElement('select');select.setAttribute('aria-label',p.name+' 执行状态');
   for(const [value,label] of [['pending','未开始'],['active','进行中'],['done','已完成'],['skipped','已跳过']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)}
   select.value=status(p.id);
   select.onchange=()=>{if(!db.executionProgress||typeof db.executionProgress!=='object')db.executionProgress={};db.executionProgress[p.id]=select.value;persist()};
   const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='临时调整';edit.onclick=()=>{if(typeof editPlace==='function')editPlace(p.id)};
   const controls=document.createElement('div');controls.className='roam-travel-stop-actions';controls.append(select,edit);row.append(name,controls);box.appendChild(row);
  }
  const bookings=(db.bookings||[]).filter(b=>b.date===date);
  const bookingsTitle=document.createElement('h4');bookingsTitle.textContent='📌 当天预订 · '+bookings.length;box.appendChild(bookingsTitle);
  if(!bookings.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='没有匹配日期的预订记录。';box.appendChild(empty)}
  for(const b of bookings){
   const row=document.createElement('div');row.className='roam-travel-booking';
   const label=document.createElement('div');label.textContent=(b.time||'时间待定')+' · '+(b.name||'预订')+' · '+(b.type||'');
   row.append(label);
   if(b.attachment){const voucher=document.createElement('button');voucher.type='button';voucher.className='secondary';voucher.textContent='查看凭证';voucher.onclick=()=>{if(typeof openVoucher==='function')openVoucher(b.id)};row.append(voucher)}
   box.append(row);
  }
  const note=document.createElement('p');note.className='muted';note.textContent='进度只属于当前旅行，并保存在此浏览器的旅行数据中。临时调整使用现有地点编辑功能，不会自动修改其他日期。';box.appendChild(note);
 }
 const old=render;
 render=function(...args){const result=old.apply(this,args);mount();return result};
 mount();
})();
