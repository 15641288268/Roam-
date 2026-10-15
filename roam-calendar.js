// V105: manually editable calendar days and insertion into existing journeys.
function roamDateOffsetV105(a,b){return Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000)}
function roamShiftDaysV105(from,amount){for(const key of ['places','routes','expenses'])for(const item of db[key]||[])if(Number.isInteger(Number(item.day))&&Number(item.day)>=from)item.day=Number(item.day)+amount}
function roamCommitV105(){db.days=Math.max(1,Number(db.days)||1);selectedPlanDay=Math.min(db.days,Math.max(1,selectedPlanDay));persist()}
function roamAddBlankDateV105(date){
 if(!db.start)throw Error('请先设置旅行开始日期');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z')))throw Error('请选择有效日期');
 const offset=roamDateOffsetV105(db.start,date),days=Number(db.days)||1;
 if(offset<0){roamShiftDaysV105(1,-offset);db.start=date;db.days=days-offset;selectedPlanDay=1}
 else if(offset>=days){db.days=offset+1;selectedPlanDay=offset+1}
 else{selectedPlanDay=offset+1;alert('该日期已经存在，已跳转到对应日期，可直接添加活动。');render();return}
 roamCommitV105();
}
function roamMoveDateV105(from,date){
 if(!db.start)throw Error('请先设置旅行开始日期');
 const old=Number(from),offset=roamDateOffsetV105(db.start,date),count=Number(db.days)||1;
 if(!Number.isInteger(old)||old<1||old>count||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(offset))throw Error('无效日期');
 let target=offset+1;
 if(target<1){roamShiftDaysV105(1,1-target);db.start=date;db.days=count+1-target;target=1}
 else if(target>count)db.days=target;
 if(old!==target){
  for(const key of ['places','routes','expenses'])for(const item of db[key]||[]){const n=Number(item.day);if(n===old)item.day=target;else if(n===target)item.day=old}
 }
 selectedPlanDay=target;roamCommitV105();
}
function insertGuideIntoTripV105(draft){
 if(!draft?.days?.length||!draft.start)throw Error('请先生成攻略草稿并确认日期');
 if(!db.start)throw Error('当前旅行未设置开始日期');
 if(!confirm('将攻略 '+draft.start+' 开始的 '+draft.days.length+' 天插入当前旅行。插入日期及之后原有行程会整体顺延，是否继续？'))return;
 let index=roamDateOffsetV105(db.start,draft.start)+1;
 if(index<1){const n=1-index;roamShiftDaysV105(1,n);db.start=draft.start;db.days=(Number(db.days)||1)+n;index=1}
 const count=draft.days.length,originalDays=Number(db.days)||1;
 if(index<=originalDays)roamShiftDaysV105(index,count);
 db.days=Math.max(originalDays+Math.max(0,count),index+count-1);
 for(const [i,day] of draft.days.entries())for(const p of day.places||[])db.places.push({id:uid(),day:index+i,time:p.time||'09:00',name:p.name,type:p.type||'景点',note:p.activity||'',cost:Number(p.cost)||0,currency:db.currency||'CNY'});
 db.guideSources=[...(db.guideSources||[]),{platform:'通用攻略',date:draft.start,duration:count,text:draft.sourceText,summary:draft.summary,createdAt:new Date().toISOString()}];
 selectedPlanDay=index;roamCommitV105();alert('已插入 '+count+' 天攻略，原有后续行程已顺延。请检查原先固定日期的酒店、机票等预订。');
}
function openTripCalendarV105(){
 const dlg=document.createElement('dialog');dlg.className='ai-import-dialog-v73';
 const current=roamDayDate(selectedPlanDay);
 dlg.innerHTML='<h2>📅 编辑旅行日期</h2><p class="muted">可新增任意日期的空白行程，也可更改当前整天的日期。如果目标日期已有安排，将交换两天全部活动；若日期早于出发日，会自动扩展旅行。</p><label>当前日期：'+esc(current)+'</label><label>目标日期<input type="date" id="calendarDateV105" value="'+esc(current)+'"></label><div class="actions"><button type="button" id="calendarSwapV105">移动 / 交换当前整天</button><button type="button" class="secondary" id="calendarBlankV105">创建 / 打开空白日期</button><button type="button" class="secondary" id="calendarCancelV105">关闭</button></div><p class="muted">提示：调整会同步景点、日内路线和按天记录的费用；固定日期的机票、酒店预订不自动更改。</p>';
 document.body.appendChild(dlg);dlg.showModal();dlg.addEventListener('close',()=>dlg.remove(),{once:true});
 dlg.querySelector('#calendarCancelV105').onclick=()=>dlg.close();
 dlg.querySelector('#calendarBlankV105').onclick=()=>{try{roamAddBlankDateV105(dlg.querySelector('#calendarDateV105').value);dlg.close()}catch(e){alert(e.message)}};
 dlg.querySelector('#calendarSwapV105').onclick=()=>{try{roamMoveDateV105(selectedPlanDay,dlg.querySelector('#calendarDateV105').value);dlg.close()}catch(e){alert(e.message)}};
}
const roamOldRenderV105=render;
render=function(...args){const result=roamOldRenderV105.apply(this,args);const list=document.getElementById('planList');if(list){let actions=document.getElementById('calendarActionsV105');if(!actions){actions=document.createElement('div');actions.id='calendarActionsV105';actions.className='panel';list.parentNode.insertBefore(actions,list)}actions.innerHTML='<div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap"><strong>📅 '+esc(roamDayDate(selectedPlanDay))+'</strong><button type="button" onclick="openTripCalendarV105()">编辑日期 / 添加空白天 / 交换日期</button></div>'}return result};
