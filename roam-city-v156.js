/* Roam V156 · 国家/城市标签（仅本机数据） */
(()=>{
'use strict';
const cities=[
['马德里','Madrid','西班牙',/普拉多|马德里皇宫|马约尔广场|丽池公园|德波神庙|格兰维亚|马德里|Madrid|Prado|Retiro/i],
['托莱多','Toledo','西班牙',/托莱多|圣胡安之门|Toledo/i],
['昆卡','Cuenca','西班牙',/库恩卡|悬挂屋|卡萨德尔维耶霍|Cuenca/i],
['巴塞罗那','Barcelona','西班牙',/巴塞罗那|圣家堂|米拉之家|巴特罗之家|Barcelona/i],
['东京','Tokyo','日本',/东京|浅草寺|晴空塔|涩谷|新宿|Tokyo/i],
['京都','Kyoto','日本',/京都|清水寺|伏见稻荷|金阁寺|岚山|Kyoto/i],
['大阪','Osaka','日本',/大阪|道顿堀|大阪城|心斋桥|Osaka/i],
['香港','Hong Kong','中国',/香港|维多利亚港|太平山|尖沙咀|Hong Kong/i],
['巴黎','Paris','法国',/巴黎|埃菲尔|卢浮宫|Paris/i],
['伦敦','London','英国',/伦敦|大本钟|大英博物馆|London/i],
['罗马','Rome','意大利',/罗马|斗兽场|万神殿|Rome/i],
['新加坡','Singapore','新加坡',/新加坡|滨海湾|鱼尾狮|Singapore/i]
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function locate(p,trip){
 if(p.city)return {city:p.city,country:p.country||'',manual:true};
 const name=[p.name,p.address,p.english].filter(Boolean).join(' ');
 let hit=cities.find(c=>c[3].test(name));
 if(!hit&&trip){hit=cities.find(c=>new RegExp(c[0]+'|'+c[1],'i').test(trip));}
 return hit?{city:hit[0],country:hit[2]}:null;
}
function label(loc){return loc?('📍 '+(loc.country?loc.country+' · ':'')+loc.city):'📍 城市待确认';}
function dayLabel(places,trip){
 const uniq=[];for(const p of places){const loc=locate(p,trip);if(loc&&!uniq.some(v=>v.city===loc.city&&v.country===loc.country))uniq.push(loc)}
 return uniq.length?uniq.map((x,i)=>(i===0&&x.country?x.country+' · ':'')+x.city).join(' → '):'城市待确认';
}
function patch(){
 const db=window.roamCityGetDb?.();if(!db)return;
 const trip=db.destination||'';
 document.querySelectorAll('#planList .trip-stop[data-place-id]').forEach(card=>{
  const p=(db.places||[]).find(x=>String(x.id)===card.dataset.placeId);
  if(!p)return;let tag=card.querySelector('.roam-city-tag-v156');
  if(!tag){tag=document.createElement('button');tag.type='button';tag.className='roam-city-tag-v156';const title=card.querySelector('.stop-title');if(!title)return;title.appendChild(tag)}
  const value=label(locate(p,trip));if(tag.textContent!==value)tag.textContent=value;
  tag.onclick=()=>{
   const current=locate(p,trip);
   const city=prompt('地点所属城市（留空取消手动标注）',p.city||current?.city||'');
   if(city===null)return;
   p.city=city.trim();if(!p.city){delete p.city;delete p.country;}
   else {const known=cities.find(c=>c[0]===p.city||c[1].toLowerCase()===p.city.toLowerCase());const country=prompt('所属国家 / 地区',p.country||known?.[2]||current?.country||'');if(country!==null)p.country=country.trim();}
   if(typeof window.persist==='function')window.persist();patch();
  };
 });
 const header=document.querySelector('#planList .plan-top h2');
 if(header){
  let sub=header.parentElement.querySelector('.roam-day-city-v156');
  if(!sub){sub=document.createElement('div');sub.className='roam-day-city-v156';header.after(sub)}
  const day=Number(window.roamCityGetDay?.())||1;
  const val='🌐 '+dayLabel((db.places||[]).filter(p=>Number(p.day)===day),trip);
  if(sub.textContent!==val)sub.textContent=val;
 }

}
const css=document.createElement('style');css.textContent=`
.roam-city-tag-v156{display:block!important;width:max-content;max-width:100%;margin:6px 0 1px;padding:4px 9px!important;border-radius:9px!important;background:#e7f2f5!important;color:#20556a!important;font-size:12px!important;font-weight:650!important;text-align:left;white-space:normal}
.roam-day-city-v156,.roam-ai-city-v156{font-size:12px;color:#446579;margin:5px 0 8px;font-weight:650}
.roam-ai-city-v156{background:#e7f2f5;border-radius:8px;padding:5px 9px;width:max-content;max-width:100%}
`;document.head.appendChild(css);
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch()})};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',schedule);schedule();
})();