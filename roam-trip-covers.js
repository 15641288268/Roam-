// V103: persistent trip covers, selected by AI and displayed as a swipe carousel.
const tripCoverJobsV103=new Set();
let tripCoverQueueV103=Promise.resolve(),tripCoverDOMKeyV103='',tripCoverScrollTimerV103=null,tripCoverIgnoreScrollV103=0;
function tripCoverCandidatesV103(project){
 const places=project.data?.places||[];
 const scenic=places.filter(p=>!['交通','机票','火车','住宿','餐饮','购物'].includes(p.type)&&String(p.name||'').trim());
 return [...new Map(scenic.map(p=>[p.name,p])).values()].slice(0,60).map((p,i)=>({id:String(i),name:String(p.name),english:String(p.english||''),note:String(p.note||'').slice(0,100)}));
}
function tripCoverKeyV103(project){
 const text=JSON.stringify([project.name,project.data?.destination,tripCoverCandidatesV103(project).map(p=>[p.name,p.english])]);
 let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(36);
}
function tripCoverSelectionV103(answer,candidates,destination){
 const id=String(answer?.answer||'').trim();
 const match=candidates.find(p=>p.id===id);
 if(!match)throw Error('AI 未选择有效的行程景点');
 return {...match,destination};
}
function tripCoverSaveV103(id,key,cover){
 const p=roamProjects.items.find(p=>p.id===id);if(!p||tripCoverKeyV103(p)!==key)return false;
 p.data.coverSummary={...cover,key};
 if(id===roamProjects.active){db.coverSummary=p.data.coverSummary;localStorage.setItem(KEY,JSON.stringify(db))}
 localStorage.setItem(PROJECT_KEY,JSON.stringify(roamProjects));return true;
}
async function tripCoverFetchV103(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7500);
 try{const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error('照片服务暂不可用');return await r.json()}finally{clearTimeout(timer)}
}
function tripCoverPlainV103(value){return String(value||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim()}
function tripCoverSafeURLV103(value){try{const u=new URL(value);return u.protocol==='https:'&&/^(?:upload\.wikimedia\.org|commons\.wikimedia\.org|[a-z-]+\.wikipedia\.org|creativecommons\.org)$/.test(u.hostname)?u.href:''}catch(e){return ''}}
async function tripCoverPhotoV103(selection){
 const queries=[selection.english,selection.name,selection.destination].map(x=>String(x||'').trim()).filter(Boolean);
 for(const query of [...new Set(queries)].slice(0,3)){
  for(const lang of /[\u3400-\u9fff]/.test(query)?['zh','en']:['en','zh']){
   try{
    const params=new URLSearchParams({origin:'*',action:'query',generator:'search',gsrsearch:query,gsrlimit:'5',prop:'pageimages',piprop:'thumbnail|name|original',pilicense:'free',pithumbsize:'1600',format:'json'});
    const data=await tripCoverFetchV103('https://'+lang+'.wikipedia.org/w/api.php?'+params);
    const pages=Object.values(data.query?.pages||{}).filter(p=>tripCoverSafeURLV103(p.thumbnail?.source)&&p.pageimage&&!/\.svg$|(?:^|[_ -])(?:map|logo|flag|coat|diagram)(?:[_ .-]|$)/i.test(p.pageimage));
    pages.sort((a,b)=>((b.title||'').includes(query)?3:0)+(Number(b.original?.width)>Number(b.original?.height)?1:0)-((a.title||'').includes(query)?3:0)-(Number(a.original?.width)>Number(a.original?.height)?1:0));
    for(const page of pages.slice(0,2)){
     const metaParams=new URLSearchParams({origin:'*',action:'query',titles:'File:'+page.pageimage,prop:'imageinfo',iiprop:'url|extmetadata',format:'json'});
     const meta=await tripCoverFetchV103('https://commons.wikimedia.org/w/api.php?'+metaParams);
     const info=Object.values(meta.query?.pages||{})[0]?.imageinfo?.[0],extra=info?.extmetadata;
     const license=tripCoverPlainV103(extra?.LicenseShortName?.value),author=tripCoverPlainV103(extra?.Artist?.value);
     const source=tripCoverSafeURLV103(info?.descriptionurl);
     if(!source||!license)continue;
     return {image:page.thumbnail.source,source,credit:[author.slice(0,120),license].filter(Boolean).join(' · '),photoTitle:String(page.title||query)};
    }
   }catch(e){/* Try another public photo source query. */}
  }
 }
 throw Error('暂未找到适合的旅行照片');
}
function tripCoverAIAvailableV103(){try{roamAIConfigV68();return true}catch(e){return false}}
function tripCoverQueueProjectV103(project,force=false){
 const id=project.id,key=tripCoverKeyV103(project),stored=project.data?.coverSummary;
 if(tripCoverJobsV103.has(id))return;
 const aiAvailable=tripCoverAIAvailableV103();
 if(!force&&stored?.key===key){
  if(stored.image&&(!aiAvailable||stored.aiSelected))return;
  if(Date.now()-(stored.attemptedAt||0)<180000&&(!aiAvailable||stored.aiAttempted))return;
 }
 tripCoverJobsV103.add(id);tripCoverUpdateCardV103(id);
 tripCoverQueueV103=tripCoverQueueV103.catch(()=>{}).then(async()=>{
  const current=roamProjects.items.find(p=>p.id===id);if(!current||tripCoverKeyV103(current)!==key)return;
  const destination=String(current.data?.destination||current.name||'').trim();
  const candidates=tripCoverCandidatesV103(current);
  if(!candidates.length&&destination)candidates.push({id:'destination',name:destination,english:'',note:'使用目的地城市作为旅行封面'});
  let selection={name:destination,english:'',destination},aiSelected=false,aiAttempted=false;
  if(aiAvailable&&candidates.length){
   aiAttempted=true;
   try{
    const result=await callRoamAIV68('chat','为这次旅行选择一处最能代表整个行程、适合作为照片封面的真实景点。结合目的地、其他行程地点、游览主题和照片辨识度选择。只从候选列表选择，不要修改行程。返回JSON中的answer只能是选中景点的id字符串，不得附加解释。',{destination,name:current.name,candidates});
    selection=tripCoverSelectionV103(result.result,candidates,destination);aiSelected=true;
   }catch(e){/* A destination photo is available while AI cannot select a cover. */}
  }
  try{
   const photo=await tripCoverPhotoV103(selection);
   tripCoverSaveV103(id,key,{...photo,landmark:selection.name,aiSelected,aiAttempted,attemptedAt:Date.now()});
  }catch(e){tripCoverSaveV103(id,key,{image:'',landmark:selection.name,aiSelected,aiAttempted,attemptedAt:Date.now(),error:'暂未找到合适照片'})}
 }).finally(()=>{tripCoverJobsV103.delete(id);tripCoverUpdateCardV103(id)});
}
function tripCoverUpdateCardV103(id){
 const p=roamProjects.items.find(p=>p.id===id),slide=document.getElementById('tripCover-'+id);if(!p||!slide)return;
 const cover=p.data?.coverSummary,valid=cover?.key===tripCoverKeyV103(p),image=valid?tripCoverSafeURLV103(cover.image):'';
 const img=slide.querySelector('.trip-cover-image'),status=slide.querySelector('.trip-cover-status'),credit=slide.querySelector('.trip-cover-credit');
 img.hidden=!image;if(image){if(img.getAttribute('src')!==image)img.src=image;img.alt=cover.photoTitle||cover.landmark||p.name}
 status.textContent=tripCoverJobsV103.has(id)?'正在为这次旅行选图…':valid&&cover.error?'暂未找到合适照片 · 可重选封面':valid&&cover.aiSelected?'AI 推荐 · '+cover.landmark:valid&&image?'目的地封面 · '+cover.landmark:'旅行封面 · 等待配图';
 credit.hidden=!image;if(image){credit.href=tripCoverSafeURLV103(cover.source);credit.textContent=cover.credit||'查看照片来源';credit.title='照片来源：'+cover.source}
 slide.querySelector('.trip-cover-title').textContent=p.name||p.data?.destination||'未命名旅行';
 slide.querySelector('.trip-cover-open').setAttribute('aria-label','打开'+(p.name||'这次旅行')+'的行程');
 slide.querySelector('.trip-cover-dates').textContent=projectOverviewV102(p.data);
}
function tripCoverOpenV103(id){const p=roamProjects.items.find(p=>p.id===id);if(!p)return;chooseProject(id,false);show('plan')}
function tripCoverIndexV103(){return Math.max(0,roamProjects.items.findIndex(p=>p.id===roamProjects.active))}
function tripCoverGoV103(index){
 const n=roamProjects.items.length;if(!n)return;index=(index+n)%n;
 const track=document.getElementById('tripCoverTrackV103');if(!track)return;
 tripCoverIgnoreScrollV103=Date.now()+650;
 chooseProject(roamProjects.items[index].id,false);
 track.scrollTo({left:index*track.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
function renderTripCoversV103(){
 const box=document.getElementById('tripCoversV103');if(!box)return;
 const items=roamProjects.items,key=items.map(p=>p.id).join('|');
 if(!items.length){box.innerHTML='<div class="trip-cover-empty">创建旅行后，这里会显示旅行封面。</div>';return}
 if(tripCoverDOMKeyV103!==key){
  tripCoverDOMKeyV103=key;
  box.innerHTML='<div class="trip-cover-track" id="tripCoverTrackV103">'+items.map(p=>'<div class="trip-cover-slide" id="tripCover-'+esc(p.id)+'"><button type="button" class="trip-cover-open" aria-label="打开'+esc(p.name)+'的行程"><img class="trip-cover-image" hidden alt=""><span class="trip-cover-shade"></span><span class="trip-cover-heading">YOUR JOURNEYS · 旅行总览<span class="trip-cover-enter">↗</span></span><span class="trip-cover-content"><span class="trip-cover-status"></span><strong class="trip-cover-title"></strong><span class="trip-cover-dates"></span><span class="trip-cover-instruction">点击查看行程 · 左右滑动切换旅行</span></span></button><a class="trip-cover-credit" hidden target="_blank" rel="noopener noreferrer"></a></div>').join('')+'</div><div class="trip-cover-controls"><button type="button" id="tripCoverPrevV103" aria-label="上一个旅行">‹</button><div class="trip-cover-dots">'+items.map((p,i)=>'<button type="button" class="trip-cover-dot" data-cover-index="'+i+'" aria-label="切换到'+esc(p.name)+'"></button>').join('')+'</div><span id="tripCoverCountV103" aria-live="polite"></span><button type="button" id="tripCoverNextV103" aria-label="下一个旅行">›</button><button type="button" id="tripCoverRefreshV103">AI 重选封面</button></div>';
  const track=document.getElementById('tripCoverTrackV103');
  for(const p of items){const slide=document.getElementById('tripCover-'+p.id),button=slide.querySelector('.trip-cover-open');let startX=0,startY=0,movedUntil=0;
   button.addEventListener('pointerdown',e=>{startX=e.clientX;startY=e.clientY});
   button.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-startX)>12||Math.abs(e.clientY-startY)>12)movedUntil=Date.now()+500});
   button.onclick=()=>{if(Date.now()>movedUntil)tripCoverOpenV103(p.id)};
   slide.querySelector('img').onerror=()=>{slide.querySelector('img').hidden=true;slide.querySelector('.trip-cover-status').textContent='照片暂时无法加载 · 可重选封面'};
  }
  track.onscroll=()=>{clearTimeout(tripCoverScrollTimerV103);tripCoverScrollTimerV103=setTimeout(()=>{
   if(Date.now()<tripCoverIgnoreScrollV103||!track.clientWidth)return;
   const index=Math.max(0,Math.min(roamProjects.items.length-1,Math.round(track.scrollLeft/track.clientWidth)));
   const p=roamProjects.items[index];if(p&&p.id!==roamProjects.active)chooseProject(p.id,false);
  },140)};
  document.getElementById('tripCoverPrevV103').onclick=()=>tripCoverGoV103(tripCoverIndexV103()-1);
  document.getElementById('tripCoverNextV103').onclick=()=>tripCoverGoV103(tripCoverIndexV103()+1);
  box.querySelectorAll('[data-cover-index]').forEach(b=>b.onclick=()=>tripCoverGoV103(Number(b.dataset.coverIndex)));
  document.getElementById('tripCoverRefreshV103').onclick=()=>{const p=roamProjects.items.find(p=>p.id===roamProjects.active);if(p)tripCoverQueueProjectV103(p,true)};
 }
 const index=tripCoverIndexV103(),track=document.getElementById('tripCoverTrackV103');
 if(Date.now()>=tripCoverIgnoreScrollV103&&Math.abs(track.scrollLeft-index*track.clientWidth)>2){tripCoverIgnoreScrollV103=Date.now()+250;track.scrollLeft=index*track.clientWidth}
 box.querySelectorAll('[data-cover-index]').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-current',i===index?'true':'false')});
 document.getElementById('tripCoverCountV103').textContent=(index+1)+' / '+items.length;
 for(const p of items)tripCoverUpdateCardV103(p.id);
 if(document.getElementById('home')?.classList.contains('active')){
  const order=[items[index],...items.filter((_,i)=>i!==index)];for(const p of order)tripCoverQueueProjectV103(p);
 }
}
document.querySelector('#centralAISettingsV68 button[onclick="roamAISave()"]')?.addEventListener('click',()=>setTimeout(renderTripCoversV103,0));
window.addEventListener('resize',()=>{tripCoverIgnoreScrollV103=0;renderTripCoversV103()});
renderTripCoversV103();
