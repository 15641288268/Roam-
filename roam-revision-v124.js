/* Roam V124: revision scope + locked draft activities, no Google API. */
(function(){
 const state={scope:'day',day:1,locks:{}};
 const key=(d,n)=>String(d)+'|'+String(n||'').normalize('NFKC').trim().toLowerCase();
 function mount(){
  const follow=document.getElementById('aiFollow');
  if(!follow||document.getElementById('roamRevisionControlsV124'))return;
  const wrap=document.createElement('div');wrap.id='roamRevisionControlsV124';wrap.className='roam-revision-controls';
  wrap.innerHTML='<h4>🔒 AI 修改范围</h4><label>允许修改<select id="roamRevisionScopeV124"><option value="day">指定某一天（推荐）</option><option value="all">全部日期（保留目的地及日期）</option></select></label><label id="roamRevisionDayWrapV124">选择日期<select id="roamRevisionDayV124"></select></label><div class="roam-revision-locks" id="roamRevisionLocksV124"></div><p class="muted">勾选的活动将保持原时间和内容。AI 只能修改所选范围；修改结果先作为草稿，不会直接覆盖正式行程。</p>';
  const aiPanel=follow.closest('.panel');
  const feedback=document.getElementById('aiFeedback');
  if(feedback)feedback.before(wrap);
  else if(aiPanel)aiPanel.appendChild(wrap);
  else follow.after(wrap);
  wrap.querySelector('#roamRevisionScopeV124').onchange=e=>{state.scope=e.target.value;update()};
  wrap.querySelector('#roamRevisionDayV124').onchange=e=>{state.day=Number(e.target.value)||1;update()};
  wrap.querySelector('#roamRevisionLocksV124').onchange=e=>{if(e.target.matches('input[data-lock]'))state.locks[e.target.dataset.lock]=e.target.checked};
  update();
 }
 function update(){
  const root=document.getElementById('roamRevisionControlsV124');if(!root)return;
  const draft=typeof aiPlanDraftV68!=='undefined'?aiPlanDraftV68:null;
  const days=Array.isArray(draft?.days)?draft.days:[];
  const daySelect=root.querySelector('#roamRevisionDayV124');
  daySelect.innerHTML=days.map((d,i)=>'<option value="'+(i+1)+'">第 '+(i+1)+' 天</option>').join('');
  state.day=Math.min(Math.max(1,state.day),Math.max(1,days.length));daySelect.value=String(state.day);
  const allDays=state.scope==='all';
  root.querySelector('#roamRevisionDayWrapV124').hidden=allDays;
  const locks=root.querySelector('#roamRevisionLocksV124');
  locks.hidden=allDays;
  if(allDays){locks.innerHTML='';return;}
  if(!days.length){locks.innerHTML='<small>先生成 AI 行程草稿，再选择需要锁定的活动。</small>';return}
  const day=days[state.day-1],places=Array.isArray(day?.places)?day.places:[];
  locks.innerHTML='<strong>第 '+state.day+' 天固定活动</strong>'+(places.length?places.map(p=>{
   const k=key(state.day,p.name);return '<label class="roam-revision-lock"><input type="checkbox" data-lock="'+esc(k)+'" '+(state.locks[k]?'checked':'')+'> '+esc((p.time||'')+' '+(p.name||'未命名地点'))+'</label>'
  }).join(''):'<p class="muted">当天没有活动</p>');
 }
 function before(){const plan=typeof aiPlanDraftV68!=='undefined'?aiPlanDraftV68:null;return plan&&Array.isArray(plan.days)?JSON.parse(JSON.stringify(plan)):null}
 function protect(original,candidate){
  if(!original||!candidate||!Array.isArray(original.days)||!Array.isArray(candidate.days))return candidate;
  const days=original.days;
  candidate.days=days.map((day,i)=>{
   if(state.scope==='day'&&i+1!==state.day)return JSON.parse(JSON.stringify(day));
   const changed=candidate.days.find(d=>Number(d.day)===i+1)||candidate.days[i]||{};
   const incoming=Array.isArray(changed.places)?changed.places:[];
   const old=Array.isArray(day.places)?day.places:[];
   const locked=old.filter(p=>state.locks[key(i+1,p.name)]);
   const filtered=incoming.filter(p=>!locked.some(x=>key(i+1,x.name)===key(i+1,p.name)));
   const combined=[...filtered,...locked.map(x=>JSON.parse(JSON.stringify(x)))];
   combined.sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
   return {...day,...changed,day:i+1,places:combined};
  });
  return candidate;
 }
 window.roamRevisionV124={state,mount,update,before,protect};
 const oldRender=render;
 render=function(...args){const v=oldRender.apply(this,args);mount();return v};
 const observer=new MutationObserver(()=>{if(document.getElementById('aiFollow')&&!document.getElementById('roamRevisionControlsV124'))mount()});
 observer.observe(document.body,{childList:true,subtree:true});
 mount();
})();
