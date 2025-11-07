Neutralino.init();
const $ = (id) => document.getElementById(id);
let state = { tasks:[], subjects:[], links:[], cabinets:[], vault:[], pomodoro:{work:25,short:5,long:15} };
let runtime = { timer:{id:null,int:null}, pomo:{int:null,mode:'work',left:1500,run:false}, charts:{dash:null,time:null}, zIndex:10 };

async function save() { try { await Neutralino.storage.setData('bh_final',JSON.stringify(state)); } catch(e){console.error(e);} }
async function load() { try { let d=await Neutralino.storage.getData('bh_final'); if(d){state={...state,...JSON.parse(d)};state.tasks.forEach(t=>t.run=false);} } catch(e){} runtime.pomo.left=state.pomodoro[runtime.pomo.mode]*60; render(); }

function render() {
    $('current-date').textContent = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
    renLinks(); renSubj(); renTasks(); renCabs(); renVault(); renPomo(); renCharts();
}

// --- DRAG LOGIC ---
function initDrag() {
    let active = null, initialX, initialY, xOffset = 0, yOffset = 0;
    document.addEventListener('mousedown', (e) => {
        if (e.target.closest('.drag-handle')) {
            active = e.target.closest('.glass-panel');
            active.style.zIndex = ++runtime.zIndex; // Pop to front
            initialX = e.clientX - active.offsetLeft;
            initialY = e.clientY - active.offsetTop;
        } else if (e.target.closest('.glass-panel')) {
             e.target.closest('.glass-panel').style.zIndex = ++runtime.zIndex; // Click to front
        }
    });
    document.addEventListener('mouseup', () => { active = null; });
    document.addEventListener('mousemove', (e) => {
        if (active) {
            e.preventDefault();
            active.style.left = (e.clientX - initialX) + "px";
            active.style.top = (e.clientY - initialY) + "px";
        }
    });
}

// --- RENDERERS ---
function renLinks() { $('links-container').innerHTML = state.links.map(l=>`<li class="flex justify-between items-center p-2 bg-white/5 hover:bg-white/10 group rounded-none"><a href="${l.url}" class="text-blue-400 hover:underline text-xs truncate mr-2 flex-1">${l.title}</a><button data-id="${l.id}" class="del-link text-red-500 opacity-0 group-hover:opacity-100 px-2"><i class="fas fa-times"></i></button></li>`).join('')||'<li class="text-xs text-gray-500 italic p-2">No links.</li>'; }
function renSubj() { $('subject-list').innerHTML = state.subjects.map(s=>`<li class="flex justify-between items-center p-2 bg-white/5 hover:bg-white/10 group"><span class="text-xs font-medium">${s.name}</span><button data-id="${s.id}" class="del-subj text-red-500 opacity-0 group-hover:opacity-100 px-2"><i class="fas fa-times"></i></button></li>`).join(''); $('task-subject-select').innerHTML='<option value="">No Subject</option>'+state.subjects.map(s=>`<option value="${s.name}">${s.name}</option>`).join(''); }
function renTasks() {
    $('task-list').innerHTML = state.tasks.length?'':'<li class="text-gray-600 text-center p-8 italic">No active tasks.</li>';
    state.tasks.forEach(t=>{
        const li=document.createElement('li'); li.className='flex items-center justify-between bg-white/5 p-3 hover:bg-white/10 group'; li.dataset.id=t.id;
        li.innerHTML=`<div class="flex items-center gap-3 flex-1 min-w-0"><input type="checkbox" class="task-check w-4 h-4 bg-black/50 checked:bg-maroon" ${t.completed?'checked':''}><span class="text-sm ${t.completed?'line-through text-gray-600':'text-gray-200'} truncate">${t.text}</span></div><div class="flex items-center gap-3 shrink-0">${t.subject?`<span class="text-[10px] font-bold px-2 py-1 bg-black/30 text-blue-400 tracking-wider uppercase">${t.subject}</span>`:''}<span id="t-${t.id}" class="text-xs font-mono text-gray-500 timer-font">${fmt(t.timeSpent)}</span><button class="task-play ${t.run?'text-red-500':'text-green-500'} hover:scale-110 transition-transform"><i class="fas ${t.run?'fa-pause':'fa-play'}"></i></button><button class="task-log-time text-gray-600 hover:text-blue-400"><i class="fas fa-clock"></i></button><button class="task-notes text-gray-600 hover:text-blue-400"><i class="fas fa-align-left"></i></button><button class="task-del text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><i class="fas fa-trash"></i></button></div>`;
        $('task-list').appendChild(li);
    });
    renCharts();
}
function renCabs() { $('cabinets-container').innerHTML = state.cabinets.map(c=>`<div class="bg-white/5 p-3 border border-white/10"><details class="group"><summary class="flex justify-between items-center cursor-pointer"><span class="text-xs font-bold uppercase tracking-wider">${c.name}</span><div class="flex gap-2 opacity-50 group-hover:opacity-100"><button data-id="${c.id}" class="cab-add text-blue-400"><i class="fas fa-plus"></i></button><button data-id="${c.id}" class="cab-del text-red-500"><i class="fas fa-trash"></i></button></div></summary><ul class="mt-3 space-y-1">${c.files.map(f=>`<li class="flex justify-between text-xs group/f"><button data-path="${f.path}" class="file-open text-gray-400 hover:text-blue-400 truncate text-left flex-1"><i class="fas fa-file mr-2 opacity-50"></i>${f.name}</button><button data-cid="${c.id}" data-fid="${f.id}" class="file-del text-red-500 opacity-0 group-hover/f:opacity-100 px-1"><i class="fas fa-times"></i></button></li>`).join('')}</ul></details></div>`).join(''); }
function renVault() { $('vault-container').innerHTML = [...state.vault].reverse().map(d=>`<div class="bg-white/5 p-3 border border-white/10 mb-2"><details><summary class="flex justify-between cursor-pointer"><span class="text-xs text-gray-400">${d.date}</span><span class="text-[10px] bg-maroon px-1.5 text-white">${d.tasks.length}</span></summary><ul class="mt-2 space-y-1">${d.tasks.map(t=>`<li class="text-xs text-gray-500 truncate flex items-center"><i class="fas fa-check mr-2 text-green-900"></i>${t.text}</li>`).join('')}</ul></details></div>`).join(''); }
function renPomo() {
    $('pomodoro-timer-display').textContent=fmt(runtime.pomo.left).substring(3);
    ['work','short','long'].forEach(m=>$(`pomo-mode-${m}`).classList.toggle('active',runtime.pomo.mode===m));
    $('pomodoro-main-btn').textContent=runtime.pomo.run?'PAUSE':'START'; $('pomodoro-main-btn').classList.toggle('bg-yellow-600',runtime.pomo.run);
    Neutralino.window.setTitle(runtime.pomo.run?`${$('pomodoro-timer-display').textContent} - BRUNO`:'BRUNO');
}
function renCharts() {
    const c=state.tasks.filter(t=>t.completed).length, p=state.tasks.length-c;
    $('chart-placeholder').classList.toggle('hidden',c+p>0); $('subject-chart').classList.toggle('hidden',c+p===0);
    if(c+p>0){ if(runtime.charts.dash)runtime.charts.dash.destroy(); runtime.charts.dash=new Chart($('subject-chart'),{type:'doughnut',data:{labels:['Done','Pending'],datasets:[{data:[c,p],backgroundColor:['#065f46','#991b1b'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}); }
    const d={}; [...state.tasks,...state.vault.flatMap(x=>x.tasks)].forEach(t=>{if(t.subject&&t.timeSpent)d[t.subject]=(d[t.subject]||0)+t.timeSpent});
    $('bar-chart-placeholder').classList.toggle('hidden',Object.keys(d).length>0); $('time-bar-chart').classList.toggle('hidden',Object.keys(d).length===0);
    if(Object.keys(d).length>0){ if(runtime.charts.time)runtime.charts.time.destroy(); runtime.charts.time=new Chart($('time-bar-chart'),{type:'bar',data:{labels:Object.keys(d),datasets:[{data:Object.values(d).map(s=>(s/3600).toFixed(1)),backgroundColor:'#800000',borderRadius:0}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{grid:{color:'#222'},ticks:{color:'#555'}},x:{grid:{display:false},ticks:{color:'#555'}}},plugins:{legend:{display:false}}}}); }
}

// --- LISTENERS ---
function fmt(s){return new Date(s*1000).toISOString().substr(11,8)}
function notify(m){const d=document.createElement('div');d.className='p-3 bg-neutral-900 text-white text-xs border-l-2 border-maroon shadow-2xl';d.textContent=m;$('alert-container').prepend(d);setTimeout(()=>d.remove(),3000)}

$('add-link-form').onsubmit=(e)=>{e.preventDefault();const t=$('link-title-input').value.trim(),u=$('link-url-input').value.trim();if(t&&u){state.links.push({id:''+Date.now(),title:t,url:u});save();renLinks();e.target.reset()}};
$('links-container').onclick=async(e)=>{const d=e.target.closest('.del-link'),a=e.target.closest('a');if(d){state.links=state.links.filter(l=>l.id!==d.dataset.id);save();renLinks()}else if(a){e.preventDefault();await Neutralino.os.open(a.href)}};
$('add-subject-form').onsubmit=(e)=>{e.preventDefault();const n=$('subject-name-input').value.trim();if(n&&!state.subjects.some(s=>s.name===n)){state.subjects.push({id:''+Date.now(),name:n});save();renSubj();e.target.reset()}};
$('subject-list').onclick=(e)=>{const b=e.target.closest('.del-subj');if(b){state.subjects=state.subjects.filter(s=>s.id!==b.dataset.id);save();renAll()}};
$('add-task-form').onsubmit=(e)=>{e.preventDefault();const tx=$('task-input').value.trim();if(tx){state.tasks.push({id:''+Date.now(),text:tx,subject:$('task-subject-select').value,date:$('task-due-date').value,completed:false,timeSpent:0,run:false});save();renTasks();e.target.reset()}};
$('task-list').onclick=(e)=>{
    const el=e.target,li=el.closest('li');if(!li)return;const t=state.tasks.find(x=>x.id===li.dataset.id);
    if(el.classList.contains('task-check')){t.completed=el.checked;save();renTasks()}
    else if(el.closest('.task-del')){if(t.run)stopTimer(t);state.tasks=state.tasks.filter(x=>x.id!==t.id);save();renTasks()}
    else if(el.closest('.task-play'))t.run?stopTimer(t):startTimer(t);
    else if(el.closest('.task-notes')){$('log-modal-title').textContent=t.text;$('log-modal-textarea').value=t.log||'';$('log-modal-task-id').value=t.id;$('log-modal').classList.remove('hidden')}
    else if(el.closest('.task-log-time')){$('log-time-task-id').value=t.id;$('log-time-hours').value='';$('log-time-minutes').value='';$('log-time-modal').classList.remove('hidden')}
};
function startTimer(t){if(runtime.timer.id)stopTimer(state.tasks.find(x=>x.id===runtime.timer.id));t.run=true;t.start=Date.now();runtime.timer={id:t.id,int:setInterval(()=>{$(`t-${t.id}`).textContent=fmt(t.timeSpent+(Date.now()-t.start)/1000)},1000)};renTasks()}
function stopTimer(t){if(t&&t.run){clearInterval(runtime.timer.int);t.timeSpent+=(Date.now()-t.start)/1000;t.run=false;runtime.timer={id:null,int:null};save();renTasks()}}
$('complete-day-button').onclick=()=>{const d=state.tasks.filter(t=>t.completed);if(!d.length)return notify('No completed tasks.');d.forEach(t=>{if(t.run)stopTimer(t)});const y=new Date().toLocaleDateString();let e=state.vault.find(x=>x.date===y);if(!e){e={date:y,tasks:[]};state.vault.push(e)}e.tasks.push(...d);state.tasks=state.tasks.filter(t=>!t.completed);save();render();notify('Day saved.')};
$('pomodoro-main-btn').onclick=()=>{runtime.pomo.run=!runtime.pomo.run;if(runtime.pomo.run)runtime.pomo.int=setInterval(()=>{runtime.pomo.left--;if(runtime.pomo.left<=0){$('pomodoro-main-btn').click();Neutralino.os.showMessageBox('TIMER','Time up!','OK','INFO');runtime.pomo.mode=runtime.pomo.mode==='work'?'short':'work';runtime.pomo.left=state.pomodoro[runtime.pomo.mode]*60}renPomo()},1000);else clearInterval(runtime.pomo.int);renPomo()};
$('pomodoro-reset-btn').onclick=()=>{if(runtime.pomo.run)$('pomodoro-main-btn').click();runtime.pomo.left=state.pomodoro[runtime.pomo.mode]*60;renPomo()};
['work','short','long'].forEach(m=>$(`pomo-mode-${m}`).onclick=()=>{if(runtime.pomo.run)$('pomodoro-main-btn').click();runtime.pomo.mode=m;runtime.pomo.left=state.pomodoro[m]*60;renPomo()});
$('pomodoro-edit-btn').onclick=()=>{$('pomodoro-display-view').classList.add('hidden');$('pomodoro-edit-view').classList.remove('hidden');$('pomo-edit-work-input').value=state.pomodoro.work;$('pomo-edit-short-input').value=state.pomodoro.short;$('pomo-edit-long-input').value=state.pomodoro.long};
$('pomo-edit-save-btn').onclick=()=>{state.pomodoro={work:+$('pomo-edit-work-input').value||25,short:+$('pomo-edit-short-input').value||5,long:+$('pomo-edit-long-input').value||15};save();$('pomodoro-reset-btn').click();$('pomodoro-edit-view').classList.add('hidden');$('pomodoro-display-view').classList.remove('hidden')};
$('pomo-edit-cancel-btn').onclick=()=>{$('pomodoro-edit-view').classList.add('hidden');$('pomodoro-display-view').classList.remove('hidden')};
$('add-cabinet-form').onsubmit=(e)=>{e.preventDefault();const n=$('cabinet-name-input').value.trim();if(n){state.cabinets.push({id:''+Date.now(),name:n,files:[]});save();renCabs();$('add-cabinet-form').reset()}};
$('cabinets-container').onclick=async(e)=>{const el=e.target,add=el.closest('.cab-add'),delC=el.closest('.cab-del'),open=el.closest('.file-open'),delF=el.closest('.file-del');if(add){const f=await Neutralino.os.showOpenDialog('Add',{filters:[{name:'All',extensions:['*']}]});if(f[0]){state.cabinets.find(c=>c.id===add.dataset.id).files.push({id:''+Date.now(),name:f[0].split(/[/\\]/).pop(),path:f[0]});save();renCabs()}}else if(open)await Neutralino.os.open(open.dataset.path);else if(delC){state.cabinets=state.cabinets.filter(c=>c.id!==delC.dataset.id);save();renCabs()}else if(delF){const c=state.cabinets.find(x=>x.id===delF.dataset.cid);c.files=c.files.filter(f=>f.id!==delF.dataset.fid);save();renCabs()}};
$('log-modal-save-btn').onclick=()=>{const t=state.tasks.find(x=>x.id===$('log-modal-task-id').value);if(t){t.log=$('log-modal-textarea').value;save()}$('log-modal').classList.add('hidden')};
$('log-modal-cancel-btn').onclick=()=>$('log-modal').classList.add('hidden');
$('log-time-save-btn').onclick=()=>{const t=state.tasks.find(x=>x.id===$('log-time-task-id').value);if(t){t.timeSpent+=(+$('log-time-hours').value||0)*3600+(+$('log-time-minutes').value||0)*60;save();renTasks();renCharts()}$('log-time-modal').classList.add('hidden')};
$('log-time-cancel-btn').onclick=()=>$('log-time-modal').classList.add('hidden');

Neutralino.events.on('ready',async()=>{await load(); initDrag();});
Neutralino.events.on('windowClose',async()=>{if(runtime.timer.int)stopTimer(state.tasks.find(t=>t.id===runtime.timer.id));await save();Neutralino.app.exit()});