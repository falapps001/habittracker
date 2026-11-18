
import { loadState, saveState, clearState, askPersistent } from './store.js';
import { emptyDirty, isDirty, syncNow } from './sync.js';
import { configured, currentUser, signIn, signUp, resetPassword, signOutUser, backend } from './firebase.js';

const DAYMS=86400000;
const pad=n=>String(n).padStart(2,'0');
const key=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromKey=k=>{const[y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
const COLORS=['#5b8def','#3fb47a','#e8913a','#e0609a','#9a7cf0','#2fb3b3','#d9b13b','#e5675a'];
const ICONS=['🤲','🌅','☀️','🌤️','🌇','🌃','🌌','⭐','🌞','📖','🌙','⏰','🪥','🍽️','📵','😴','🚫','🛡️','あ','📝','💰','📞','📓','🧴','🧖','💧','🏃','💊'];

const I={
  sync:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 12a8.5 8.5 0 0 1-14.8 5.7L3.5 15.5"/><path d="M3.5 20.5v-5h5"/><path d="M3.5 12a8.5 8.5 0 0 1 14.8-5.7l2.2 2.2"/><path d="M20.5 3.5v5h-5"/></svg>',
  check:'<svg class="ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  chev:'<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
  down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  flame:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.6 2.5c.6 3.6 5.4 5.6 5.4 11a6 6 0 0 1-12 0c0-2.7 1.3-4.4 2.7-5.6.2 1.8 1.1 3 2.4 3 0-3.5 1-5.9 1.5-8.4z"/></svg>',
  laptop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19.5h20"/></svg>',
  phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
  archive:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  restore:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/></svg>'
};

/* ---------- data ---------- */
const STARTER=(()=>{
  const G='#3fb47a',T='#2fb3b3',V='#9a7cf0',B='#5b8def',R='#e5675a',O='#e8913a',P='#e0609a',Y='#d9b13b';
  const list=[
    ['Tahajud','🌌',V],['Witir','⭐',V],['Quran','📖',V],
    ['Qobliyah Subuh','🤲',T],['Subuh','🌅',G],['Dhuha','🌞',V],
    ['Qobliyah Dhuhur','🤲',T],['Dhuhur','☀️',G],["Ba'diyah Dhuhur",'🤲',T],
    ['Qobliyah Ashar','🤲',T],['Ashar','🌤️',G],
    ['Qobliyah Maghrib','🤲',T],['Maghrib','🌇',G],["Ba'diyah Maghrib",'🤲',T],
    ['Qobliyah Isya','🤲',T],['Isya','🌃',G],["Ba'diyah Isya",'🤲',T],
    ['Fasting','🌙',V],
    ['Wake up 3am','⏰',B],['Morning toothbrush','🪥',B],['Daily plan','📝',O],['Morning skincare','🧴',Y],
    ['No food 2h','🍽️',B],['No screens','📵',B],['Night toothbrush','🪥',B],['Sleep 9pm','😴',B],['Journal review','📓',O],['Night skincare','🧖',Y],
    ['No porn','🚫',R],['No fap','🛡️',R],['Nihongo','あ',P],['Money tracker','💰',O],['Call parents','📞',O]
  ];
  const GRP={'Wake up 3am':'Morning','Morning toothbrush':'Morning','Morning skincare':'Morning','Daily plan':'Morning',
    'No food 2h':'Night routine','No screens':'Night routine','Night toothbrush':'Night routine','Night skincare':'Night routine','Sleep 9pm':'Night routine','Journal review':'Night routine',
    'No porn':'Self','No fap':'Self','Nihongo':'Self','Money tracker':'Self','Call parents':'Self'};
  const DESC={'No food 2h':'No eating 2 hours before sleep','No screens':'No screens 30 minutes before bed','No fap':'No masturbation','Wake up 3am':'Wake up at 3 am','Sleep 9pm':'In bed by 9 pm'};
  return list.map(([name,icon,color])=>({name,icon,color,group:GRP[name]||'Prayers',desc:DESC[name]||''}));
})();
const DEFAULT_GROUPS=['Prayers','Morning','Night routine','Self'];
const newId=()=>'h'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function emptyState(){
  return {v:2,habits:[],logs:{},lts:{},tomb:{},
    settings:{theme:'system',weekStart:1,collapsed:{},groupOrder:[...DEFAULT_GROUPS],ts:0},
    dirty:emptyDirty(),sync:{uid:null,email:null,lastPull:0,lastSync:0},lastBackup:null};
}
let S=emptyState();
let saveT=null;
function save(){clearTimeout(saveT);saveT=setTimeout(()=>{saveT=null;saveState(S)},250)}
function flush(){clearTimeout(saveT);saveT=null;return saveState(S)}
addEventListener('pagehide',()=>{flush()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});
const now=()=>Date.now();
function touchHabit(h){h.ts=now();S.dirty.habits[h.id]=1}
function touchOrder(){S.habits.forEach((h,i)=>{if(h.pos!==i){h.pos=i;touchHabit(h)}})}
function touchSettings(){S.settings.ts=now();S.dirty.settings=true}
function deviceInfo(){
  let id=null;try{id=localStorage.getItem('habit-log-device')}catch(e){}
  if(!id){id='d'+Math.random().toString(36).slice(2,10);try{localStorage.setItem('habit-log-device',id)}catch(e){}}
  const ua=navigator.userAgent;
  const os=/iPhone|iPad/.test(ua)?'iPhone':/Android/.test(ua)?'Android':/Macintosh/.test(ua)?'Mac':/Windows/.test(ua)?'Windows':/Linux/.test(ua)?'Linux':'device';
  const br=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Browser';
  const kind=/iPhone|iPad|Android/.test(ua)?'phone':'laptop';
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  return {id,kind,name:standalone?`App on ${os}`:`${br} on ${os}`};
}
const DEVICE=deviceInfo();
const ui={devices:[],syncErr:null,signingIn:false,authEmail:'',authErr:'',openDone:{},heatHabit:'',heatYear:today().getFullYear(),nowCol:0,tab:'today',date:key(today()),sheet:null,syncing:false,syncOk:false,confirm:null,undo:null};

/* ---------- habit logic ---------- */
function sched(h,d){return h.schedule.kind==='days'?h.schedule.days.includes(d.getDay()):true}
const target=h=>h.type==='count'?h.target:1;
const val=(h,k)=>(S.logs[k]&&S.logs[k][h.id])||0;
const isDone=(h,k)=>val(h,k)>=target(h);
const active=()=>S.habits.filter(h=>!h.archived);
const grpOf=h=>h.group||'Other';
function groups(){const base=[...(S.settings.groupOrder||DEFAULT_GROUPS)];S.habits.forEach(h=>{const g=grpOf(h);if(!base.includes(g))base.push(g)});return base}
function wkStart(d){return addDays(d,-((d.getDay()-S.settings.weekStart+7)%7))}
function weekCount(h,d){const s=wkStart(d);let n=0;for(let i=0;i<7;i++)if(isDone(h,key(addDays(s,i))))n++;return n}
function streak(h){
  const t=today(),c=fromKey(h.created);
  if(h.schedule.kind==='weekly'){
    let w=wkStart(t),n=0;
    if(weekCount(h,w)>=h.schedule.times)n=1;
    w=addDays(w,-7);
    while(w>=wkStart(c)&&weekCount(h,w)>=h.schedule.times){n++;w=addDays(w,-7)}
    return {n,u:'w'};
  }
  let d=t,n=0;
  if(sched(h,d)&&!isDone(h,key(d)))d=addDays(d,-1);
  while(d>=c){if(sched(h,d)){if(isDone(h,key(d)))n++;else break}d=addDays(d,-1)}
  return {n,u:'d'};
}
function best(h){
  const t=today();let d=fromKey(h.created),run=0,b=0;
  if(h.schedule.kind==='weekly'){
    for(let w=wkStart(d);w<=t;w=addDays(w,7)){if(weekCount(h,w)>=h.schedule.times){run++;b=Math.max(b,run)}else if(w<wkStart(t))run=0}
    return b;
  }
  for(;d<=t;d=addDays(d,1)){if(!sched(h,d))continue;const k=key(d);if(isDone(h,k)){run++;b=Math.max(b,run)}else if(+d!==+t)run=0}
  return b;
}
function rate(h,n){
  const t=today(),c=fromKey(h.created);
  if(h.schedule.kind==='weekly'){
    let met=0,tot=0;
    for(let i=1;i<=Math.floor(n/7);i++){const w=addDays(wkStart(t),-7*i);if(w<wkStart(c))break;tot++;if(weekCount(h,w)>=h.schedule.times)met++}
    return tot?met/tot:null;
  }
  let dn=0,tot=0;
  for(let i=0;i<n;i++){const d=addDays(t,-i);if(d<c)break;if(!sched(h,d))continue;const k=key(d);if(i===0&&!isDone(h,k))continue;tot++;if(isDone(h,k))dn++}
  return tot?dn/tot:null;
}
function dayFrac(d){
  const k=key(d);let dn=0,tot=0;
  active().forEach(h=>{if(h.schedule.kind==='weekly'||k<h.created||!sched(h,d))return;tot++;dn+=Math.min(1,val(h,k)/target(h))});
  return tot?dn/tot:null;
}
function schedLabel(h){
  const s=h.schedule;
  if(s.kind==='daily')return 'Every day';
  if(s.kind==='weekly')return `${s.times}× a week`;
  const ds=[...s.days].sort().join('');
  if(ds==='12345')return 'Weekdays';
  if(ds==='06')return 'Weekends';
  return [...s.days].sort((a,b)=>((a-S.settings.weekStart+7)%7)-((b-S.settings.weekStart+7)%7)).map(i=>WD[i]).join(', ');
}
function entries(){let n=0;for(const k in S.logs)for(const id in S.logs[k])if(S.logs[k][id])n++;return n}
function ago(ts){
  if(!ts)return 'never';
  const s=(Date.now()-ts)/1000;
  if(s<60)return 'just now';
  if(s<3600)return `${Math.floor(s/60)} min ago`;
  if(s<86400)return `${Math.floor(s/3600)} h ago`;
  const d=Math.floor(s/86400);return d===1?'yesterday':`${d} days ago`;
}
function setVal(h,k,v){
  S.logs[k]=S.logs[k]||{};
  if(v)S.logs[k][h.id]=v;else{delete S.logs[k][h.id];if(!Object.keys(S.logs[k]).length)delete S.logs[k]}
  (S.lts[k]=S.lts[k]||{})[h.id]=now();
  (S.dirty.cells[k]=S.dirty.cells[k]||{})[h.id]=1;
  save();
}
function tap(h,k){
  const prev=val(h,k);
  const next=h.type==='count'?(prev>=h.target?0:prev+1):(prev?0:1);
  setVal(h,k,next);
  ui.undo={id:h.id,k,prev};
  if(h.type==='check'||next===0||next>=h.target)
    toast(next===0?`${h.name} cleared`:`${h.name} done`+(k!==key(today())?` for ${fmtShort(fromKey(k))}`:''),true);
  else toast(`${h.name}: ${next} / ${h.target} ${h.unit||''}`,true);
}
const fmtShort=d=>`${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()].slice(0,3)}`;

/* ---------- theme ---------- */
const hostTheme=document.documentElement.getAttribute('data-theme');
function applyTheme(){
  const t=S.settings.theme,root=document.documentElement;
  if(t==='system'){hostTheme?root.setAttribute('data-theme',hostTheme):root.removeAttribute('data-theme')}
  else root.setAttribute('data-theme',t);
}

/* ---------- render ---------- */
const $=s=>document.querySelector(s);
function renderHeader(){
  const b=$('#syncBtn');
  b.className='sync-btn'+(ui.syncing?' spin':'')+(ui.syncOk?' ok':'');
  b.innerHTML=ui.syncOk?I.check.replace('class="ck"',''):I.sync;
  b.title=!configured?'Sync is not set up':!S.sync.uid?'Sign in to sync':ui.syncing?'Syncing…':ui.syncErr||`Synced ${ago(S.sync.lastSync)}`;
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.v===ui.tab));
  $('#setBtn').classList.toggle('active',ui.tab==='settings');
}
function render(){
  renderHeader();
  const v=$('#view');
  v.className='gut view-'+ui.tab;
  v.innerHTML=ui.tab==='today'?viewToday():ui.tab==='stats'?viewStats():viewSettings();
  const hw=v.querySelector('.heat-wrap');
  if(hw)hw.scrollLeft=ui.nowCol?Math.max(0,32+(ui.nowCol-1)*(innerWidth>=900?17:16)-hw.clientWidth+50):0;
  renderSheet();
}
function checkBtn(h,k){
  const v=val(h,k),tg=target(h),done=v>=tg;
  const C=2*Math.PI*15,off=C*(1-Math.min(1,v/tg));
  const label=h.type==='count'?`${h.name}: ${v} of ${tg}. Tap to add one`:`Mark ${h.name} ${done?'not done':'done'}`;
  return `<button class="h-check${done?' done':''}" style="--c:${h.color}" data-act="toggle" data-id="${h.id}" data-k="${k}" aria-label="${esc(label)}" aria-pressed="${done}">
    <svg class="ring" viewBox="0 0 34 34"><circle class="tr" cx="17" cy="17" r="15"/><circle class="pr" cx="17" cy="17" r="15" stroke-dasharray="${C}" stroke-dashoffset="${h.type==='count'?off:C}"/></svg>
    ${done?I.check:(h.type==='count'?`<span class="cnt num">${v}/${tg}</span>`:'')}
  </button>`;
}
function habitRow(h,d){
  const k=key(d),st=streak(h);
  let meta=[];
  if(h.schedule.kind==='weekly')meta.push(`${weekCount(h,d)} of ${h.schedule.times} this week`);
  else if(h.schedule.kind!=='daily')meta.push(schedLabel(h));
  const v=val(h,k),tg=target(h),done=v>=tg;
  if(h.type==='count')meta.unshift(`<span class="num cnt2">${v}/${tg}</span>`);
  return `<div class="habit${done?' is-done':''}" data-hid="${h.id}" style="--c:${h.color}${h.type==='count'&&!done?`;--p:${Math.round(v/tg*100)}%`:''}">
    <button class="h-ico" data-act="open" data-id="${h.id}" aria-label="${esc(h.name)}: history">${esc(h.icon)}</button>
    <button class="h-main" data-act="toggle" data-id="${h.id}" data-k="${k}" aria-pressed="${done}" aria-label="${esc(h.name)}${h.type==='count'?`, ${v} of ${tg}. Tap to add one`:done?', done. Tap to undo':'. Tap to check off'}">
      <span class="h-text"><span class="h-name">${esc(h.name)}</span>${meta.length?`<span class="h-meta">${meta.join('<span aria-hidden="true">·</span>')}</span>`:''}</span>
    </button>
  </div>`;
}
function rowsHTML(a,d){return a.map(h=>habitRow(h,d)).join('')}
function viewEmpty(){
  return `<div class="card blk empty">
    <h2>Start your habit list</h2>
    <p class="hint">Load your starter list of ${STARTER.length} habits in 4 sections, or add habits one by one. You can edit everything later.</p>
    <div class="inl"><button class="btn pri" data-act="starter">Load starter list</button><button class="btn" data-act="new">New habit</button></div>
    ${configured&&!S.sync.uid?'<p class="notice">Already use Habit Log on another device? <button data-act="tab" data-v="settings" style="color:var(--accent);font-weight:600">Sign in</button> to bring your habits here.</p>':''}
  </div>`;
}
function viewToday(){
  if(!S.habits.length)return viewEmpty();
  const t=today(),d=fromKey(ui.date),k=ui.date;
  let strip='';
  for(let i=6;i>=0;i--){
    const x=addDays(t,-i),xk=key(x),f=dayFrac(x);
    strip+=`<button class="day${xk===k?' sel':''}${i===0?' today':''}" data-act="day" data-v="${xk}" aria-label="${fmtShort(x)}"><small>${i===0?'Today':WD[x.getDay()]}</small><b class="num">${x.getDate()}</b><span class="bar"><span style="width:${Math.round((f||0)*100)}%"></span></span></button>`;
  }
  const hs=active().filter(h=>h.created<=k);
  const due=hs.filter(h=>sched(h,d)),off=hs.filter(h=>!sched(h,d));
  const doneN=due.filter(h=>isDone(h,k)||(h.schedule.kind==='weekly'&&weekCount(h,d)>=h.schedule.times)).length;
  const pct=due.length?Math.round(doneN/due.length*100):0;
  const isT=k===key(t);
  const pend=due.filter(h=>!isDone(h,k)),doneL=due.filter(h=>isDone(h,k));
  return `
    <div class="days">${strip}</div>
    <div>
      <div class="sum"><h1>${isT?'Today':fmtShort(d)}</h1><span>${MON[d.getMonth()]} ${d.getDate()}</span><span class="p num">${doneN} / ${due.length} done</span></div>
      <div class="prog"><span style="width:${pct}%"></span></div>
    </div>
    ${!due.length?`<div class="card blk"><p class="hint">No habits scheduled for this day.</p></div>`
      :groups().map(g=>{
          const all=due.filter(h=>grpOf(h)===g);if(!all.length)return '';
          const pg=all.filter(h=>!isDone(h,k)),dn=all.length-pg.length,c=S.settings.collapsed[g];
          const fold=pg.length?!!c:!ui.openDone[g+'|'+k];
          return `<section class="grp" data-g="${esc(g)}"><button class="grp-h${pg.length?'':' alld'}" data-act="grp" data-v="${esc(g)}" data-alld="${pg.length?0:1}" data-day="${k}" data-fold="${fold?1:0}" aria-expanded="${!fold}">
            ${pg.length?(fold?I.right:I.down):I.check}<b>${esc(g)}</b><span class="num">${dn}/${all.length}</span><span class="gbar"><span style="width:${Math.round(dn/all.length*100)}%"></span></span></button>
            ${fold?'':`<div class="card"><div class="list">${rowsHTML(all,d)}</div></div>`}</section>`}).join('')}
    ${off.length?`<div class="off-list"><p class="sect-h">Not scheduled ${isT?'today':'this day'}</p><div class="card"><div class="list">${rowsHTML(off,d)}</div></div></div>`:''}
    <button class="add" data-act="new">${I.plus}New habit</button>
    ${isT?'<p class="hint" style="text-align:center;font-size:12px;margin-top:-8px">Tap a habit to check it off · tap its icon for history · hold to reorder</p>':''}
    ${!isT?`<p class="hint" style="text-align:center">Editing a past day. <button data-act="day" data-v="${key(t)}" style="color:var(--accent);font-weight:600">Back to today</button></p>`:''}`;
}
const lvl=f=>f===null||f===0?'':f<.34?'l1':f<.67?'l2':f<1?'l3':'l4';
function heatGrid(Y,cell,act){
  const t=today(),dec31=new Date(Y,11,31);
  let html='',col=1,nowCol=0;
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach((w,r)=>html+=`<span class="wl" style="grid-row:${r+2}">${w}</span>`);
  for(let w=wkStart(new Date(Y,0,1));w<=dec31;w=addDays(w,7)){
    col++;
    for(let r=0;r<7;r++){
      const x=addDays(w,r);
      if(x.getFullYear()!==Y){html+=`<span style="grid-column:${col};grid-row:${r+2}"></span>`;continue}
      const c=cell(x),k=key(x),isNow=+x===+t;
      if(isNow)nowCol=col;
      const click=act&&x<=t&&c.c!=='pre';
      html+=`<i class="${c.c}${isNow?' now':''}" style="grid-column:${col};grid-row:${r+2}" title="${c.title}"${click?` data-act="${act}" data-k="${k}" role="button" aria-label="${c.title}"`:''}></i>`;
    }
    const fm=[...Array(7)].map((_,r)=>addDays(w,r)).find(x=>x.getFullYear()===Y&&x.getDate()===1);
    if(fm)html+=`<span class="ml" style="grid-column:${col+(fm.getDay()===1?0:1)}/span 3">${MON[fm.getMonth()].slice(0,3)}</span>`;
  }
  return {html,nowCol};
}
function viewStats(){
  const t=today(),N=30;
  const HH=ui.heatHabit&&S.habits.find(h=>h.id===ui.heatHabit);
  let bars='',sum=0,cnt=0;
  for(let i=N-1;i>=0;i--){const x=addDays(t,-i),f=dayFrac(x);if(f!==null&&!(i===0&&f<1)){sum+=f;cnt++}bars+=`<i class="${i===0?'t':''}" style="height:${Math.round((f||0)*100)}%" title="${fmtShort(x)}: ${f===null?'—':Math.round(f*100)+'%'}"></i>`}
  let k1='',k2='',k2sub='';const avg=cnt?Math.round(sum/cnt*100):0;
  if(HH){const r=rate(HH,N),st=streak(HH);k1=r===null?'—':Math.round(r*100)+'%';k2=st.n+st.u;k2sub=`best ${best(HH)}${st.u}`}
  const minY0=Math.min(...(HH?[HH]:S.habits).map(h=>+h.created.slice(0,4)),t.getFullYear());if(ui.heatYear<minY0)ui.heatYear=minY0;
  const Y=ui.heatYear,minY=Math.min(...(HH?[HH]:S.habits).map(h=>+h.created.slice(0,4)),t.getFullYear());
  const hg=heatGrid(Y,x=>{
    const lab=fmtShort(x)+' '+Y;
    if(x>t)return{c:'fut',title:lab};
    if(HH){const k=key(x),v=val(HH,k),tg=target(HH);
      if(k<HH.created)return{c:'pre',title:lab};
      if(!sched(HH,x))return{c:'off'+(v?' l4':''),title:lab+': not scheduled'};
      return{c:lvl(v/tg),title:`${lab}: ${v>=tg?'done':'not done'}`};}
    const f=dayFrac(x);return{c:lvl(f),title:`${lab}: ${f===null?'—':Math.round(f*100)+'% done'}`}});
  ui.nowCol=hg.nowCol;
  const opts=`<option value="">All habits</option>`+groups().map(g=>{const hs=active().filter(h=>grpOf(h)===g);return hs.length?`<optgroup label="${esc(g)}">${hs.map(h=>`<option value="${h.id}"${ui.heatHabit===h.id?' selected':''}>${esc(h.icon+' '+h.name)}</option>`).join('')}</optgroup>`:''}).join('');
  const s0=addDays(t,-(N-1));
  return `
    <select id="heatSel" class="hsel" aria-label="Show stats for">${opts}</select>
    ${HH?`<div class="kpis">
      <div class="card kpi"><small>30-day rate</small><b class="num">${k1}</b><em>scheduled days</em></div>
      <div class="card kpi"><small>Current streak</small><b class="num">${k2}</b><em>${k2sub}</em></div>
    </div>`:`<div class="card chart">
      <div class="chart-h"><b>Daily completion</b><span>last ${N} days · avg <b class="num" style="color:var(--fg)">${avg}%</b></span></div>
      <div class="bars"><span class="y50">50%</span>${bars}</div>
      <div class="axis"><span>${fmtShort(s0)}</span><span>Today</span></div>
    </div>`}
    <div class="card cal-card">
      <div class="chart-h" style="align-items:center"><p class="sect-h" style="margin:0">Activity calendar</p><div class="yr"><button data-act="yr" data-v="-1" ${Y<=minY?'disabled':''} aria-label="Previous year">${I.left}</button><b class="num">${Y}</b><button data-act="yr" data-v="1" ${Y>=t.getFullYear()?'disabled':''} aria-label="Next year">${I.right}</button></div></div>
      <div class="heat-wrap"><div class="heat">${hg.html}</div></div>
    </div>`;
}
function viewSettings(){
  const sy=S.sync;
  let syncCard;
  if(!configured)syncCard=`<div class="blk"><div class="acct"><div class="t"><b>Sync is not set up</b><span>Your habits are saved on this device only. Add your Firebase settings to turn on sync between devices.</span></div></div></div>`;
  else if(!sy.uid)syncCard=`<form class="blk auth" id="authForm" autocomplete="on">
      <div class="t"><b>Sign in to sync</b><span class="hint">Your habits are saved on this device. Sign in with the same account on your phone and laptop to keep them in sync.</span></div>
      <input type="email" id="au-email" placeholder="Email" autocomplete="username" value="${esc(ui.authEmail)}" required>
      <input type="password" id="au-pass" placeholder="Password (at least 6 characters)" autocomplete="current-password" minlength="6" required>
      ${ui.authErr?`<p class="err" style="margin:0">${esc(ui.authErr)}</p>`:''}
      <div class="inl"><button class="btn pri" type="submit" ${ui.signingIn?'disabled':''}>${ui.signingIn?'Please wait…':'Sign in'}</button><button class="btn" type="button" data-act="signup" ${ui.signingIn?'disabled':''}>Create account</button><button class="link-plain" type="button" data-act="reset-pw">Forgot password?</button></div>
    </form>`;
  else syncCard=`
    <div class="blk">
      <div class="acct"><div class="t"><b>${esc(sy.email)}</b><span>${ui.syncing?'Syncing…':ui.syncErr?`<span class="offline">${esc(ui.syncErr)}</span>`:sy.lastSync?`Synced ${ago(sy.lastSync)}`:'Not synced yet'}</span></div><button class="btn" data-act="sync" ${ui.syncing?'disabled':''}>Sync</button></div>
      ${ui.confirm==='signout'?`<p class="hint">Sign out and remove data from this device? Your changes are synced first so nothing is lost.</p><div class="inl"><button class="btn dan-fill" data-act="signout-yes">Sign out</button><button class="btn" data-act="cancel">Cancel</button></div>`
      :`<div><button class="link-dan" data-act="signout">Sign out</button><p class="hint">Removes data from this device; your data on the server stays safe.</p></div>`}
    </div>`;
  const list=[...ui.devices].sort((a,b)=>(b.id===DEVICE.id)-(a.id===DEVICE.id)||(b.last||0)-(a.last||0));
  const devs=list.length?list.map(d=>{const cur=d.id===DEVICE.id;return `
    <div class="row"><span class="dev-ico">${I[d.kind==='phone'?'phone':'laptop']}</span><span class="t"><b>${esc(d.name||'Device')}${cur?'<span class="tag">this device</span>':''}</b><span>Last synced ${ago(d.last)}</span></span>
    ${cur?'':(ui.confirm==='dev-'+d.id?`<button class="btn dan-fill" data-act="dev-rm" data-id="${esc(d.id)}">Remove</button>`:`<button class="btn dan" data-act="dev-ask" data-id="${esc(d.id)}">Remove</button>`)}</div>`}).join('')
    :'<div class="blk"><p class="hint">Tap Sync to see the devices that use this account.</p></div>';
  return `
    <section><p class="sect-h">Sync</p><div class="card">${syncCard}</div></section>
    ${sy.uid?`<section><p class="sect-h">Devices</p><div class="card">${devs}</div></section>`:''}
    <section><p class="sect-h">Habits</p><div class="card">
      <button class="row" data-act="manage"><span class="t"><b>Archived habits</b><span>${S.habits.length-active().length} archived · restore anytime</span></span>${I.chev}</button>
    </div></section>
    <section><p class="sect-h">Data</p><div class="card">
      <button class="row" data-act="export"><span class="t"><b>Export CSV</b><span><span class="num">${entries()}</span> entries · open in Excel or Google Sheets</span></span>${I.chev}</button>
      <button class="row" data-act="backup"><span class="t"><b>Backup (JSON)</b><span>${S.lastBackup?`Last backup ${ago(S.lastBackup)}`:'Never backed up'}</span></span>${I.chev}</button>
      <button class="row" data-act="restore"><span class="t"><b>Restore from backup</b><span>Choose a backup .json file</span></span>${I.chev}</button>
    </div><p class="hint" style="margin:8px 2px 0">Back up once a month and keep the file in Google Drive.</p></section>
    <section><p class="sect-h">About</p><div class="card">
      <button class="row" data-act="install"><span class="t"><b>Install on your phone or laptop</b><span>Open Habit Log like a normal app</span></span>${I.chev}</button>
      <div class="row"><span class="t"><b>Habit Log</b><span>Version 1.0${navigator.onLine?'':' · offline'}</span></span></div>
    </div></section>`;
}

/* ---------- sheets ---------- */
function renderSheet(){
  const root=$('#sheetRoot'),s=ui.sheet;
  if(!s){root.innerHTML='';return}
  let body='';
  if(s.kind==='detail')body=sheetDetail(s);
  else if(s.kind==='form')body=sheetForm(s);
  else if(s.kind==='text')body=sheetText(s);
  else if(s.kind==='restore')body=sheetRestore(s);
  else if(s.kind==='manage')body=sheetManage();
  else if(s.kind==='install')body=sheetInstall();
  const keepScroll=root.querySelector('.sheet')?.scrollTop||0;
  const oldHw=root.querySelector('.heat-wrap'),oldKey=root.dataset.hk,newKey=s.kind+(s.id||'')+(s.year||'');
  const hx=oldHw&&oldKey===newKey?oldHw.scrollLeft:null;
  const fresh=!root.querySelector('.backdrop');
  root.innerHTML=`<div class="backdrop${fresh?' anim':''}" data-act="bd"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${body}</div></div>`;
  root.dataset.hk=newKey;
  root.querySelector('.sheet').scrollTop=keepScroll;
  const hw=root.querySelector('.heat-wrap');
  if(hw)hw.scrollLeft=hx!==null?hx:(s.nowCol?Math.max(0,32+(s.nowCol-1)*16-hw.clientWidth+50):hw.scrollWidth);
}
const head=(title,sub,extra='',tools='')=>`<div class="sh-head">${extra}<h2>${title}${sub?`<small>${sub}</small>`:''}</h2>${tools}<button class="x" data-act="close" aria-label="Close">${I.x}</button></div>`;
function sheetDetail(s){
  const h=S.habits.find(x=>x.id===s.id);if(!h)return '';
  const st=streak(h),r=rate(h,30),t=today();
  let total=0;for(const k in S.logs)if(isDone(h,k))total++;
  const m=s.month||new Date(t.getFullYear(),t.getMonth(),1);
  let cells=[...Array(7)].map((_,i)=>`<span class="wd">${WD[(i+1)%7].slice(0,2)}</span>`).join('');
  const lead=(new Date(m.getFullYear(),m.getMonth(),1).getDay()+6)%7;
  for(let i=0;i<lead;i++)cells+='<span></span>';
  const dim=new Date(m.getFullYear(),m.getMonth()+1,0).getDate();
  for(let i=1;i<=dim;i++){
    const d=new Date(m.getFullYear(),m.getMonth(),i),k=key(d),v=val(h,k);
    let c=d>t?'fut':k<h.created?'pre':isDone(h,k)?'done':v>0?'part':!sched(h,d)?'off':'miss';
    if(+d===+t)c+=' today';
    cells+=`<button class="${c}" data-act="cal" data-k="${k}" ${d>t||k<h.created?'disabled':''} aria-label="${fmtShort(d)}${isDone(h,k)?', done':', not done'}"><span class="num">${i}</span></button>`;
  }
  const canNext=new Date(m.getFullYear(),m.getMonth()+1,1)<=t;
  const del=ui.confirm==='del-'+h.id;
  return `${head(esc(h.name),[h.schedule.kind!=='daily'?schedLabel(h):'',h.type==='count'?`${h.target} ${esc(h.unit||'')} a day`:''].filter(Boolean).concat(h.desc?[esc(h.desc)]:[]).join(' · '),`<span class="h-ico" style="--c:${h.color}">${esc(h.icon)}</span>`,
    `<button class="x" data-act="edit" data-id="${h.id}" aria-label="Edit" title="Edit">${I.edit}</button><button class="x" data-act="archive" data-id="${h.id}" aria-label="${h.archived?'Unarchive':'Archive'}" title="${h.archived?'Unarchive':'Archive'}">${I.archive}</button><button class="x xd${del?' on':''}" data-act="del" data-id="${h.id}" aria-label="Delete" title="Delete">${I.trash}</button>`)}
    <div class="mini">
      <div><small>Streak</small><b class="num">${st.n}${st.u}</b></div>
      <div><small>Best</small><b class="num">${best(h)}${st.u}</b></div>
      <div><small>30 days</small><b class="num">${r===null?'—':Math.round(r*100)+'%'}</b></div>
      <div><small>Days done</small><b class="num">${total}</b></div>
    </div>
    <div style="--c:${h.color}">
      <div class="cal-h"><button data-act="mon" data-v="-1" aria-label="Previous month">${I.left}</button><b>${MON[m.getMonth()]} ${m.getFullYear()}</b><button data-act="mon" data-v="1" aria-label="Next month" ${canNext?'':'disabled style="opacity:.3"'}>${I.right}</button></div>
      <div class="cal">${cells}</div>
      <p class="cal-note">Tap a day to check or uncheck it. Grey days were missed.</p>
    </div>
    ${del?`<p class="hint" style="margin-top:12px;text-align:center">Delete <b>${esc(h.name)}</b> and all ${total} check-ins? This can't be undone. Archive keeps the history.</p>
      <div class="sh-actions"><button class="btn dan-fill" data-act="del-yes" data-id="${h.id}">Delete forever</button><button class="btn" data-act="cancel">Cancel</button></div>`:''}`;
}
function sheetForm(s){
  const d=s.draft,sc=d.schedule;
  return `${head(s.id?'Edit habit':'New habit','')}
    <div class="fld"><label for="f-name">Name</label><input type="text" id="f-name" value="${esc(d.name)}" placeholder="Short name, e.g. No food 2h" maxlength="24" autocomplete="off"></div>
    <div class="fld"><label for="f-desc">Description <span style="text-transform:none;letter-spacing:0;font-weight:400">(optional)</span></label><input type="text" id="f-desc" value="${esc(d.desc||'')}" placeholder="e.g. No eating 2 hours before sleep" maxlength="80" autocomplete="off"></div>
    <div class="fld"><span class="lbl">Icon</span><div class="icons">${ICONS.map(x=>`<button class="${d.icon===x?'on':''}" data-act="d-icon" data-v="${x}" aria-label="Icon ${x}">${x}</button>`).join('')}</div></div>
    <div class="fld"><span class="lbl">Color</span><div class="colors">${COLORS.map(c=>`<button class="${d.color===c?'on':''}" style="--c:${c}" data-act="d-color" data-v="${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>
    <div class="fld"><span class="lbl">Goal</span>
      <div class="seg"><button class="${d.type==='check'?'on':''}" data-act="d-type" data-v="check">Yes / No</button><button class="${d.type==='count'?'on':''}" data-act="d-type" data-v="count">Count</button></div>
      ${d.type==='count'?`<div class="inl"><input type="number" id="f-target" min="2" max="999" value="${d.target}" aria-label="Target per day"><input type="text" id="f-unit" value="${esc(d.unit)}" placeholder="unit, e.g. glasses" maxlength="16" aria-label="Unit"><span class="hint">per day</span></div>`:''}
    </div>
    <div class="fld"><span class="lbl">Section</span>
      <div class="chips gchips">${groups().map(g=>`<button class="${d.group===g?'on':''}" data-act="d-grp" data-v="${esc(g)}">${esc(g)}</button>`).join('')}<input type="text" id="f-grp" value="${groups().includes(d.group)?'':esc(d.group)}" placeholder="+ New section" maxlength="20" autocomplete="off" aria-label="New section"></div>
    </div>
    <div class="fld"><span class="lbl">Repeat</span>
      <div class="seg"><button class="${sc.kind==='daily'?'on':''}" data-act="d-sched" data-v="daily">Every day</button><button class="${sc.kind==='days'?'on':''}" data-act="d-sched" data-v="days">Some days</button><button class="${sc.kind==='weekly'?'on':''}" data-act="d-sched" data-v="weekly">Times a week</button></div>
      ${sc.kind==='days'?`<div class="chips">${[...Array(7)].map((_,i)=>{const w=(i+S.settings.weekStart)%7;return `<button class="${sc.days.includes(w)?'on':''}" data-act="d-day" data-v="${w}" aria-pressed="${sc.days.includes(w)}">${WD[w].slice(0,2)}</button>`}).join('')}</div>`:''}
      ${sc.kind==='weekly'?`<div class="inl"><input type="number" id="f-times" min="1" max="6" value="${sc.times}" aria-label="Times per week"><span class="hint">times a week, any days</span></div>`:''}
    </div>
    ${s.err?`<p class="err">${s.err}</p>`:''}
    <div class="sh-actions"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="save">${s.id?'Save':'Add habit'}</button></div>`;
}
function sheetText(s){
  return `${head(s.title,s.sub)}
    <textarea id="txt" readonly spellcheck="false">${esc(s.text)}</textarea>
    <p class="cal-note">${s.note}</p>
    <div class="sh-actions"><button class="btn" data-act="close">Close</button><button class="btn pri" data-act="copy">${s.copied?'Copied':'Copy'}</button></div>`;
}
function sheetRestore(s){
  const o=s.data;let n=0;for(const k in o.logs)n+=Object.keys(o.logs[k]).length;
  return `${head('Restore from backup',esc(s.file))}
    <div class="card blk"><div class="acct"><span class="dev-ico">${I.restore}</span><div class="t"><b>${o.habits.length} habits · ${n} entries</b><span>Backup made ${o.exportedAt?new Date(o.exportedAt).toLocaleString():'at an unknown date'}</span></div></div></div>
    <p class="hint" style="margin-top:12px">This replaces all habits and check-ins on this device. The next sync sends the restored data to your other devices.</p>
    <div class="sh-actions"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="restore-yes">Replace data</button></div>`;
}
function sheetInstall(){
  return `${head('Install Habit Log','Works offline. Your data stays on the device until you sync.')}
    <div class="card">
      <div class="row"><span class="dev-ico">${I.phone}</span><span class="t"><b>Android (Chrome)</b><span>Tap the ⋮ menu, then <b>Install app</b> or <b>Add to Home screen</b>.</span></span></div>
      <div class="row"><span class="dev-ico">${I.phone}</span><span class="t"><b>iPhone (Safari)</b><span>Tap Share, then <b>Add to Home Screen</b>. Always open the app from that icon.</span></span></div>
      <div class="row"><span class="dev-ico">${I.laptop}</span><span class="t"><b>Laptop (Chrome or Edge)</b><span>Click the install icon at the right end of the address bar.</span></span></div>
    </div>`;
}
function sheetManage(){
  const arc=S.habits.filter(h=>h.archived);
  return `${head('Archived habits','History is kept. Unarchive to show it on Today again.')}
    ${arc.length?`<div>${arc.map(h=>`<div class="mrow" style="--c:${h.color}"><span class="h-ico">${esc(h.icon)}</span><b>${esc(h.name)}</b><button class="btn" data-act="archive" data-id="${h.id}">Unarchive</button></div>`).join('')}</div>`:'<p class="hint">No archived habits. Archive one from its detail page.</p>'}`;
}

/* ---------- toast ---------- */
let tt;
function toast(msg,undo){
  const r=$('#toastRoot');clearTimeout(tt);
  r.innerHTML=`<div class="toast" role="status"><span>${esc(msg)}</span>${undo?'<button data-act="undo">Undo</button>':''}</div>`;
  tt=setTimeout(()=>{r.innerHTML='';ui.undo=null},3500);
}

/* ---------- actions ---------- */
function readDraft(){
  const s=ui.sheet;if(!s||s.kind!=='form')return;
  const d=s.draft,g=id=>document.getElementById(id);
  if(g('f-name'))d.name=g('f-name').value;
  if(g('f-desc'))d.desc=g('f-desc').value;
  if(g('f-grp')&&g('f-grp').value.trim())d.group=g('f-grp').value.trim();
  if(g('f-target'))d.target=parseInt(g('f-target').value)||d.target;
  if(g('f-unit'))d.unit=g('f-unit').value;
  if(g('f-times'))d.schedule.times=Math.min(6,Math.max(1,parseInt(g('f-times').value)||1));
}
function errMsg(e){
  const c=(e&&e.code)||'';
  if(c.includes('permission-denied')||c.includes('unauthenticated'))return 'Sync was refused. Sign out and sign in again.';
  if(c.includes('unavailable')||c.includes('network')||!navigator.onLine)return "Couldn't reach the server. Your changes are saved; try again when you're online.";
  return 'Sync failed. Try again in a moment.';
}
async function doSync(quiet){
  if(ui.syncing)return;
  if(!configured){if(!quiet)toast('Sync is not set up yet. Add your Firebase settings first.');return}
  if(!S.sync.uid){if(!quiet){toast('Sign in to sync between devices');ui.tab='settings';render()}return}
  if(!navigator.onLine){if(!quiet)toast("You're offline. Your changes are saved and will sync later.");return}
  ui.syncing=true;ui.syncErr=null;renderHeader();if(ui.tab==='settings'&&!drag)render();
  try{
    const r=await syncNow(S,await backend(S.sync.uid),DEVICE);
    ui.devices=r.devices;ui.syncOk=true;await flush();
    if(!quiet)toast('Synced');
    setTimeout(()=>{ui.syncOk=false;renderHeader()},1600);
  }catch(e){console.error(e);ui.syncErr=errMsg(e);if(!quiet)toast(ui.syncErr)}
  ui.syncing=false;
  if(!drag)render();else renderHeader();
}
async function authAct(a){
      const email=($('#au-email')?.value||'').trim(),pw=$('#au-pass')?.value||'';
      ui.authEmail=email;ui.authErr='';
      if(!email||pw.length<6){ui.authErr='Enter your email and a password of at least 6 characters.';render();return}
      ui.signingIn=true;render();
      try{
        const u=await (a==='signup'?signUp:signIn)(email,pw);
        S.sync.uid=u.uid;S.sync.email=u.email;await flush();ui.signingIn=false;ui.authErr='';
        toast(a==='signup'?'Account created':'Signed in');await doSync(true);
      }catch(e){ui.authErr=e.message}
      ui.signingIn=false;render();
}
function download(name,text,type){
  const blob=new Blob([text],{type});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  const a=el.dataset.act,id=el.dataset.id,v=el.dataset.v;
  if(a==='bd'&&e.target!==el)return;
  readDraft();
  const H=id&&S.habits.find(h=>h.id===id);
  switch(a){
    case 'tab':ui.tab=v;ui.confirm=null;window.scrollTo(0,0);break;
    case 'sync':doSync(false);return;
    case 'starter':S.habits=STARTER.map((x,i)=>({id:newId(),...x,type:'check',schedule:{kind:'daily'},created:key(today()),pos:i}));S.habits.forEach(touchHabit);S.settings.groupOrder=[...DEFAULT_GROUPS];touchSettings();save();toast(`${S.habits.length} habits added`);break;
    case 'install':ui.sheet={kind:'install'};break;
    case 'day':ui.date=v;break;
    case 'toggle':tap(H,el.dataset.k);break;
    case 'open':ui.confirm=null;ui.sheet={kind:'detail',id,month:new Date(fromKey(ui.date).getFullYear(),fromKey(ui.date).getMonth(),1)};break;
    case 'mon':{const m=ui.sheet.month;ui.sheet.month=new Date(m.getFullYear(),m.getMonth()+ +v,1);break}
    case 'cal':tap(S.habits.find(h=>h.id===ui.sheet.id),el.dataset.k);break;
    case 'bd':case 'close':ui.sheet=null;ui.confirm=null;break;
    case 'new':ui.sheet={kind:'form',draft:{name:'',group:'Self',icon:ICONS[0],color:COLORS[0],type:'check',target:8,unit:'',schedule:{kind:'daily',days:[1,2,3,4,5],times:3}}};break;
    case 'edit':ui.sheet={kind:'form',id,draft:JSON.parse(JSON.stringify(Object.assign({target:8,unit:'',group:'Self'},H,{schedule:Object.assign({days:[1,2,3,4,5],times:3},H.schedule)})))};break;
    case 'd-grp':ui.sheet.draft.group=v;break;
    case 'd-icon':ui.sheet.draft.icon=v;break;
    case 'd-color':ui.sheet.draft.color=v;break;
    case 'd-type':ui.sheet.draft.type=v;break;
    case 'd-sched':ui.sheet.draft.schedule.kind=v;break;
    case 'd-day':{const ds=ui.sheet.draft.schedule.days,w=+v,i=ds.indexOf(w);i<0?ds.push(w):ds.splice(i,1);break}
    case 'save':{
      const s=ui.sheet,d=s.draft;
      if(!d.name.trim()){s.err='Give the habit a name.';break}
      if(d.schedule.kind==='days'&&!d.schedule.days.length){s.err='Pick at least one day.';break}
      if(d.type==='count'&&(!d.target||d.target<2)){s.err='A count goal needs a target of 2 or more.';break}
      const sc=d.schedule.kind==='daily'?{kind:'daily'}:d.schedule.kind==='days'?{kind:'days',days:[...d.schedule.days]}:{kind:'weekly',times:d.schedule.times};
      const obj={name:d.name.trim(),icon:d.icon,color:d.color,group:(d.group||'Self').trim(),desc:(d.desc||'').trim(),type:d.type,schedule:sc};
      if(d.type==='count'){obj.target=d.target;obj.unit=d.unit.trim()}
      if(s.id){const h=S.habits.find(x=>x.id===s.id);Object.assign(h,obj);touchHabit(h);toast('Habit saved')}
      else{const h=Object.assign({id:newId(),created:key(today()),pos:S.habits.length},obj);S.habits.push(h);touchHabit(h);toast(`${obj.name} added`)}
      save();ui.sheet=s.id?{kind:'detail',id:s.id,month:new Date(today().getFullYear(),today().getMonth(),1)}:null;break}
    case 'archive':H.archived=!H.archived;touchHabit(H);save();toast(H.archived?`${H.name} archived`:`${H.name} is back`);if(ui.sheet&&ui.sheet.kind==='detail')ui.sheet=null;break;
    case 'del':ui.confirm='del-'+id;break;
    case 'del-yes':S.habits=S.habits.filter(h=>h.id!==id);S.tomb[id]=now();S.dirty.habits[id]=1;
      for(const k in S.logs){delete S.logs[k][id];if(!Object.keys(S.logs[k]).length)delete S.logs[k]}
      for(const k in S.lts)delete S.lts[k][id];for(const k in S.dirty.cells)delete S.dirty.cells[k][id];save();ui.sheet=null;ui.confirm=null;toast('Habit deleted');break;
    case 'cancel':ui.confirm=null;break;
    case 'undo':if(ui.undo){const u=ui.undo,h=S.habits.find(x=>x.id===u.id);if(h)setVal(h,u.k,u.prev);ui.undo=null;$('#toastRoot').innerHTML=''}break;
    case 'signout':ui.confirm='signout';break;
    case 'signout-yes':(async()=>{
      if(isDirty(S))await doSync(true);
      if(isDirty(S)){toast("Couldn't sync your latest changes. Connect to the internet, then sign out again.");return}
      try{await signOutUser()}catch(e){}
      await clearState();S=emptyState();ui.devices=[];ui.confirm=null;ui.tab='today';ui.sheet=null;render();toast('Signed out');
    })();return;
    case 'signup':authAct('signup');return;
    case 'reset-pw':(async()=>{
      const email=($('#au-email')?.value||'').trim();ui.authEmail=email;
      if(!email){ui.authErr='Type your email first, then tap Forgot password.';render();return}
      try{await resetPassword(email);ui.authErr='';toast(`Password reset email sent to ${email}`)}catch(e){ui.authErr=e.message}
      render();
    })();return;
    case 'dev-ask':ui.confirm='dev-'+id;break;
    case 'dev-rm':(async()=>{
      try{await (await backend(S.sync.uid)).removeDevice(id);ui.devices=ui.devices.filter(d=>d.id!==id);ui.confirm=null;render();toast('Device removed from the list')}
      catch(e){toast("Couldn't remove the device. Try again when you're online.")}
    })();return;
    case 'manage':ui.sheet={kind:'manage'};break;
    case 'yr':ui.heatYear+= +v;break;
    case 'grp':if(el.dataset.alld==='1'){const kk=v+'|'+el.dataset.day;ui.openDone[kk]=!ui.openDone[kk]}else{S.settings.collapsed[v]=!S.settings.collapsed[v];save()}break;
    case 'export':{
      const q=x=>`"${String(x).replace(/"/g,'""')}"`;
      const rows=['date,habit,section,value,target,done'];
      Object.keys(S.logs).sort().forEach(k=>{for(const hid in S.logs[k]){const h=S.habits.find(x=>x.id===hid);if(!h)continue;rows.push(`${k},${q(h.name)},${q(grpOf(h))},${S.logs[k][hid]},${target(h)},${S.logs[k][hid]>=target(h)?1:0}`)}});
      download(`habit-log-${key(today())}.csv`,'\ufeff'+rows.join('\r\n'),'text/csv;charset=utf-8');
      toast(`Exported ${rows.length-1} entries`);break}
    case 'backup':
      download(`habit-log-backup-${key(today())}.json`,JSON.stringify({app:'habit-log',version:2,exportedAt:new Date().toISOString(),habits:S.habits,logs:S.logs,settings:{groupOrder:S.settings.groupOrder}}),'application/json');
      S.lastBackup=now();save();toast('Backup saved. Keep the file somewhere safe, like Google Drive.');break;
    case 'restore':$('#restoreFile').value='';$('#restoreFile').click();return;
    case 'restore-yes':{
      const o=ui.sheet.data,t=now(),mark=(k,hid)=>{(S.lts[k]=S.lts[k]||{})[hid]=t;(S.dirty.cells[k]=S.dirty.cells[k]||{})[hid]=1};
      S.habits.forEach(h=>{if(!o.habits.some(x=>x.id===h.id)){S.tomb[h.id]=t;S.dirty.habits[h.id]=1}});
      for(const k in S.logs)for(const hid in S.logs[k])if(!(o.logs[k]&&o.logs[k][hid]))mark(k,hid);
      S.habits=o.habits.map((h,i)=>({...h,pos:i,ts:t}));
      S.habits.forEach(h=>{S.dirty.habits[h.id]=1;delete S.tomb[h.id]});
      S.logs=JSON.parse(JSON.stringify(o.logs));
      for(const k in S.logs)for(const hid in S.logs[k])mark(k,hid);
      if(o.settings&&Array.isArray(o.settings.groupOrder)){S.settings.groupOrder=o.settings.groupOrder;touchSettings()}
      save();ui.sheet=null;toast('Backup restored');break}
    default:return;
  }
  render();
});
document.addEventListener('change',e=>{
  if(e.target.id==='heatSel'){ui.heatHabit=e.target.value;render();return}
});
$('#restoreFile').addEventListener('change',e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const o=JSON.parse(r.result);
      if(!o||!Array.isArray(o.habits)||typeof o.logs!=='object')throw 0;
      ui.sheet={kind:'restore',data:o,file:f.name};render();
    }catch(err){toast("That file isn't a Habit Log backup. Choose the .json file from Backup.")}
  };
  r.readAsText(f);
});
document.addEventListener('submit',e=>{if(e.target.id==='authForm'){e.preventDefault();authAct('signin')}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.sheet){ui.sheet=null;ui.confirm=null;render()}});

/* ---------- hold to reorder ---------- */
let drag=null,suppress=false;
document.addEventListener('pointerdown',e=>{
  const gh=e.target.closest('#view .grp-h');
  if(gh&&e.button<=0){const sec=gh.closest('.grp');const st={row:sec,sec:true,x:e.clientX,y:e.clientY,on:false};
    st.timer=setTimeout(()=>{st.on=true;document.body.classList.add('sorting','sec-sorting');sec.classList.add('dragging');try{navigator.vibrate&&navigator.vibrate(15)}catch(_){}},450);
    drag=st;return}
  const row=e.target.closest('#view .habit');if(!row||e.button>0)return;
  const st={row,x:e.clientX,y:e.clientY,on:false};
  st.timer=setTimeout(()=>{st.on=true;row.classList.add('dragging');document.body.classList.add('sorting');try{navigator.vibrate&&navigator.vibrate(15)}catch(_){}},450);
  drag=st;
});
document.addEventListener('pointermove',e=>{
  if(!drag)return;
  if(!drag.on){if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8){clearTimeout(drag.timer);drag=null}return}
  e.preventDefault();
  if(drag.sec){const par=drag.row.parentElement;let before=null;
    for(const r of par.querySelectorAll(':scope > .grp')){if(r===drag.row)continue;const b=r.getBoundingClientRect();if(e.clientY<b.top+b.height/2){before=r;break}}
    if(!before){const all=[...par.querySelectorAll(':scope > .grp')];const last=all[all.length-1];if(last!==drag.row)last.after(drag.row)}
    else if(before!==drag.row.nextElementSibling)par.insertBefore(drag.row,before);
    return}
  let list=drag.row.parentElement;
  document.querySelectorAll('.grp.drop').forEach(x=>x.classList.remove('drop'));drag.fold=null;
  if(drag.row.closest('.grp')){
    const sec=[...document.querySelectorAll('#view .grp')].find(g=>{const b=g.getBoundingClientRect();return e.clientY>=b.top-4&&e.clientY<=b.bottom+4});
    if(sec){const l=sec.querySelector('.list');
      if(l)list=l;else if(sec!==drag.row.closest('.grp')){sec.classList.add('drop');drag.fold=sec;return}}
  }
  const items=[...list.querySelectorAll(':scope > .habit')];
  const over=items.find(r=>{if(r===drag.row)return false;const b=r.getBoundingClientRect();return e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom});
  if(!over)return;
  if(drag.row.parentElement!==list){list.insertBefore(drag.row,over);return}
  const all=[...list.children];
  if(all.indexOf(drag.row)<all.indexOf(over))over.after(drag.row);else list.insertBefore(drag.row,over);
},{passive:false});
document.addEventListener('touchmove',e=>{if(drag&&drag.on)e.preventDefault()},{passive:false});
function endDrag(){
  if(!drag)return;clearTimeout(drag.timer);
  const st=drag;drag=null;
  if(!st.on)return;
  suppress=true;setTimeout(()=>{suppress=false},400);
  document.body.classList.remove('sorting');st.row.classList.remove('dragging');
  document.querySelectorAll('.grp.drop').forEach(x=>x.classList.remove('drop'));
  if(st.sec){document.body.classList.remove('sec-sorting');
    const shown=[...document.querySelectorAll('#view .grp')].map(x=>x.dataset.g);
    const rest=groups().filter(g=>!shown.includes(g));
    const before=groups().join('|');S.settings.groupOrder=[...shown,...rest];
    if(S.settings.groupOrder.join('|')!==before){touchSettings();save();toast('Section order saved')}
    render();return}
  const me=S.habits.find(h=>h.id===st.row.dataset.hid);
  if(st.fold){
    const g=st.fold.dataset.g;me.group=g;S.habits.splice(S.habits.indexOf(me),1);
    let at=-1;S.habits.forEach((h,i)=>{if(grpOf(h)===g)at=i});S.habits.splice(at+1,0,me);
    touchHabit(me);touchOrder();save();toast(`Moved to ${g}`);render();return;
  }
  const sec=st.row.closest('.grp');let moved=false;
  if(sec&&grpOf(me)!==sec.dataset.g){me.group=sec.dataset.g;moved=true}
  const ids=[...st.row.parentElement.querySelectorAll('.habit')].map(r=>r.dataset.hid);
  const objs=ids.map(id=>S.habits.find(h=>h.id===id));
  const pos=objs.map(o=>S.habits.indexOf(o)).sort((a,b)=>a-b);
  const changed=pos.some((p,i)=>S.habits[p]!==objs[i]);
  pos.forEach((p,i)=>{S.habits[p]=objs[i]});
  if(changed||moved){if(moved)touchHabit(me);touchOrder();save();toast(moved?`Moved to ${me.group}`:'Order saved')}
  render();
}
document.addEventListener('pointerup',endDrag);
document.addEventListener('pointercancel',endDrag);
document.addEventListener('click',e=>{if(suppress){e.stopPropagation();e.preventDefault();suppress=false}},true);
document.addEventListener('contextmenu',e=>{if(e.target.closest('#view .habit,#view .grp-h'))e.preventDefault()});

async function boot(){
  const st=await loadState();
  if(st&&st.v===2){S=Object.assign(emptyState(),st);S.dirty=Object.assign(emptyDirty(),st.dirty||{});S.settings=Object.assign(emptyState().settings,st.settings||{})}
  S.settings.collapsed=S.settings.collapsed||{};
  applyTheme();render();
  askPersistent();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
  addEventListener('online',()=>{render();doSync(true)});
  addEventListener('offline',()=>render());
  if(!configured)return;
  try{
    const u=await currentUser();
    if(u){
      if(S.sync.uid&&S.sync.uid!==u.uid){await clearState();S=emptyState()}
      S.sync.uid=u.uid;S.sync.email=u.email;save();render();
      doSync(true);
    }else if(S.sync.uid){S.sync.uid=null;save();render()}
  }catch(e){console.warn('Auth check failed',e)}
}
boot();
