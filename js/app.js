const KEY="cxnStarsDataV1", THEME="cxnStarsTheme", SESSION="cxnStarsAdmin";
let data = loadData(), currentRank="batting", selectedPhoto="";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function loadData(){
  try{return JSON.parse(localStorage.getItem(KEY))||{players:[],matches:[]}}catch{return{players:[],matches:[]}}
}
function save(){localStorage.setItem(KEY,JSON.stringify(data));renderAll()}
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function isAdmin(){return localStorage.getItem(SESSION)==="1"}
function fmt(n){return Number(n||0).toFixed(2)}
function runs(p){return +p.runs||0}
function wickets(p){return +p.wickets||0}
function balls(p){return +p.balls||0}
function avg(p){let d=+p.dismissals||0;return d?fmt(runs(p)/d):fmt(runs(p))}
function sr(p){return balls(p)?fmt(runs(p)/balls(p)*100):"0.00"}
function overs(p){return +p.overs||0}
function eco(p){return overs(p)?fmt((+p.conceded||0)/overs(p)):"0.00"}
function photoHTML(p){return p.photo?`<img src="${esc(p.photo)}" alt="${esc(p.name)}">`:esc((p.name||"?").slice(0,1).toUpperCase())}
function totals(){return data.players.reduce((a,p)=>{a.runs+=runs(p);a.wickets+=wickets(p);a.matches=Math.max(a.matches,+p.matches||0);return a},{runs:0,wickets:0,matches:0})}
function resultCounts(){return data.matches.reduce((a,m)=>{let r=(m.result||"").toLowerCase();if(r==="win")a.win++;else if(r==="loss"||r==="lose")a.loss++;else if(r==="tie")a.tie++;else a.nr++;return a},{win:0,loss:0,tie:0,nr:0})}
function winRate(){let c=resultCounts(),played=c.win+c.loss+c.tie;return played?Math.round(c.win/played*100):0}
function toast(t){let x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2400)}
function openModal(html){$("#modalContent").innerHTML=html;$("#modal").classList.add("open")}
function closeModal(){$("#modal").classList.remove("open")}
function nav(page){
  $$(".page").forEach(x=>x.classList.toggle("active",x.id==="page-"+page));
  $$("nav a").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  if(location.hash!=="#"+page)history.replaceState(null,"","#"+page);
  $(".topbar").classList.remove("nav-open"); window.scrollTo({top:0,behavior:"smooth"});
}
function renderAll(){renderDashboard();renderPlayers();renderMatches();renderRankings();renderLeader();renderAnalytics();updateAdminUI()}
function renderDashboard(){
 const t=totals(),c=resultCounts(),wr=winRate();
 $("#heroPlayers").textContent=data.players.length;$("#heroMatches").textContent=data.matches.length;$("#heroWinRate").textContent=wr+"%";
 $("#summaryCards").innerHTML=[
  ["👥","Players",data.players.length],["🏏","Total Runs",t.runs],["🎯","Total Wickets",t.wickets],["🏆","Win Rate",wr+"%"]
 ].map(x=>`<div class="stat-card"><div class="icon">${x[0]}</div><b>${x[2]}</b><span>${x[1]}</span></div>`).join("");
 let deg=wr*3.6;$("#winDonut").style.background=`conic-gradient(var(--accent) 0 ${deg}deg,rgba(255,255,255,.07) ${deg}deg 360deg)`;$("#donutText").textContent=wr+"%";
 $("#resultLegend").innerHTML=[["Wins",c.win,"result-win"],["Losses",c.loss,"result-loss"],["Ties",c.tie,"result-tie"],["No result",c.nr,""]].map(x=>`<div class="legend-row"><span><i class="${x[2]}"></i>${x[0]}</span><b>${x[1]}</b></div>`).join("");
 const max=Math.max(1,data.matches.length);
 $("#progressBars").innerHTML=[["Win rate",wr],["Matches played",Math.min(100,data.matches.length*10)],["Squad active",Math.min(100,data.players.length*10)]].map(x=>`<div class="bar-row"><div class="bar-top"><b>${x[0]}</b><span>${x[1]}%</span></div><div class="bar-track"><div class="bar-fill" data-width="${x[1]}%"></div></div></div>`).join("");
 setTimeout(()=>$$(".bar-fill").forEach(x=>x.style.width=x.dataset.width),50);
 let top=[...data.players].sort((a,b)=>runs(b)-runs(a)).slice(0,5);
 $("#topPerformers").innerHTML=top.length?top.map((p,i)=>`<div class="performer"><div class="avatar">${photoHTML(p)}</div><main><strong>${i+1}. ${esc(p.name)}</strong><small>${esc(p.role||"Player")} • ${runs(p)} runs • ${wickets(p)} wkts</small></main><b>${sr(p)}</b></div>`).join(""):`<div class="empty">No players yet. Admin can add the squad.</div>`;
 let ms=[...data.matches].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
 $("#recentMatches").innerHTML=ms.length?ms.map(m=>`<div class="match-row"><span><strong>${esc(m.opponent)}</strong><br><small>${esc(m.date||"")} • ${esc(m.venue||"")}</small></span><b class="result-${(m.result||"").toLowerCase()}">${esc((m.result||"").toUpperCase())}</b></div>`).join(""):`<div class="empty">No match results recorded.</div>`;
}
function renderPlayers(){
 let q=($("#playerSearch")?.value||"").toLowerCase(), role=$("#roleFilter")?.value||"all";
 let ps=data.players.filter(p=>(p.name||"").toLowerCase().includes(q)&&(role==="all"||p.role===role));
 $("#playerGrid").innerHTML=ps.length?ps.map(p=>`<article class="player-card" data-id="${p.id}">
  <div class="player-photo">${p.photo?`<img src="${esc(p.photo)}" alt="${esc(p.name)}">`:`<div class="avatar" style="width:100%;height:100%;border-radius:0;font-size:55px">${photoHTML(p)}</div>`}<span class="player-role">${esc(p.role||"Player")} • #${esc(p.jersey||"-")}</span></div>
  <div class="player-body"><h3>${esc(p.name)}</h3><small>${+p.matches||0} matches</small><div class="player-metrics"><div class="metric"><b>${runs(p)}</b><span>RUNS</span></div><div class="metric"><b>${sr(p)}</b><span>SR</span></div><div class="metric"><b>${wickets(p)}</b><span>WKTS</span></div></div></div>
  <div class="card-actions"><button class="small-btn edit-player admin-only" data-id="${p.id}">Edit</button><button class="small-btn danger delete-player admin-only" data-id="${p.id}">Delete</button></div>
 </article>`).join(""):`<div class="panel" style="grid-column:1/-1;text-align:center;color:var(--muted);padding:50px">No players found.</div>`;
 $$(".player-card").forEach(x=>x.onclick=e=>{if(!e.target.closest("button"))showPlayer(x.dataset.id)});
 $$(".edit-player").forEach(x=>x.onclick=e=>{e.stopPropagation();editPlayer(x.dataset.id)});
 $$(".delete-player").forEach(x=>x.onclick=e=>{e.stopPropagation();deletePlayer(x.dataset.id)});
 updateAdminUI();
}
function showPlayer(pid){
 let p=data.players.find(x=>x.id===pid);if(!p)return;
 openModal(`<span class="section-kicker">PLAYER PROFILE</span><h2>${esc(p.name)}</h2><div class="performer" style="margin-bottom:14px"><div class="avatar">${photoHTML(p)}</div><main><strong>${esc(p.role||"Player")}</strong><small>Jersey #${esc(p.jersey||"-")}</small></main></div>
 <div class="analytics-kpis"><div><b>${runs(p)}</b><span>RUNS</span></div><div><b>${avg(p)}</b><span>AVERAGE</span></div><div><b>${sr(p)}</b><span>STRIKE RATE</span></div><div><b>${wickets(p)}</b><span>WICKETS</span></div></div>
 <div class="analytics-kpis" style="margin-top:10px"><div><b>${eco(p)}</b><span>ECONOMY</span></div><div><b>${+p.matches||0}</b><span>MATCHES</span></div><div><b>${+p.balls||0}</b><span>BALLS</span></div><div><b>${+p.conceded||0}</b><span>RUNS CONCEDED</span></div></div>`);
}
function playerForm(p={}){
 selectedPhoto=p.photo||"";
 return `<span class="section-kicker">${p.id?"EDIT PLAYER":"ADD PLAYER"}</span><h2>${p.id?"Edit player":"Add player"}</h2>
 <div class="form-grid"><div class="form-group"><label>Name</label><input id="fName" value="${esc(p.name||"")}" placeholder="Player name"></div>
 <div class="form-group"><label>Jersey number</label><input id="fJersey" type="number" value="${esc(p.jersey||"")}" placeholder="10"></div>
 <div class="form-group"><label>Role</label><select id="fRole">${["Batsman","Bowler","All-rounder","Wicketkeeper"].map(r=>`<option ${p.role===r?"selected":""}>${r}</option>`).join("")}</select></div>
 <div class="form-group"><label>Photo</label><input id="fPhoto" type="file" accept="image/*"></div>
 <div class="form-group full"><label>Photo preview</label><div class="photo-preview" id="photoPreview">${p.photo?`<img src="${esc(p.photo)}">`:"Choose a photo (optional)"}</div></div>
 <div class="form-group"><label>Runs</label><input id="fRuns" type="number" value="${+p.runs||0}"></div>
 <div class="form-group"><label>Balls faced</label><input id="fBalls" type="number" value="${+p.balls||0}"></div>
 <div class="form-group"><label>Dismissals</label><input id="fDismissals" type="number" value="${+p.dismissals||0}"></div>
 <div class="form-group"><label>Wickets</label><input id="fWickets" type="number" value="${+p.wickets||0}"></div>
 <div class="form-group"><label>Overs bowled</label><input id="fOvers" type="number" step="0.1" value="${+p.overs||0}"></div>
 <div class="form-group"><label>Runs conceded</label><input id="fConceded" type="number" value="${+p.conceded||0}"></div>
 <div class="form-group"><label>Matches played</label><input id="fMatches" type="number" value="${+p.matches||0}"></div></div>
 <div class="modal-actions"><button class="ghost-btn" onclick="closeModal()">Cancel</button><button class="primary-btn" id="savePlayer">Save Player</button></div>`;
}
function bindPhoto(){let f=$("#fPhoto");if(!f)return;f.onchange=()=>{let file=f.files[0];if(!file)return;let r=new FileReader();r.onload=()=>{selectedPhoto=r.result;$("#photoPreview").innerHTML=`<img src="${selectedPhoto}">`};r.readAsDataURL(file)}}
function addPlayer(){if(!isAdmin())return login();openModal(playerForm());bindPhoto();$("#savePlayer").onclick=()=>{let name=$("#fName").value.trim();if(!name)return toast("Enter player name");data.players.push({id:id(),name,jersey:$("#fJersey").value,role:$("#fRole").value,photo:selectedPhoto,runs:+$("#fRuns").value||0,balls:+$("#fBalls").value||0,dismissals:+$("#fDismissals").value||0,wickets:+$("#fWickets").value||0,overs:+$("#fOvers").value||0,conceded:+$("#fConceded").value||0,matches:+$("#fMatches").value||0});save();closeModal();toast("Player added")}}
function editPlayer(pid){if(!isAdmin())return login();let p=data.players.find(x=>x.id===pid);if(!p)return;openModal(playerForm(p));bindPhoto();$("#savePlayer").onclick=()=>{Object.assign(p,{name:$("#fName").value.trim(),jersey:$("#fJersey").value,role:$("#fRole").value,photo:selectedPhoto,runs:+$("#fRuns").value||0,balls:+$("#fBalls").value||0,dismissals:+$("#fDismissals").value||0,wickets:+$("#fWickets").value||0,overs:+$("#fOvers").value||0,conceded:+$("#fConceded").value||0,matches:+$("#fMatches").value||0});save();closeModal();toast("Player updated")}}
function deletePlayer(pid){if(!isAdmin())return;let p=data.players.find(x=>x.id===pid);if(confirm(`Delete ${p?.name||"player"}?`)){data.players=data.players.filter(x=>x.id!==pid);save();toast("Player deleted")}}
function matchForm(){
 return `<span class="section-kicker">MATCH CENTER</span><h2>Record match</h2><div class="form-grid">
 <div class="form-group"><label>Date</label><input id="mDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
 <div class="form-group"><label>Opponent</label><input id="mOpponent" placeholder="Opponent team"></div>
 <div class="form-group"><label>Venue</label><input id="mVenue" placeholder="Ground / city"></div>
 <div class="form-group"><label>Result</label><select id="mResult"><option>Win</option><option>Loss</option><option>Tie</option><option>No Result</option></select></div>
 <div class="form-group"><label>CXN Score</label><input id="mScore" placeholder="178/6 (20 ov)"></div>
 <div class="form-group"><label>Opponent Score</label><input id="mOppScore" placeholder="165/8 (20 ov)"></div>
 <div class="form-group"><label>Best Batter</label><input id="mBatter" placeholder="Name • 72 runs"></div>
 <div class="form-group"><label>Best Bowler</label><input id="mBowler" placeholder="Name • 3 wickets"></div>
 <div class="form-group full"><label>Notes</label><input id="mNotes" placeholder="Optional match notes"></div></div>
 <div class="modal-actions"><button class="ghost-btn" onclick="closeModal()">Cancel</button><button class="primary-btn" id="saveMatch">Save Match</button></div>`;
}
function addMatch(){if(!isAdmin())return login();openModal(matchForm());$("#saveMatch").onclick=()=>{let opponent=$("#mOpponent").value.trim();if(!opponent)return toast("Enter opponent");data.matches.push({id:id(),date:$("#mDate").value,opponent,venue:$("#mVenue").value,result:$("#mResult").value,score:$("#mScore").value,oppScore:$("#mOppScore").value,batter:$("#mBatter").value,bowler:$("#mBowler").value,notes:$("#mNotes").value});save();closeModal();toast("Match recorded")}}
function renderMatches(){
 let c=resultCounts();$("#matchSummary").innerHTML=[["MATCHES",data.matches.length],["WINS",c.win],["LOSSES",c.loss],["WIN RATE",winRate()+"%"]].map(x=>`<div class="match-kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join("");
 let ms=[...data.matches].sort((a,b)=>new Date(b.date)-new Date(a.date));
 $("#matchesTable").innerHTML=ms.length?ms.map(m=>`<tr><td>${esc(m.date)}</td><td><strong>${esc(m.opponent)}</strong></td><td>${esc(m.venue)}</td><td><b class="result-${(m.result||"").toLowerCase()}">${esc((m.result||"").toUpperCase())}</b></td><td>${esc(m.score||"-")}<br><small>${esc(m.oppScore||"")}</small></td><td>${esc(m.batter||"-")}</td><td>${esc(m.bowler||"-")}</td><td class="admin-only"><button class="small-btn danger" onclick="deleteMatch('${m.id}')">Delete</button></td></tr>`).join(""):`<tr><td colspan="8" style="text-align:center;padding:45px;color:var(--muted)">No matches recorded yet.</td></tr>`;
 updateAdminUI();
}
function deleteMatch(mid){if(!isAdmin())return; if(confirm("Delete this match result?")){data.matches=data.matches.filter(m=>m.id!==mid);save();toast("Match deleted")}}
function renderRankings(){
 let ps=[...data.players], head, rows;
 if(currentRank==="batting"){ps.sort((a,b)=>runs(b)-runs(a));head=["#","Player","Role","Runs","Average","SR","Matches"];rows=ps.map((p,i)=>[i+1,p.name,p.role,runs(p),avg(p),sr(p),+p.matches||0])}
 else if(currentRank==="bowling"){ps.sort((a,b)=>wickets(b)-wickets(a));head=["#","Player","Role","Wickets","Economy","Overs","Conceded"];rows=ps.map((p,i)=>[i+1,p.name,p.role,wickets(p),eco(p),overs(p),+p.conceded||0])}
 else {ps.sort((a,b)=>(runs(b)+wickets(b)*20)-(runs(a)+wickets(a)*20));head=["#","Player","Role","Runs","Wickets","SR","Score"];rows=ps.map((p,i)=>[i+1,p.name,p.role,runs(p),wickets(p),sr(p),runs(p)+wickets(p)*20])}
 $("#rankingHead").innerHTML=`<tr>${head.map(x=>`<th>${x}</th>`).join("")}</tr>`;
 $("#rankingBody").innerHTML=rows.length?rows.map(r=>`<tr>${r.map((x,i)=>`<td>${i===1?`<strong>${esc(x)}</strong>`:esc(x)}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${head.length}" style="text-align:center;padding:45px;color:var(--muted)">No players yet.</td></tr>`;
}
function renderLeader(){
 let p=data.players[0]||{}, t=totals();
 $("#leaderStats").innerHTML=[["🏏",t.runs,"TEAM RUNS"],["🎯",t.wickets,"TEAM WICKETS"],["🏆",winRate()+"%","WIN RATE"],["📅",data.matches.length,"MATCHES"]].map(x=>`<div class="stat-card"><div class="icon">${x[0]}</div><b>${x[1]}</b><span>${x[2]}</span></div>`).join("");
}
function renderAnalytics(){
 let ps=[...data.players], maxR=Math.max(1,...ps.map(runs)),maxW=Math.max(1,...ps.map(wickets));
 $("#battingBars").innerHTML=ps.sort((a,b)=>runs(b)-runs(a)).slice(0,7).map(p=>`<div class="bar-row"><div class="bar-top"><b>${esc(p.name)}</b><span>${runs(p)} runs</span></div><div class="bar-track"><div class="bar-fill" data-width="${runs(p)/maxR*100}%"></div></div></div>`).join("")||"<span style='color:var(--muted)'>No player data.</span>";
 $("#bowlingBars").innerHTML=ps.sort((a,b)=>wickets(b)-wickets(a)).slice(0,7).map(p=>`<div class="bar-row"><div class="bar-top"><b>${esc(p.name)}</b><span>${wickets(p)} wickets</span></div><div class="bar-track"><div class="bar-fill" data-width="${wickets(p)/maxW*100}%"></div></div></div>`).join("")||"<span style='color:var(--muted)'>No player data.</span>";
 let t=totals();$("#analyticsKpis").innerHTML=[["Runs",t.runs],["Wickets",t.wickets],["Matches",data.matches.length],["Win rate",winRate()+"%"]].map(x=>`<div><b>${x[1]}</b><span>${x[0]}</span></div>`).join("");
 setTimeout(()=>$$(".bar-fill").forEach(x=>x.style.width=x.dataset.width),60);
}
function updateAdminUI(){
 let admin=isAdmin();$$(".admin-only").forEach(x=>x.style.display=admin?"":"none");$("#adminBtn").textContent=admin?"Admin Logout":"Admin Login";
}
function login(){
 openModal(`<span class="section-kicker">SECURE AREA</span><h2>Admin login</h2><p style="color:var(--muted)">Only the admin can add, edit or delete team data.</p><div class="form-grid"><div class="form-group full"><label>Username</label><input id="loginUser" value="admin"></div><div class="form-group full"><label>Password</label><input id="loginPass" type="password" placeholder="Enter admin password"></div></div><div class="modal-actions"><button class="ghost-btn" onclick="closeModal()">Cancel</button><button class="primary-btn" id="doLogin">Login</button></div><small style="display:block;color:var(--muted);margin-top:12px">Demo starter credentials: admin / CXNStars@2026. Change the password in js/app.js before publishing.</small>`);
 $("#doLogin").onclick=()=>{if($("#loginUser").value==="admin"&&$("#loginPass").value==="CXNStars@2026"){localStorage.setItem(SESSION,"1");closeModal();updateAdminUI();toast("Admin mode enabled")}else toast("Wrong username or password")};
}
function logout(){localStorage.removeItem(SESSION);updateAdminUI();toast("Admin logged out")}
$$("nav a").forEach(a=>a.onclick=e=>{e.preventDefault();nav(a.dataset.page)});
$("#mobileMenu").onclick=()=>$(".topbar").classList.toggle("nav-open");
$("#modalClose").onclick=closeModal;$("#modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
$("#adminBtn").onclick=()=>isAdmin()?logout():login();
$("#addPlayerBtn").onclick=addPlayer;$("#addMatchBtn").onclick=addMatch;
$("#playerSearch").oninput=renderPlayers;$("#roleFilter").onchange=renderPlayers;
$$(".ranking-tabs button").forEach(b=>b.onclick=()=>{$$(".ranking-tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentRank=b.dataset.rank;renderRankings()});
$("#themeBtn").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem(THEME,document.body.classList.contains("light")?"light":"dark");$("#themeBtn").textContent=document.body.classList.contains("light")?"🌙":"☀️"};
if(localStorage.getItem(THEME)==="light"){$("body").classList.add("light");$("#themeBtn").textContent="🌙"}
$("#year").textContent=new Date().getFullYear();
let initial=(location.hash||"#dashboard").slice(1);nav(["dashboard","players","matches","rankings","leader","analytics"].includes(initial)?initial:"dashboard");renderAll();
