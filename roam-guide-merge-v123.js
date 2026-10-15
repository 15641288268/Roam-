/* V123: merge guide-derived candidate places into trip inspiration library.
   All candidates require user review. No external map/Google API. */
(function(){
 const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s·・,，。()（）\-]/g,'');
 const cleanup=s=>String(s||'').replace(/^[\s\-•*#\d.、:：]+/,'').replace(/^(?:day\s*\d+|第[一二三四五六七八九十\d]+天)[：:\s-]*/i,'').replace(/\s*(?:→|->|—|–|～|~)\s*/g,'、').trim();
 const candidates=text=>{
  const chunks=String(text||'').split(/[\n\r、，,;；→]+/);
  const list=[];
  for(let part of chunks){
   part=cleanup(part).replace(/\([^)]{15,}\)|（[^）]{15,}）/g,'').trim();
   if(!part||part.length>48||part.length<2||/^https?:|^www\.|^\d{1,2}:\d{2}/i.test(part))continue;
   part=part.replace(/^\d{1,2}:\d{2}\s*/,'').replace(/(?:建议|推荐|必去|打卡|可以去|值得去)[:：]?/g,'').trim();
   if(!part||part.length>40||/^(?:攻略|旅行|行程|交通|费用|预算|住宿|酒店|早餐|午餐|晚餐|注意|建议|总结|第\d+天)$/i.test(part))continue;
   if(/[。！？!?]/.test(part)||part.split(/\s+/).length>7)continue;
   if(!list.some(x=>norm(x)===norm(part)))list.push(part);
  }
  return list.slice(0,80);
 };
 function addButton(){
  const panel=document.getElementById('roamProjectPanel');
  const insp=panel?.querySelector('.roam-inspiration-v122');
  if(!insp||insp.querySelector('#roamGuideMergeV123'))return;
  const button=document.createElement('button');button.type='button';button.id='roamGuideMergeV123';button.className='secondary';button.textContent='📋 从多篇攻略提取灵感';
  insp.querySelector('.roam-inspiration-head')?.after(button);
  button.onclick=()=>{
   const dialog=document.createElement('dialog');dialog.className='roam-guide-merge-dialog';
   dialog.innerHTML='<h3>📋 多攻略灵感融合</h3><p class="muted">粘贴多篇攻略文字，系统提取候选地点。请逐项核对，只有勾选的内容才会保存。不同攻略用空行分隔。</p>'+
   '<label>攻略文字<textarea id="roamMergeText" placeholder="攻略一：&#10;清水寺 → 祇园 → 鸭川&#10;&#10;攻略二：&#10;祇园、东寺、宇治平等院"></textarea></label>'+
   '<label>来源名称<input id="roamMergeSource" placeholder="例如：京都赏樱攻略合集"></label>'+
   '<button type="button" id="roamMergeExtract">提取候选地点</button><div id="roamMergeCandidates"></div>'+
   '<div class="actions"><button type="button" class="secondary" id="roamMergeClose">关闭</button><button type="button" id="roamMergeSave" disabled>合并选中地点</button></div>';
   document.body.appendChild(dialog);
   dialog.addEventListener('close',()=>dialog.remove(),{once:true});
   dialog.querySelector('#roamMergeClose').onclick=()=>dialog.close();
   const result=dialog.querySelector('#roamMergeCandidates'),save=dialog.querySelector('#roamMergeSave');
   dialog.querySelector('#roamMergeExtract').onclick=()=>{
    const value=dialog.querySelector('#roamMergeText').value;
    if(!value.trim())return alert('请先粘贴攻略文字');
    const list=candidates(value);
    result.replaceChildren();
    const p=document.createElement('p');p.className='muted';p.textContent='识别出 '+list.length+' 个候选片段。自动提取可能包含非地点文字，请取消勾选并编辑名称。';result.appendChild(p);
    for(const name of list){
     const label=document.createElement('label');label.className='roam-merge-candidate';
     const check=document.createElement('input');check.type='checkbox';check.checked=true;
     const input=document.createElement('input');input.type='text';input.maxLength=110;input.value=name;input.setAttribute('aria-label','候选地点名称');
     label.append(check,input);result.appendChild(label);
    }
    save.disabled=!list.length;
   };
   save.onclick=()=>{
    if(!Array.isArray(db.inspirations))db.inspirations=[];
    const source=dialog.querySelector('#roamMergeSource').value.trim().slice(0,160)||'攻略文字融合';
    let added=0,merged=0;
    for(const row of result.querySelectorAll('.roam-merge-candidate')){
     if(!row.querySelector('[type=checkbox]').checked)continue;
     const name=row.querySelector('[type=text]').value.trim();
     if(name.length<2||name.length>110)continue;
     const found=db.inspirations.find(x=>norm(x.name)===norm(name));
     if(found){merged++;const sources=String(found.source||'').split('；').filter(Boolean);if(!sources.includes(source))sources.push(source);found.source=sources.join('；').slice(0,500)}
     else{db.inspirations.push({id:uid(),name,source,createdAt:new Date().toISOString()});added++}
    }
    persist();dialog.close();alert('已新增 '+added+' 个灵感，合并重复 '+merged+' 个。');
   };
   dialog.showModal();
  };
 }
 const old=renderProjects;
 renderProjects=function(...args){const v=old.apply(this,args);addButton();return v};
})();
