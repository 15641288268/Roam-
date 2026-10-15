/* Roam V122: per-trip inspiration inbox. Works offline without Google API. */
(function(){
 const normalized=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s·・,，。()（）\-]/g,'');
 function items(){if(!Array.isArray(db.inspirations))db.inspirations=[];return db.inspirations}
 let activeTrip=null,refresh=null;
 function mount(){
  const panel=document.getElementById('roamInspirationPageV131');if(!panel)return;
  if(refresh&&activeTrip===roamProjects.active){refresh();return}
  panel.querySelector('.roam-inspiration-v122')?.remove();
  activeTrip=roamProjects.active;
  const entry=document.createElement('section');entry.className='roam-inspiration-v122';
  entry.innerHTML='<div class="roam-inspiration-head"><div><h3>✨ 旅行灵感库 <small id="roamInspirationCount">0</small></h3><p>先收藏想去的地点，再决定加入哪一天。不同旅行独立保存。</p></div></div>'+
  '<details><summary>＋ 收集景点或攻略地点</summary><label>地点名称（每行一个）<textarea id="roamInspirationNames" placeholder="平野神社\n宇治平等院\n锦市场"></textarea></label><label>攻略来源（可选）<input id="roamInspirationSource" placeholder="例如：朋友推荐 / 攻略截图 / 网站"></label><button type="button" id="roamInspirationAdd">保存到灵感库</button></details>'+
  '<div id="roamInspirationItems" class="roam-inspiration-items"></div>';
  panel.appendChild(entry);
  const list=entry.querySelector('#roamInspirationItems');
  function redraw(){
   const data=items();entry.querySelector('#roamInspirationCount').textContent=data.length;
   const maxDay=Math.max(1,Number(db.days)||1,...db.places.map(p=>Number(p.day)||1));
   list.innerHTML=data.length?data.map(x=>{
    const already=db.places.some(p=>normalized(p.name)===normalized(x.name));
    return '<div class="roam-inspiration-item" data-inspiration="'+esc(x.id)+'"><div><strong>'+esc(x.name)+'</strong><small>'+esc(x.source||'手动收藏')+(already?' · 已在行程中':'')+'</small></div><div class="roam-inspiration-controls"><select aria-label="安排日期">'+Array.from({length:maxDay},(_,i)=>'<option value="'+(i+1)+'">第 '+(i+1)+' 天</option>').join('')+'</select><button type="button" data-action="plan">加入</button><button type="button" class="secondary" data-action="remove">删除</button></div></div>';
   }).join(''):'<p class="muted">灵感库还是空的。可以一次粘贴多行景点名称。</p>';
  }
  entry.querySelector('#roamInspirationAdd').onclick=()=>{
   const names=entry.querySelector('#roamInspirationNames').value.split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean).slice(0,100);
   if(!names.length)return alert('请至少填写一个地点名称');
   const source=entry.querySelector('#roamInspirationSource').value.trim().slice(0,180);
   let added=0,duplicate=0;
   for(const name of names){if(name.length>120)continue;
    const found=items().find(x=>normalized(x.name)===normalized(name));
    if(found){duplicate++;if(source&&found.source!==source)found.source=[found.source,source].filter(Boolean).join('；').slice(0,500);continue}
    items().push({id:uid(),name,source,createdAt:new Date().toISOString()});added++;
   }
   entry.querySelector('#roamInspirationNames').value='';persist();redraw();alert('已收藏 '+added+' 个地点'+(duplicate?'；合并重复 '+duplicate+' 个':''));
  };
  list.onclick=e=>{
   const btn=e.target.closest('button[data-action]'),row=btn?.closest('[data-inspiration]');if(!row)return;
   const index=items().findIndex(x=>x.id===row.dataset.inspiration);if(index<0)return;
   const item=items()[index];
   if(btn.dataset.action==='remove'){if(!confirm('从灵感库删除「'+item.name+'」？不会删除行程里的地点。'))return;items().splice(index,1);persist();redraw();return}
   const day=Number(row.querySelector('select').value)||1;
   if(db.places.some(p=>Number(p.day)===day&&normalized(p.name)===normalized(item.name)))return alert('这一天已经安排了该地点');
   db.places.push({id:uid(),day,time:'',name:item.name,english:'',type:'景点',cost:0,currency:db.currency,note:item.source?'灵感来源：'+item.source:''});
   db.days=Math.max(Number(db.days)||1,day);persist();alert('已将「'+item.name+'」加入第 '+day+' 天。');
  };
  refresh=redraw;redraw();
 }
 const previous=renderProjects;
 renderProjects=function(...args){const result=previous.apply(this,args);mount();return result};
})();
