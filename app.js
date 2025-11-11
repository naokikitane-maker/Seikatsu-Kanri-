
(() => {
  const LS_KEY = "lifeLogV3";
  const LS_WEEK = "lifeLogWeeklyV1";
  const LS_MONTH = "lifeLogMonthlyV1";
  const LS_SETTINGS = "lifeLogSettingsV2";

  const defaultSettings = {
    habitsVisible: { study: true, strength: true, run: true, read20: true, selfControl: true },
    colors: { study: "green", strength: "orange", read20: "blue", selfControl: "sky" },
    weeklyStudyTargetMin: 120 * 7,
    theme: "tropic",
  };

  const colorMap = {
    green: "#22c55e",
    orange: "#f97316",
    blue: "#3b82f6",
    sky: "#38bdf8",
    red: "#ef4444",
    purple: "#a855f7",
    amber: "#f59e0b",
    cyan: "#06b6d4",
    fuchsia: "#d946ef",
    gray: "#e5e7eb",
  };

  const todayStr = () => new Date().toISOString().slice(0,10);
  const pad = (n) => (n<10?`0${n}`:`${n}`);
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parse = (s) => new Date(`${s}T00:00:00`);
  const weekStartSunday = (s) => { const d=parse(s); const start=new Date(d); start.setDate(d.getDate()-d.getDay()); return ymd(start); };
  const monthKeyFromDate = (s) => { const d=parse(s); return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; };
  const daysInMonth = (y,m) => new Date(y,m+1,0).getDate();

  const emptyEntry = (date) => ({
    date,
    habits: { study:false, strength:false, run:false, read20:false, selfControl:false },
    studyMin:0, sleepHours:0, napMin:0,
    calBreakfast:0, calLunch:0, calDinner:0, calSnack:0,
    weightKg:0, tasks:[]
  });

  const q = (sel) => document.querySelector(sel);
  const qa = (sel) => Array.from(document.querySelectorAll(sel));

  function load(k, fallback){ try{ const raw=localStorage.getItem(k); return raw?JSON.parse(raw):fallback; }catch{ return fallback; } }
  function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

  let store = load(LS_KEY, {});
  let weekly = load(LS_WEEK, {});
  let monthly = load(LS_MONTH, {});
  let settings = Object.assign({}, defaultSettings, load(LS_SETTINGS, {}));

  function setTheme(name){
    document.documentElement.setAttribute("data-theme", name === "dope" ? "dope" : "tropic");
    q("#themeToggle").textContent = name === "dope" ? "Dope: ON" : "Tropic: ON";
    q("#themeToggle2").textContent = name === "dope" ? "Dope: ON" : "Tropic: ON";
  }
  setTheme(settings.theme);

  let currentDate = todayStr();
  q("#dateInput").value = currentDate;

  q("#todayBtn").addEventListener("click", () => { currentDate = todayStr(); q("#dateInput").value = currentDate; renderAll(); });
  q("#dateInput").addEventListener("change", (e) => { currentDate = e.target.value || todayStr(); renderAll(); });
  const exportBtn = q("#exportBtn");
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `life-log-${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
  });
  q("#importFile").addEventListener("change", (e) => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { store = JSON.parse(String(r.result)); save(LS_KEY, store); renderAll(); }
      catch{ alert("JSONの読み込みに失敗しました"); }
    };
    r.readAsText(f);
  });
  q("#themeToggle").addEventListener("click", () => {
    settings.theme = settings.theme === "tropic" ? "dope" : "tropic";
    save(LS_SETTINGS, settings);
    setTheme(settings.theme);
  });
  q("#themeToggle2").addEventListener("click", () => { q("#themeToggle").click(); });

  function getEntry(date){
    const base = store[date];
    return base ? Object.assign(emptyEntry(date), base) : emptyEntry(date);
  }
  function setEntry(date, entry){
    store[date] = entry;
    save(LS_KEY, store);
  }

  function totalCalories(e){ return (e.calBreakfast||0)+(e.calLunch||0)+(e.calDinner||0)+(e.calSnack||0); }

  function calcStreak(date, key){
    let streak=0; let d=parse(date);
    while(true){
      const k = ymd(d);
      const e = store[k] ? Object.assign(emptyEntry(k), store[k]) : null;
      if(!e) break;
      const ok = key==="studyMin" ? (e.studyMin||0) > 0 : !!e.habits[key];
      if(!ok) break;
      streak++; d.setDate(d.getDate()-1);
    }
    return streak;
  }

  function showPraise(entry){
    const p = q("#praise");
    const keys = ["studyMin","strength","selfControl","run","read20","study"];
    let best=0, label="";
    keys.forEach(k=>{
      const s = calcStreak(currentDate, k);
      if(s>best){ best=s; label=(k==="studyMin"||k==="study")?"勉強":(k==="strength"?"筋トレ":k==="selfControl"?"SelfControl":k==="run"?"ランニング":"読書20分"); }
    });
    if(best>=2){ p.textContent = `${label} ${best}日連続！いい流れだね🔥`; p.hidden=false; }
    else if((entry.studyMin||0)>0 || Object.values(entry.habits).some(Boolean)){ p.textContent="今日も記録できた！ナイス積み上げ🌴"; p.hidden=false; }
    else { p.hidden=true; return; }
    setTimeout(()=>{ p.hidden=true; }, 5000);
  }

  function renderGoals(date){
    const mk = monthKeyFromDate(date); const wk = weekStartSunday(date);
    const weekEnd = (()=>{ const d=parse(wk); d.setDate(d.getDate()+6); return ymd(d); })();
    q("#monthKeyBadge").textContent = mk;
    q("#weekRange").textContent = `${wk} ～ ${weekEnd}`;
    q("#monthGoal").textContent = monthly[mk] || "（設定＞ミッション編集 から入力）";
    q("#weekGoal").textContent = weekly[wk] || "（設定＞ミッション編集 から入力）";
    q("#monthLabel").textContent = `今月の目標（${mk}）`;
    q("#weekLabel").textContent = `今週の仕事の目標（${wk}～${weekEnd}）`;
    q("#monthEdit").value = monthly[mk] || "";
    q("#weekEdit").value = weekly[wk] || "";
    q("#monthEdit").oninput = (e)=>{ monthly[mk]=e.target.value; save(LS_MONTH, monthly); renderGoals(currentDate); };
    q("#weekEdit").oninput = (e)=>{ weekly[wk]=e.target.value; save(LS_WEEK, weekly); renderGoals(currentDate); };
  }

  const habitDefsMain = [
    {key:"study", label:"勉強"},
    {key:"strength", label:"筋トレ"},
    {key:"selfControl", label:"SelfControl"},
  ];
  const habitDefsOmake = [
    {key:"run", label:"ランニング"},
    {key:"read20", label:"読書20分"},
  ];

  function renderToday(date){
    const e = getEntry(date);
    const bindNum = (id, key) => {
      const el = q(id);
      el.value = e[key] ?? 0;
      el.oninput = (ev) => { e[key] = Number(ev.target.value||0); setEntry(date, e); if(["calBreakfast","calLunch","calDinner","calSnack"].includes(key)) q("#calTotal").textContent = `${totalCalories(e)} kcal`; showPraise(e); };
    };
    bindNum("#weightKg","weightKg");
    bindNum("#calBreakfast","calBreakfast");
    bindNum("#calLunch","calLunch");
    bindNum("#calDinner","calDinner");
    bindNum("#calSnack","calSnack");
    q("#calTotal").textContent = `${totalCalories(e)} kcal`;
    bindNum("#studyMin","studyMin");
    bindNum("#sleepHours","sleepHours");
    bindNum("#napMin","napMin");

    const renderHabitGroup = (containerSel, defs) => {
      const box = q(containerSel); box.innerHTML="";
      defs.forEach(h=>{
        if(!settings.habitsVisible[h.key]) return;
        const row = document.createElement("label"); row.className="row gap-8";
        const cb = document.createElement("span"); cb.className="checkbox"+(e.habits[h.key]?" checked":""); cb.textContent=e.habits[h.key]?"✓":"";
        cb.addEventListener("click", ()=>{ e.habits[h.key]=!e.habits[h.key]; setEntry(date,e); renderToday(date); showPraise(e); });
        const sp = document.createElement("span"); sp.textContent = h.label;
        row.appendChild(cb); row.appendChild(sp); box.appendChild(row);
      });
    };
    renderHabitGroup("#habitMain", habitDefsMain);
    renderHabitGroup("#habitOmake", habitDefsOmake);

    const taskWrap = q("#taskList"); taskWrap.innerHTML="";
    e.tasks.forEach((t, i)=>{
      const item = document.createElement("div"); item.className="task";
      const left = document.createElement("label"); left.className="row gap-8";
      const cb = document.createElement("span"); cb.className="checkbox"+(t.done?" checked":""); cb.textContent=t.done?"✓":"";
      cb.addEventListener("click", ()=>{ t.done=!t.done; setEntry(date,e); renderToday(date); });
      const txt = document.createElement("span"); txt.textContent = t.text; if(t.done) txt.style.textDecoration="line-through"; txt.style.color=t.done?"var(--muted)":"inherit";
      left.appendChild(cb); left.appendChild(txt);
      const del = document.createElement("button"); del.className="btn ghost"; del.textContent="削除";
      del.addEventListener("click", ()=>{ e.tasks.splice(i,1); setEntry(date,e); renderToday(date); });
      item.appendChild(left); item.appendChild(del); taskWrap.appendChild(item);
    });
    const add = q("#taskAdd"); const input = q("#taskInput");
    add.onclick = ()=>{ const text=(input.value||"").trim(); if(!text) return; e.tasks.push({id:crypto.randomUUID(), text, done:false}); setEntry(date,e); input.value=""; renderToday(date); };
    input.onkeydown = (ev)=>{ if(ev.key==="Enter"){ add.click(); } };
  }

  function renderList(){
    const box = q("#listView"); box.innerHTML="";
    Object.keys(store).sort((a,b)=> a<b?1:-1).slice(0,60).forEach(d=>{
      const e = Object.assign(emptyEntry(d), store[d]);
      const done = e.tasks.filter(t=>t.done).length;
      const total = e.tasks.length;
      const card = document.createElement("div"); card.className="card";
      const title = document.createElement("div"); title.className="row gap-8";
      const badge = document.createElement("span"); badge.className="badge"; badge.textContent=d;
      const meta = document.createElement("span"); meta.className="muted"; meta.textContent=`勉強 ${Math.floor(e.studyMin/60)}h ${e.studyMin%60}m・昼寝 ${e.napMin}分・睡眠 ${e.sleepHours}h・kcal ${totalCalories(e)}・体重 ${e.weightKg||"-"}kg`;
      title.appendChild(badge); title.appendChild(meta); card.appendChild(title);
      const body = document.createElement("div"); body.className="mt-12";
      body.innerHTML = `習慣：<span class="${e.habits.study?"":"muted"}">勉強</span>・<span class="${e.habits.strength?"":"muted"}">筋トレ</span>・<span class="${e.habits.selfControl?"":"muted"}">SelfControl</span>・<span class="${e.habits.run?"":"muted"}">ラン</span>・<span class="${e.habits.read20?"":"muted"}">読書20分</span>`;
      const prog = document.createElement("div"); prog.className="progress mt-12";
      const bar = document.createElement("div"); bar.className="bar"; bar.style.width = (total? (done/total*100):0) + "%"; prog.appendChild(bar);
      card.appendChild(body); card.appendChild(prog);
      box.appendChild(card);
    });
  }

  function monthMatrix(date){
    const y = date.getFullYear(), m = date.getMonth();
    const first = new Date(y,m,1), offset = first.getDay(), total = daysInMonth(y,m);
    const cells = Array(offset).fill(null).concat(Array.from({length:total}, (_,i)=> ymd(new Date(y,m,i+1))));
    while(cells.length % 7 !== 0) cells.push(null);
    return cells;
  }
  let calView = new Date(currentDate);
  function renderCalendar(){
    q("#calYm").textContent = `${calView.getFullYear()}年 ${calView.getMonth()+1}月`;
    const legend = q("#legend"); legend.innerHTML="";
    const legItems = [
      settings.habitsVisible.study && {label:"勉強", color: colorMap[settings.colors?.study||"green"]},
      settings.habitsVisible.strength && {label:"筋トレ", color: colorMap[settings.colors?.strength||"orange"]},
      settings.habitsVisible.read20 && {label:"読書20分", color: colorMap[settings.colors?.read20||"blue"]},
      settings.habitsVisible.selfControl && {label:"SelfControl", color: colorMap[settings.colors?.selfControl||"sky"]},
    ].filter(Boolean);
    legItems.forEach(it=>{
      const span=document.createElement("span"); span.className="item";
      span.innerHTML = `<span class="color-swatch" style="background:${it.color}"></span>${it.label}`;
      legend.appendChild(span);
    });

    const grid = q("#calGrid"); grid.innerHTML="";
    ["日","月","火","水","木","金","土"].forEach(w=>{
      const head = document.createElement("div"); head.className="muted fw600"; head.style.textAlign="center"; head.textContent=w; grid.appendChild(head);
    });
    const cells = monthMatrix(calView);
    cells.forEach(c=>{
      const cell = document.createElement("div"); cell.className="cal-cell";
      if(!c){ grid.appendChild(cell); return; }
      const e = store[c] ? Object.assign(emptyEntry(c), store[c]) : null;
      const day = document.createElement("div"); day.className="day";
      const left = document.createElement("span"); left.textContent = Number(c.slice(-2));
      const dots = document.createElement("div"); dots.className="row gap-8";
      const addDot = (show, ok, color)=>{
        const d = document.createElement("span"); d.className="dot"; d.style.background = show ? (ok?color: "#e5e7eb") : "transparent"; dots.appendChild(d);
      };
      addDot(settings.habitsVisible.study, !!e?.habits.study, colorMap[settings.colors?.study||"green"]);
      addDot(settings.habitsVisible.strength, !!e?.habits.strength, colorMap[settings.colors?.strength||"orange"]);
      addDot(settings.habitsVisible.read20, !!e?.habits.read20, colorMap[settings.colors?.read20||"blue"]);
      addDot(settings.habitsVisible.selfControl, !!e?.habits.selfControl, colorMap[settings.colors?.selfControl||"sky"]);
      day.appendChild(left); day.appendChild(dots);
      const small = document.createElement("div"); small.className="muted"; small.style.fontSize="11px"; small.style.marginTop="6px";
      small.textContent = e ? `勉${Math.round((e.studyMin||0)/60)}h / 昼寝${e.napMin}m / kcal${totalCalories(e)} / 体${e.weightKg||"-"}kg` : "";
      cell.appendChild(day); cell.appendChild(small);
      cell.addEventListener("click",()=>{ currentDate = c; q("#dateInput").value = c; renderAll(); });
      grid.appendChild(cell);
    });
  }
  q("#calPrev").addEventListener("click", ()=>{ calView.setMonth(calView.getMonth()-1); renderCalendar(); });
  q("#calNext").addEventListener("click", ()=>{ calView.setMonth(calView.getMonth()+1); renderCalendar(); });

  function renderStats(){
    const days=[]; const base=parse(currentDate);
    for(let i=6;i>=0;i--){ const d=new Date(base); d.setDate(base.getDate()-i); const k=ymd(d); const e=store[k]?Object.assign(emptyEntry(k), store[k]):emptyEntry(k); days.push(e); }
    const sumStudy = days.reduce((a,e)=>a+(e.studyMin||0),0);
    q("#sumStudy").textContent = `${Math.floor(sumStudy/60)}h ${sumStudy%60}m`;
    q("#sumStudyDesc").textContent = `合計分（${Math.round(sumStudy/7)}分/日）`;
    const target = settings.weeklyStudyTargetMin || 1;
    q("#studyBar").style.width = Math.min(100, (sumStudy/target*100)) + "%";
    q("#studyTarget").textContent = `週目標 ${settings.weeklyStudyTargetMin} 分`;
    const countDays = (fn)=> days.filter(fn).length;
    const pieces = [
      { key:"strength", label:"筋トレ" },
      { key:"run", label:"ランニング" },
      { key:"read20", label:"読書20分" },
      { key:"selfControl", label:"SelfControl" },
    ];
    const wrap = q("#habitStats"); wrap.innerHTML="";
    pieces.forEach(p=>{
      const cont = document.createElement("div");
      const streak = calcStreak(currentDate, p.key);
      const daysCnt = countDays(e=> e.habits[p.key]);
      cont.innerHTML = `${p.label} <span class="badge">${streak}日連続</span> / <span class="badge">${daysCnt}/7日</span>`;
      const prog = document.createElement("div"); prog.className="progress mt-8";
      const bar = document.createElement("div"); bar.className="bar"; bar.style.width = Math.round(daysCnt/7*100) + "%";
      prog.appendChild(bar);
      wrap.appendChild(cont); wrap.appendChild(prog);
    });
    const calSum = days.reduce((a,e)=>a+((e.calBreakfast||0)+(e.calLunch||0)+(e.calDinner||0)+(e.calSnack||0)),0);
    const weights = days.map(e=>e.weightKg).filter(w=>w>0);
    const avgWeight = weights.length ? Math.round((weights.reduce((a,b)=>a+b,0)/weights.length)*10)/10 : 0;
    q("#avgCal").textContent = `${Math.round(calSum/7)} kcal/日`;
    q("#avgWeight").textContent = avgWeight ? `${avgWeight} kg` : "-";
  }

  function renderSettings(){
    const wrap = q("#settingsHabits"); wrap.innerHTML="";
    const items = [
      { key:"study", label:"勉強", colorKey:"study" },
      { key:"strength", label:"筋トレ", colorKey:"strength" },
      { key:"selfControl", label:"SelfControl", colorKey:"selfControl" },
      { key:"run", label:"ランニング", colorKey:"run" },
      { key:"read20", label:"読書20分", colorKey:"read20" },
    ];
    items.forEach(it=>{
      const row = document.createElement("div"); row.className="row-between";
      const left = document.createElement("label"); left.className="row gap-8";
      const cb = document.createElement("span"); cb.className="checkbox"+(settings.habitsVisible[it.key]?" checked":""); cb.textContent=settings.habitsVisible[it.key]?"✓":"";
      cb.addEventListener("click", ()=>{ settings.habitsVisible[it.key]=!settings.habitsVisible[it.key]; save(LS_SETTINGS, settings); renderAll(); });
      const sp = document.createElement("span"); sp.textContent = it.label;
      left.appendChild(cb); left.appendChild(sp);
      const colorSel = document.createElement("select");
      ["green","orange","blue","sky","red","purple","amber","cyan","fuchsia"].forEach(c=>{
        const opt=document.createElement("option"); opt.value=c; opt.textContent=c; if((settings.colors[it.colorKey]||"")===c) opt.selected=true;
        colorSel.appendChild(opt);
      });
      colorSel.addEventListener("change",(e)=>{ settings.colors[it.colorKey]=e.target.value; save(LS_SETTINGS, settings); renderAll(); });
      const sw = document.createElement("span"); sw.className="color-swatch"; sw.style.background = colorMap[settings.colors[it.colorKey]||"green"];
      const right = document.createElement("div"); right.className="row gap-8"; right.appendChild(colorSel); right.appendChild(sw);
      row.appendChild(left); row.appendChild(right);
      wrap.appendChild(row);
    });
    q("#weeklyTarget").value = settings.weeklyStudyTargetMin;
    q("#weeklyTarget").oninput = (e)=>{ settings.weeklyStudyTargetMin = Number(e.target.value||0); save(LS_SETTINGS, settings); renderStats(); };
  }

  function renderAll(){
    q("#dateInput").value = currentDate;
    renderGoals(currentDate);
    renderToday(currentDate);
    renderList();
    renderCalendar();
    renderStats();
    showPraise(getEntry(currentDate));
  }

  qa(".tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      qa(".tab").forEach(b=>b.classList.remove("active"));
      qa(".tabpane").forEach(p=>p.classList.remove("active"));
      btn.classList.add("active");
      q(`#tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  renderAll();
})();
