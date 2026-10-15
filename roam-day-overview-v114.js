// V114 — vertical calendar overview, long-press swapping day plans on iPhone.
function openTripCalendarV105(){
 const dlg=document.createElement('dialog');dlg.className='roam-date-list-dialog';
 let dragging=null,timer=null,activePointer=null,originY=0,originX=0;
 const total=()=>Math.max(1,Number(db.days)||1,...(db.places||[]).map(p=>Number(p.day)||1));
 const dateLabel=day=>roamDayDate(day)||'第 '+day+' 天';
 const tidy=()=>{clearTimeout(timer);timer=null;dragging=null;activePointer=null;dlg.querySelectorAll('.roam-day-row').forEach(el=>el.classList.remove('is-dragging','is-target'))};
 function swap(from,to){
  if(from===to)return;
  for(const key of ['places','routes','expenses'])for(const item of db[key]||[]){
   const n=Number(item.day);if(n===from)item.day=to;else if(n===to)item.day=from;
  }
  selectedPlanDay=to;roamCommitV105();draw();
 }
 function row(day){
  const places=orderedPlaces(day), names=places.slice(0,4).map(p=>esc((p.time?p.time+' ':'')+p.name)).join(' · ');
  return '<div class="roam-day-row" data-day="'+day+'" tabindex="0" role="listitem" draggable="true"><span class="roam-grip" aria-hidden="true">⠿</span><div class="roam-day-description"><b>'+esc(dateLabel(day))+' <small>Day '+day+'</small></b><p>'+(names||'<em>空白行程（可添加活动）</em>')+(places.length>4?' · 等'+places.length+'项':'')+'</p></div><button type="button" class="roam-day-open" data-open-day="'+day+'" aria-label="查看'+esc(dateLabel(day))+'">›</button></div>';
 }
 function draw(){
  dlg.querySelector('#roamDayOverview').innerHTML=Array.from({length:total()},(_,i)=>row(i+1)).join('');
  dlg.querySelector('#roamDateSummary').textContent=db.start+' 开始 · 共 '+total()+' 天';
 }
 dlg.innerHTML='<div class="roam-date-heading"><div><h2>📅 行程日期总览</h2><p class="muted" id="roamDateSummary"></p></div><button type="button" class="secondary" id="roamDateClose" aria-label="关闭">✕</button></div><p class="muted">长按任意一天，然后拖到目标日期松手，即可交换两天的全部行程。也可以点击当天进入编辑。</p><div id="roamDayOverview" role="list" class="roam-day-overview"></div><div class="roam-date-footer"><label>添加空白日期<input type="date" id="roamAddDate" value="'+esc(db.start||'')+'"></label><button type="button" id="roamAddBlank">＋ 创建 / 查看日期</button><p class="muted">位置固定的机票及酒店预订不随日期交换，请单独核对。</p></div>';
 document.body.appendChild(dlg);
 dlg.querySelector('#roamDateClose').onclick=()=>dlg.close();
 dlg.querySelector('#roamAddBlank').onclick=()=>{try{roamAddBlankDateV105(dlg.querySelector('#roamAddDate').value);draw()}catch(e){alert(e.message)}};
 const list=dlg.querySelector('#roamDayOverview');
 list.addEventListener('click',e=>{const b=e.target.closest('[data-open-day]');if(b){selectedPlanDay=Number(b.dataset.openDay);render();dlg.close()}});
 function targetAt(x,y){const found=document.elementFromPoint(x,y)?.closest('.roam-day-row');return found&&list.contains(found)?Number(found.dataset.day):null}
 list.addEventListener('pointerdown',e=>{
  if(e.target.closest('button')||e.button!==0)return;
  const el=e.target.closest('.roam-day-row');if(!el)return;
  originX=e.clientX;originY=e.clientY;activePointer=e.pointerId;
  timer=setTimeout(()=>{dragging=Number(el.dataset.day);el.classList.add('is-dragging');if(navigator.vibrate)navigator.vibrate(15)},380);
 },{passive:true});
 list.addEventListener('pointermove',e=>{
  if(e.pointerId!==activePointer)return;
  if(!dragging){if(Math.hypot(e.clientX-originX,e.clientY-originY)>11){clearTimeout(timer);timer=null}return}
  e.preventDefault();
  const dest=targetAt(e.clientX,e.clientY);
  list.querySelectorAll('.roam-day-row').forEach(row=>row.classList.toggle('is-target',Number(row.dataset.day)===dest&&dest!==dragging));
 },{passive:false});
 const release=e=>{
  if(e.pointerId!==activePointer)return;
  const from=dragging,to=targetAt(e.clientX,e.clientY);
  tidy();if(from&&to&&from!==to)swap(from,to);
 };
 list.addEventListener('pointerup',release);
 list.addEventListener('pointercancel',tidy);
 list.addEventListener('dragstart',e=>{const el=e.target.closest('.roam-day-row');if(!el)return;dragging=Number(el.dataset.day);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(dragging));});
 list.addEventListener('dragover',e=>{e.preventDefault();const row=e.target.closest('.roam-day-row');if(row)list.querySelectorAll('.roam-day-row').forEach(x=>x.classList.toggle('is-target',x===row))});
 list.addEventListener('drop',e=>{e.preventDefault();const to=Number(e.target.closest('.roam-day-row')?.dataset.day),from=Number(e.dataTransfer.getData('text/plain'))||dragging;tidy();if(from&&to&&from!==to)swap(from,to)});
 list.addEventListener('dragend',tidy);
 dlg.addEventListener('close',()=>{tidy();dlg.remove()},{once:true});
 draw();dlg.showModal();
}
