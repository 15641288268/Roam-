/* V152 — local calendar based home summary. No location, sync or external APIs. */
(()=>{'use strict';
const pad=n=>String(n).padStart(2,'0');
const localDay=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);
const dateString=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseDay=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s||'')))return null;const [y,m,d]=s.split('-').map(Number);const x=new Date(y,m-1,d,12);return dateString(x)===s?x:null};
const diff=(a,b)=>Math.round((Date.UTC(a.getFullYear(),a.getMonth(),a.getDate())-Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()))/86400000);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderHome(){
 const panel=document.getElementById('roamProjectPanel');if(!panel||typeof db==='undefined')return;
 let box=document.getElementById('roamHomeV152');
 if(!box){box=document.createElement('section');box.id='roamHomeV152';box.className='roam-v152-home';panel.after(box)}
 const start=parseDay(db.start),days=Math.max(1,Number(db.days)||1);
 const today=localDay(new Date()),offset=start?diff(today,start):null;
 const places=Array.isArray(db.places)?db.places:[],bookings=Array.isArray(db.bookings)?db.bookings:[];
 const tripName=roamProjects?.items?.find(x=>x.id===roamProjects.active)?.name||db.destination||'我的旅行';
 let title='',desc='',badge='',day=1;
 if(!start){title='为这段旅程确定日期';desc='填写出发日期后，首页将自动显示出行倒计时及当天安排。';badge='待规划'}
 else if(offset<0){title='距离出发还有 '+(-offset)+' 天';desc='出发日期：'+dateString(start)+' · '+days+' 天行程';badge='即将出发'}
 else if(offset<days){day=offset+1;title='旅程第 '+day+' 天';desc='今天 '+dateString(today)+' · '+esc(db.destination||tripName);badge='旅行进行中'}
 else{day=days;title='这段旅程已结束';desc='出发于 '+dateString(start)+' · 共 '+days+' 天。可以随时回顾行程。';badge='旅行回顾'}
 const daily=places.filter(p=>Number(p.day)===day);
 const dated=dateString(today);
 const todayBookings=bookings.filter(b=>b.date===dated);
 const summary=(offset!==null&&offset>=0&&offset<days)?'<p>今日安排 '+daily.length+' 个地点'+(todayBookings.length?' · '+todayBookings.length+' 项当日预订':'')+'。</p>':'';
 const html='<div class="roam-v152-top"><div><div class="roam-v152-eyebrow">YOUR JOURNEY · '+esc(tripName)+'</div><h2>'+title+'</h2></div><span class="roam-v152-badge">'+badge+'</span></div><p>'+desc+'</p>'+
 '<div class="roam-v152-stats"><span>📍 '+places.length+' 个行程地点</span><span>🎟 '+bookings.length+' 项预订</span><span>🗓 '+days+' 天</span></div>'+summary+
 '<div class="roam-v152-actions"><button type="button" data-go="plan">查看'+(offset!==null&&offset>=0&&offset<days?'今日':'旅行')+'行程 →</button><button type="button" data-go="map">打开地图</button></div>';
 if(box.dataset.content===html)return;
 box.dataset.content=html;box.innerHTML=html;
 box.querySelectorAll('[data-go]').forEach(btn=>btn.onclick=()=>{
  const target=btn.dataset.go;
  if(typeof changePlanDay==='function')changePlanDay(day);
  if(typeof show==='function')show(target);
 });
}
let pending=false;
function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;renderHome()})}
function init(){
 const panel=document.getElementById('roamProjectPanel');if(!panel)return;
 new MutationObserver(schedule).observe(panel,{childList:true,subtree:true});
 document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',schedule));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
