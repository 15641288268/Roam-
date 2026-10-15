/* Roam V134: compact date controls + inclusive trip-length inference from prompt. */
(function(){
 const start=()=>document.getElementById('aiTripStartV77');
 const end=()=>document.getElementById('aiTripEndV77');
 const prompt=()=>document.getElementById('aiPrompt');
 let autoEnd='',lastStart='',manualEnd=false;
 const chineseDigits={'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
 function duration(text){
  const t=String(text||'').replace(/\s+/g,'');
  // Nights have a different meaning: 4 nights / 5 days => 5 days.
  const explicit=t.match(/(?:玩|去|旅行|旅游|游玩|待|住|行程|共|计划|安排|为期|大约|约|预计)?(\d{1,2}|[一二两三四五六七八九十])天(?:\d{1,2}|[一二两三四五六七八九十])晚/);
  const generic=explicit||t.match(/(\d{1,2}|[一二两三四五六七八九十])\s*(?:天|日)(?!\s*(?:后|前|内))/);
  if(!generic)return null;
  const raw=generic[1],n=/^\d+$/.test(raw)?Number(raw):chineseDigits[raw];
  return Number.isInteger(n)&&n>=1&&n<=30?n:null;
 }
 function plusDays(iso,days){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return '';
  const d=new Date(iso+'T12:00:00Z');if(!Number.isFinite(d.getTime()))return '';
  d.setUTCDate(d.getUTCDate()+days-1);return d.toISOString().slice(0,10);
 }
 function note(){
  let el=document.getElementById('roamAutoDatesV134');
  if(el)return el;
  const endEl=end();if(!endEl)return null;
  el=document.createElement('p');el.id='roamAutoDatesV134';el.className='roam-auto-date-note';el.setAttribute('aria-live','polite');
  endEl.closest('label')?.after(el);return el;
 }
 function update(source){
  const a=start(),b=end(),p=prompt(),label=note();if(!a||!b||!p||!label)return;
  const n=duration(p.value);
  if(a.value!==lastStart){lastStart=a.value;manualEnd=false;}
  if(n&&a.value){
   const calculated=plusDays(a.value,n);
   if(calculated&&(!manualEnd||!b.value||b.value===autoEnd)){
    b.value=calculated;autoEnd=calculated;manualEnd=false;
    label.textContent='✓ 已根据描述中的「'+n+'天」自动填写结束日期（含出发当天），可手动修改。';
    if(typeof updateAITripDaysV77==='function')updateAITripDaysV77();
   }else{
    label.textContent='已识别到 '+n+' 天；当前结束日期由你手动设置，未自动覆盖。';
   }
  }else{
   label.textContent=!n?'未识别到旅行天数，请手动选择结束日期。':'请选择出发日期，系统会自动计算结束日期。';
   // Never clear a manually chosen end date.
   if(source==='prompt'&&!n&&b.value===autoEnd&&!manualEnd){b.value='';autoEnd='';if(typeof updateAITripDaysV77==='function')updateAITripDaysV77()}
  }
 }
 function mount(){
  const a=start(),b=end(),p=prompt();if(!a||!b||!p||a.dataset.roamAutoV134)return;
  a.dataset.roamAutoV134='1';lastStart=a.value;
  a.addEventListener('change',()=>update('start'));
  p.addEventListener('input',()=>update('prompt'));
  b.addEventListener('change',()=>{manualEnd=b.value!==autoEnd;note().textContent='结束日期已手动设置。';});
  document.querySelectorAll('[data-example]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>update('prompt'),0)));
  update('init');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
