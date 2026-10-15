/* V147: additive interaction improvements; existing itinerary data untouched. */
(()=>{'use strict';
const openByTrip=new Map();let lastTab='home',lastScroll=0;
const tripKey=()=>String(roamProjects?.active||'default');
function expandedSet(){const k=tripKey();if(!openByTrip.has(k))openByTrip.set(k,new Set());return openByTrip.get(k)}
function decorate(){
 const list=document.getElementById('planList');if(!list)return;
 const opened=expandedSet();
 list.querySelectorAll('.trip-stop[data-place-id]').forEach(card=>{
  const id=card.dataset.placeId;
  if(card.querySelector('.roam-fold-toggle'))return;
  const head=card.querySelector('.stop-head');if(!head)return;
  const btn=document.createElement('button');btn.type='button';btn.className='roam-fold-toggle';
  btn.setAttribute('aria-label','展开或收起地点操作');head.appendChild(btn);
  const info=document.createElement('div');info.className='roam-compact-time';
  const time=card.querySelector('.stop-time input[type=time]')?.value||'';
  info.textContent='◷ '+time+' · 点击展开编辑';head.after(info);
  const apply=()=>{const expanded=opened.has(id);card.classList.toggle('roam-collapsed',!expanded);btn.textContent=expanded?'收起 ⌃':'展开 ⌄';btn.setAttribute('aria-expanded',String(expanded))};
  btn.addEventListener('click',e=>{e.stopPropagation();opened.has(id)?opened.delete(id):opened.add(id);apply()});
  head.addEventListener('click',e=>{if(e.target.closest('button,.drag-handle,a,input'))return;btn.click()});
  apply();
 });
}
const observer=new MutationObserver(()=>{observer.disconnect();decorate();const list=document.getElementById('planList');if(list)observer.observe(list,{childList:true})});
function setup(){
 const list=document.getElementById('planList');if(list){decorate();observer.observe(list,{childList:true})}
 if(document.getElementById('roamQuickAddV147'))return;
 const fab=document.createElement('button');fab.id='roamQuickAddV147';fab.className='roam-quick-add';fab.type='button';fab.textContent='+';fab.setAttribute('aria-label','快捷添加');
 const sheet=document.createElement('div');sheet.className='roam-quick-sheet';sheet.hidden=true;
 sheet.innerHTML='<div class="roam-quick-sheet-inner" role="dialog" aria-modal="true" aria-label="快捷添加"><h3>快捷添加</h3><button data-target="place">＋ 添加地点</button><button data-target="route">↗ 添加交通路线</button><button data-target="booking">▤ 添加预订</button><button data-target="import">✨ 导入攻略</button><button data-target="close">取消</button></div>';
 document.body.append(fab,sheet);
 const visible=()=>{const tab=document.querySelector('main.wrap > section.active')?.id;fab.hidden=!['plan','map'].includes(tab)};
 fab.addEventListener('click',()=>{sheet.hidden=false});
 sheet.addEventListener('click',e=>{
  if(e.target===sheet){sheet.hidden=true;return}
  const b=e.target.closest('[data-target]');if(!b)return;sheet.hidden=true;
  const t=b.dataset.target;if(t==='close')return;
  if(t==='route'){if(typeof window.openTabRoute==='function')window.openTabRoute();else window.show?.('map');return}
  if(t==='place'){window.show?.('plan');setTimeout(()=>{const input=document.getElementById('pname');input?.scrollIntoView({behavior:'smooth',block:'center'});input?.focus({preventScroll:true})},100);return}
  if(t==='booking'){window.show?.('bookings');setTimeout(()=>document.querySelector('#bookings input')?.focus(),100);return}
  if(t==='import'){const b=[...document.querySelectorAll('button')].find(x=>/导入攻略|截图导入|文字导入/.test(x.textContent||''));if(b){b.scrollIntoView({behavior:'smooth',block:'center'});b.click()}else{window.show?.('home');alert('请在攻略导入区域选择截图或文字导入。')}}
 });
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTimeout(visible,30)));
 const pageObserver=new MutationObserver(visible);pageObserver.observe(document.querySelector('main.wrap'),{attributes:true,attributeFilter:['class'],subtree:true});
 visible();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
