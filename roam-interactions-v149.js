/* V149 — optional swipe shortcuts, bottom sheet editor, scroll retention */
(()=>{'use strict';
const scrolls=new Map();let current='home',lastTrip='',lastDay=0,backdrop;
function key(tab){return String(roamProjects?.active||'default')+':'+tab+':'+(Number(selectedPlanDay)||1)}
function tab(){return document.querySelector('main.wrap>section.active')?.id||'home'}
function remember(){scrolls.set(key(tab()),window.scrollY)}
function restore(t){const target=scrolls.get(key(t));if(target!==undefined)setTimeout(()=>window.scrollTo({top:target,behavior:'instant'}),90)}
function sheet(){
 const panel=document.getElementById('placeEditor');if(!panel)return;
 if(!backdrop){backdrop=document.createElement('div');backdrop.className='roam-v149-backdrop';backdrop.hidden=true;document.body.appendChild(backdrop);backdrop.onclick=close}
 if(!panel.querySelector('.roam-v149-sheet-title')){
  const row=document.createElement('div');row.className='roam-v149-sheet-title';
  const title=panel.querySelector('h2');if(title)row.appendChild(title);
  const b=document.createElement('button');b.type='button';b.textContent='关闭 ×';b.onclick=close;row.appendChild(b);panel.prepend(row);
 }
 if(!panel.hidden){panel.classList.add('roam-v149-sheet');backdrop.hidden=false;document.body.classList.add('roam-v149-modal-open')}
 else{panel.classList.remove('roam-v149-sheet');backdrop.hidden=true;document.body.classList.remove('roam-v149-modal-open')}
}
function close(){const p=document.getElementById('placeEditor');if(p)p.hidden=true;sheet()}
function cards(){
 document.querySelectorAll('#planList .trip-stop[data-place-id]').forEach(card=>{
  if(card.dataset.swipe149)return;card.dataset.swipe149='1';
  const id=card.dataset.placeId;
  const bar=document.createElement('div');bar.className='roam-v149-swipe-actions';
  for(const [label,fn,cls] of [
   ['编辑',()=>editPlace(id),''],
   ['复制',()=>{const p=db.places.find(x=>x.id===id);if(!p)return;const copy={...JSON.parse(JSON.stringify(p)),id:uid(),name:p.name+'（副本）'};db.places.push(copy);persist()},''],
   ['地图',()=>{show('map');setTimeout(()=>focusMapPlace?.(id),120)},''],
   ['删除',()=>remove('places',id),'danger']
  ]){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.onclick=e=>{e.stopPropagation();fn()};bar.appendChild(b)}
  const head=card.querySelector('.stop-head');if(head)head.after(bar);
  let x=0,y=0,t=0;
  card.addEventListener('touchstart',e=>{if(e.touches.length!==1||e.target.closest('input,button,.drag-handle,select,a')){t=0;return}x=e.touches[0].clientX;y=e.touches[0].clientY;t=Date.now()},{passive:true});
  card.addEventListener('touchend',e=>{if(!t||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;t=0;if(Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.5)return;card.classList.toggle('roam-v149-swiped',dx<0);if(dx<0)document.querySelectorAll('#planList .trip-stop.roam-v149-swiped').forEach(other=>{if(other!==card)other.classList.remove('roam-v149-swiped')})},{passive:true});
 });
}
let pending=false;
function decorate(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;cards();sheet()})}
function init(){
 const list=document.getElementById('planList'),panel=document.getElementById('placeEditor');if(!list||!panel)return;
 current=tab();lastTrip=String(roamProjects?.active||'default');lastDay=Number(selectedPlanDay)||1;
 const originalEdit=window.editPlace;if(typeof originalEdit==='function'){window.editPlace=function(id){const y=window.scrollY;originalEdit(id);sheet();window.scrollTo({top:y,behavior:'instant'})}}
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{remember();const t=b.dataset.tab;setTimeout(()=>{current=t;restore(t);decorate()},130)},true));
 const observer=new MutationObserver(decorate);observer.observe(list,{childList:true});observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)close()});
 // Re-rendering and switching days should not lose the selected card expansion.
 window.addEventListener('pagehide',remember);
 decorate();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
