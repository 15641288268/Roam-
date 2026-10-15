/* V139: inspiration place details, editing, navigation and AI assistant */
(function(){
 function enhance(){
  const root=document.getElementById('roamInspirationPageV131');if(!root)return;
  root.querySelectorAll('.roam-inspiration-item[data-inspiration]').forEach(row=>{
   if(row.querySelector('.roam-inspiration-details-v139'))return;
   const item=(db.inspirations||[]).find(x=>x.id===row.dataset.inspiration);if(!item)return;
   const box=document.createElement('div');box.className='roam-inspiration-details-v139';
   const links=document.createElement('div');links.className='roam-inspiration-links-v139';
   const map=document.createElement('a');map.textContent='📍 Google Maps ↗';map.target='_blank';map.rel='noopener noreferrer';
   map.href=item.googleUrl&&/^https?:\/\//i.test(item.googleUrl)?item.googleUrl:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((item.english||item.name)+' '+(db.destination||''));
   const official=document.createElement('a');official.textContent='🌐 官网 ↗';official.target='_blank';official.rel='noopener noreferrer';
   official.href=item.website&&/^https?:\/\//i.test(item.website)?item.website:'https://www.google.com/search?q='+encodeURIComponent((item.english||item.name)+' official website');
   const ai=document.createElement('button');ai.type='button';ai.className='secondary';ai.textContent='✨ 地点助手';
   ai.onclick=()=>{
    const panel=document.getElementById('placeAIPanel'),title=document.getElementById('aiPlaceTitle'),prompt=document.getElementById('aiPlacePrompt');
    if(!panel||!title||!prompt){alert('地点助手暂不可用');return}
    if(typeof show==='function')show('plan');
    title.textContent=item.name;prompt.value='请介绍'+item.name+'，推荐游玩时长、附近餐厅、营业时间、官网和订票信息。';
    panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'center'});
   };
   links.append(map,official,ai);
   const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='✏️ 编辑地点资料';
   const form=document.createElement('div');form.className='roam-inspiration-form-v139';form.hidden=true;
   const fields=[['name','地点名称'],['english','英文 / 当地名称'],['address','详细地址 / 位置'],['googleUrl','Google Maps 链接'],['website','官方网站'],['hours','营业时间'],['source','攻略来源'],['note','旅行备注']];
   for(const [key,label] of fields){
    const wrap=document.createElement('label');wrap.textContent=label;
    const input=key==='note'?document.createElement('textarea'):document.createElement('input');
    input.dataset.field=key;input.value=item[key]||'';wrap.append(input);form.append(wrap);
   }
   const save=document.createElement('button');save.type='button';save.textContent='保存地点资料';
   save.onclick=()=>{
    const changes={};form.querySelectorAll('[data-field]').forEach(el=>changes[el.dataset.field]=el.value.trim());
    if(!changes.name){alert('请填写地点名称');return}
    for(const key of ['googleUrl','website'])if(changes[key]&&!/^https?:\/\//i.test(changes[key])){alert('网址需要以 https:// 或 http:// 开头');return}
    Object.assign(item,changes);persist();
   };
   form.append(save);
   edit.onclick=()=>{form.hidden=!form.hidden;edit.textContent=form.hidden?'✏️ 编辑地点资料':'收起编辑'};
   box.append(links,edit,form);
   const controls=row.querySelector('.roam-inspiration-controls');if(controls)row.insertBefore(box,controls);else row.append(box);
   const title=row.querySelector('strong');if(title)title.title=item.address||item.english||item.name;
  });
 }
 const old=renderProjects;
 renderProjects=function(...args){const result=old.apply(this,args);enhance();return result};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();
