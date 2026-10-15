/* V148 — day swipes, map→itinerary link and advisory time conflicts.
   All alerts are read-only: never rewrite times or bookings without confirmation. */
(()=>{'use strict';
const minutes=t=>{const m=String(t||'').match(/^(\d{1,2}):(\d{2})$/);return m?Number(m[1])*60+Number(m[2]):null};
const trip=()=>String(roamProjects?.active||'default');
let currentTrip=trip(),focusId=null,backScroll=0;
function dayCount(){return Math.max(1,Number(db?.days)||1,...(db?.places||[]).map(x=>Number(x.day)||1))}
function dayChange(step){const n=Math.max(1,Math.min(dayCount(),(Number(selectedPlanDay)||1)+step));if(n===(Number(selectedPlanDay)||1))return;window.changePlanDay?.(n)}
function addDaySwipe(){
 for(const id of ['planList','mapBox']){
  const el=document.getElementById(id);if(!el||el.dataset.roamSwipe148)return;el.dataset.roamSwipe148='1';
  let x=0,y=0,t=0;
  el.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const target=e.target;if(target.closest('button,input,select,textarea,a,.drag-handle,.leaflet-container,.roam-timeline-card')){t=0;return}x=e.touches[0].clientX;y=e.touches[0].clientY;t=Date.now()},{passive:true});
  el.addEventListener('touchend',e=>{if(!t||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;if(Math.abs(dx)>85&&Math.abs(dx)>Math.abs(dy)*1.6&&Date.now()-t<850)dayChange(dx<0?1:-1);t=0},{passive:true});
 }
}
function mapLink(){
 const list=document.getElementById('mapList');if(!list)return;
 list.querySelectorAll('.map-stop[data-place-id]').forEach(row=>{
  if(row.querySelector('.roam-v148-map-link'))return;
  const id=row.dataset.placeId;const btn=document.createElement('button');btn.className='roam-v148-map-link';btn.type='button';btn.textContent='行程 ↗';
  btn.onclick=()=>{focusId=id;window.show?.('plan');setTimeout(scrollToPlace,90)};
  row.appendChild(btn);
 });
}
function scrollToPlace(){
 if(!focusId)return;const id=focusId;focusId=null;
 const row=[...document.querySelectorAll('#planList .trip-stop')].find(e=>e.dataset.placeId===id);
 if(row){row.scrollIntoView({behavior:'smooth',block:'center'});row.style.outline='2px solid #4088e9';setTimeout(()=>{row.style.outline=''},1800)}
}
function timeAlerts(){
 const list=document.getElementById('planList');if(!list||!db)return;
 const d=Number(selectedPlanDay)||1;
 const ps=(db.places||[]).filter(x=>Number(x.day)===d).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
 for(let i=1;i<ps.length;i++){
  const prev=ps[i-1],next=ps[i],a=minutes(prev.time),b=minutes(next.time);
  if(a===null||b===null)continue;
  const leg=(db.routes||[]).find(r=>Number(r.day)===d&&r.from===prev.name&&r.to===next.name);
  const travel=Number(leg?.minutes)||0;
  const stay=Number(prev.durationMinutes||prev.stayMinutes||0);
  if(!travel&&!stay)continue;
  const delta=a+stay+travel-b;if(delta<=0)continue;
  const row=[...list.querySelectorAll('.trip-stop')].find(e=>e.dataset.placeId===next.id);
  if(!row||row.previousElementSibling?.classList.contains('roam-v148-alert'))continue;
  const warn=document.createElement('div');warn.className='roam-v148-alert';
  warn.textContent='⚠ 时间可能冲突：前一地点'+(stay?'停留 '+stay+' 分钟、':'')+(travel?'交通 '+travel+' 分钟，':'')+'预计比下一地点时间晚 '+delta+' 分钟。';
  const btn=document.createElement('button');btn.textContent='查看路线';btn.onclick=()=>{window.show?.('map');setTimeout(()=>document.getElementById('mapList')?.scrollIntoView({behavior:'smooth',block:'start'}),120)};
  warn.appendChild(document.createElement('br'));warn.appendChild(btn);row.before(warn);
 }
}
function decorate(){
 if(trip()!==currentTrip){currentTrip=trip();focusId=null}
 addDaySwipe();mapLink();timeAlerts();
 const list=document.getElementById('planList');
 if(list&&!list.querySelector('.roam-v148-toolbar')){
  const bar=document.createElement('div');bar.className='roam-v148-toolbar';
  const prev=document.createElement('button'),next=document.createElement('button');
  prev.textContent='← 前一天';next.textContent='后一天 →';prev.onclick=()=>dayChange(-1);next.onclick=()=>dayChange(1);
  bar.append(prev,next);list.prepend(bar);
 }
}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate()})}
function init(){
 const plan=document.getElementById('planList'),map=document.getElementById('mapList');if(!plan||!map)return;
 const obs=new MutationObserver(schedule);obs.observe(plan,{childList:true,subtree:false});obs.observe(map,{childList:true,subtree:false});
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',schedule));
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
