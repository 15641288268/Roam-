/* Roam V125: local itinerary schedule audit; estimates are never represented as verified. */
(function(){
 const mins=t=>{const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(t||''));return m?Number(m[1])*60+Number(m[2]):null};
 const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s·・,，。()（）\-]/g,'');
 function inspect(){
  const issues=[],days=Math.max(1,Number(db.days)||1,...(db.places||[]).map(p=>Number(p.day)||1));
  for(let day=1;day<=days;day++){
   const ps=(db.places||[]).filter(p=>Number(p.day)===day);
   const seen=new Map();
   for(const p of ps){
    const n=norm(p.name);if(n&&seen.has(n))issues.push({day,type:'重复地点',level:'warn',message:'「'+p.name+'」在当天出现多次'});else seen.set(n,p);
   }
   const timed=ps.map(p=>({...p,_t:mins(p.time)})).filter(p=>p._t!==null).sort((a,b)=>a._t-b._t);
   for(let i=1;i<timed.length;i++){
    const a=timed[i-1],b=timed[i],gap=b._t-a._t;
    if(gap===0)issues.push({day,type:'时间重叠',level:'error',message:'「'+a.name+'」和「'+b.name+'」都安排在 '+a.time});
    else if(gap<30)issues.push({day,type:'行程过密',level:'warn',message:'「'+a.name+'」到「'+b.name+'」仅间隔 '+gap+' 分钟（未计算停留及交通）'});
   }
  }
  const bookings=(db.bookings||[]).filter(b=>b.date&&mins(b.time)!==null);
  for(const b of bookings){
   if(!db.start)continue;
   const a=Date.parse(db.start+'T12:00:00Z'),d=Date.parse(b.date+'T12:00:00Z');
   if(!Number.isFinite(a)||!Number.isFinite(d))continue;
   const day=Math.round((d-a)/86400000)+1;if(day<1||day>days)continue;
   const bt=mins(b.time);
   for(const p of (db.places||[]).filter(x=>Number(x.day)===day)){
    const pt=mins(p.time);if(pt===null)continue;
    if(Math.abs(bt-pt)<30)issues.push({day,type:'预订时间接近',level:'warn',message:'「'+p.name+'」'+p.time+' 与预订「'+b.name+'」'+b.time+' 相差不到30分钟'});
   }
  }
  return issues;
 }
 function mount(){
  const panel=document.getElementById('roamProjectPanel');if(!panel||panel.querySelector('#roamScheduleAuditV125'))return;
  const card=document.createElement('section');card.id='roamScheduleAuditV125';card.className='roam-schedule-audit';
  card.innerHTML='<div class="roam-audit-head"><h3>🕒 行程时间检查</h3><button type="button" class="secondary" id="roamAuditRefreshV125">重新检查</button></div><p class="muted">检查重复地点、同一时刻活动、30分钟内紧凑安排，以及接近预订的活动时间。未提供停留时长和真实路程，结果仅作提醒。</p><div id="roamAuditResultsV125"></div>';
  panel.appendChild(card);
  const output=card.querySelector('#roamAuditResultsV125');
  function update(){
   const list=inspect();output.replaceChildren();
   const summary=document.createElement('p');summary.textContent=list.length?'发现 '+list.length+' 条需要确认的安排：':'✓ 暂未发现规则范围内的时间冲突';output.appendChild(summary);
   for(const issue of list.slice(0,35)){
    const row=document.createElement('div');row.className='roam-audit-item '+issue.level;
    const strong=document.createElement('strong');strong.textContent='第 '+issue.day+' 天 · '+issue.type;
    const span=document.createElement('span');span.textContent=issue.message;
    row.append(strong,span);output.appendChild(row);
   }
   if(list.length>35){const p=document.createElement('p');p.textContent='还有 '+(list.length-35)+' 条提醒未展开';output.appendChild(p)}
  }
  card.querySelector('#roamAuditRefreshV125').onclick=update;update();
 }
 const old=renderProjects;
 renderProjects=function(...args){const v=old.apply(this,args);mount();return v};
})();
