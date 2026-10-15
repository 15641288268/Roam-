// V119: portable offline backup for all trips; no third-party APIs.
(function(){
 function addButton(){
  const panel=document.getElementById('roamProjectPanel');if(!panel||panel.querySelector('#roamBackupV119'))return;
  const row=document.createElement('div');row.id='roamBackupV119';row.className='roam-backup-tools';
  row.innerHTML='<button type="button" class="secondary" id="roamExportAllV119">备份全部旅行</button><button type="button" class="secondary" id="roamImportAllV119">从备份恢复</button><input type="file" id="roamBackupFileV119" accept=".json,application/json" hidden>';
  panel.appendChild(row);
  row.querySelector('#roamExportAllV119').onclick=()=>{
   try{
    syncProject();
    const payload={format:'roam-all-trips',version:1,exportedAt:new Date().toISOString(),projects:JSON.parse(JSON.stringify(roamProjects))};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='roam-all-trips-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   }catch(e){alert('备份失败：'+e.message)}
  };
  row.querySelector('#roamImportAllV119').onclick=()=>row.querySelector('#roamBackupFileV119').click();
  row.querySelector('#roamBackupFileV119').onchange=async e=>{
   const file=e.target.files?.[0];if(!file)return;
   try{
    if(file.size>15*1024*1024)throw Error('文件超过15MB');
    const data=JSON.parse(await file.text()),p=data.projects;
    if(data.format!=='roam-all-trips'||data.version!==1||!p||!Array.isArray(p.items)||!p.items.length||p.items.length>100)throw Error('文件不是有效的Roam全部旅行备份');
    for(const trip of p.items){if(typeof trip.id!=='string'||!trip.data||!Array.isArray(trip.data.places)||!Array.isArray(trip.data.routes)||!Array.isArray(trip.data.expenses))throw Error('备份包含无效的旅行数据')}
    if(!p.items.some(x=>x.id===p.active))p.active=p.items[0].id;
    if(!confirm('恢复会覆盖此浏览器当前的全部旅行。请先点击「备份全部旅行」保存现有数据。确认继续？'))return;
    localStorage.setItem('roam_pre_restore_backup_v119',JSON.stringify(roamProjects));
    localStorage.setItem('roam_projects_v1',JSON.stringify(p));
    localStorage.setItem('roam_active_project_v1',p.active);
    localStorage.setItem(KEY,JSON.stringify(p.items.find(x=>x.id===p.active).data));
    location.reload();
   }catch(err){alert('恢复失败，原有旅行未覆盖：'+err.message)}
   finally{e.target.value=''}
  };
 }
 const previous=renderProjects;
 renderProjects=function(...args){const result=previous.apply(this,args);addButton();return result};
})();
