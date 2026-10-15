/* Roam V120 — local itinerary history and safe undo; no Google API. */
(function(){
 const STORAGE='roam_history_v120', LIMIT=25;
 let paused=false;
 function read(){try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch{return {}}}
 function write(v){try{localStorage.setItem(STORAGE,JSON.stringify(v))}catch(e){console.warn('History storage full',e)}}
 function same(a,b){return JSON.stringify(a)===JSON.stringify(b)}
 function record(){
  if(paused||!roamProjects?.active)return;
  const project=roamProjects.items.find(p=>p.id===roamProjects.active);
  if(!project?.data)return;
  const previous=project.data, current=db;
  if(same(previous,current))return;
  const history=read(),id=roamProjects.active;
  const items=Array.isArray(history[id])?history[id]:[];
  const last=items[items.length-1];
  if(!last||!same(last.data,previous)){
   items.push({at:new Date().toISOString(),data:JSON.parse(JSON.stringify(previous))});
   history[id]=items.slice(-LIMIT);write(history);
  }
 }
 const oldSync=syncProject;
 syncProject=function(...args){record();return oldSync.apply(this,args)};
 function restore(snapshot){
  if(!snapshot||typeof snapshot!=='object'||!Array.isArray(snapshot.places))throw Error('历史数据无效');
  paused=true;
  try{
   db={...blank(),...JSON.parse(JSON.stringify(snapshot))};
   localStorage.setItem(KEY,JSON.stringify(db));
   oldSync();
   render();
  }finally{paused=false}
 }
 function undo(){
  const all=read(),id=roamProjects.active,items=all[id]||[];
  if(!items.length){alert('当前旅行还没有可撤销的历史记录');return}
  const last=items.pop();
  if(!confirm('恢复到 '+new Date(last.at).toLocaleString()+' 之前的行程状态？当前改动将被替换。'))return;
  try{restore(last.data);all[id]=items;write(all);alert('已恢复之前的旅行版本')}catch(e){alert('撤销失败：'+e.message)}
 }
 function showHistory(){
  const all=read(),items=(all[roamProjects.active]||[]).slice().reverse();
  const dialog=document.createElement('dialog');dialog.className='roam-history-dialog';
  const escText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
  dialog.innerHTML='<h2>🕘 行程修改历史</h2><p class="muted">保留最近 '+LIMIT+' 个不同版本，记录在当前浏览器中。恢复会替换当前旅行内容。</p><div class="roam-history-list">'+(items.length?items.map((item,i)=>'<div class="roam-history-item"><div><strong>'+escText(new Date(item.at).toLocaleString())+'</strong><small>'+escText(item.data.destination||'旅行')+' · '+(item.data.places?.length||0)+' 个地点</small></div><button type="button" class="secondary" data-history="'+i+'">恢复</button></div>').join(''):'<p class="muted">尚无历史版本，修改行程并保存后会自动记录。</p>')+'</div><button type="button" class="secondary" id="closeHistoryV120">关闭</button>';
  document.body.appendChild(dialog);dialog.querySelector('#closeHistoryV120').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.querySelectorAll('[data-history]').forEach(btn=>btn.onclick=()=>{
   const item=items[Number(btn.dataset.history)];
   if(!confirm('恢复到 '+new Date(item.at).toLocaleString()+' 的旅行版本？'))return;
   try{restore(item.data);dialog.close();alert('已恢复历史版本')}catch(e){alert('恢复失败：'+e.message)}
  });dialog.showModal();
 }
 function buttons(){
  const panel=document.getElementById('roamProjectPanel');if(!panel||panel.querySelector('#roamHistoryV120'))return;
  const bar=document.createElement('div');bar.id='roamHistoryV120';bar.className='roam-history-tools';
  bar.innerHTML='<button type="button" class="secondary" id="roamUndoV120">↶ 撤销上次修改</button><button type="button" class="secondary" id="roamHistoryListV120">🕘 修改历史</button>';
  panel.appendChild(bar);bar.querySelector('#roamUndoV120').onclick=undo;bar.querySelector('#roamHistoryListV120').onclick=showHistory;
 }
 const originalRenderProjects=renderProjects;
 renderProjects=function(...args){const result=originalRenderProjects.apply(this,args);buttons();return result};
})();
