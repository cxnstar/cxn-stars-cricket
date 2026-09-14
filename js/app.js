const SUPABASE_URL="https://yjxvkgnhtnnjzdhhvgdy.supabase.co";
const SUPABASE_KEY="sb_publishable_DIB9FH_sTyGBXbFgOiXOGA_m4K9W-PN";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const THEME="cxnStarsTheme";
let data={players:[],matches:[],performances:[],fundPayments:{},expenses:[]}, currentRank="batting", selectedPhoto="", adminSession=null;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function isAdmin(){return !!adminSession}
function fmt(n){return Number(n||0).toFixed(2)}
function runs(p){return +p.runs||0}
function wickets(p){return +p.wickets||0}
function balls(p){return +p.balls||0}
function avg(p){let d=+p.dismissals||0;return d?fmt(runs(p)/d):fmt(runs(p))}
function sr(p){return balls(p)?fmt(runs(p)/balls(p)*100):"0.00"}
function overs(p){return +p.overs||0}
function eco(p){return overs(p)?fmt((+p.conceded||0)/overs(p)):"0.00"}
function photoHTML(p){return p.photo?`<img src="${esc(p.photo)}" alt="${esc(p.name)}">`:esc((p.name||"?").slice(0,1).toUpperCase())}
async function loadFromSupabase(){try{const [pr,mr,perf,fr,er]=await Promise.all([sb.from("players").select("*").order("created_at",{ascending:true}),sb.from("matches").select("*").order("match_date",{ascending:false}),sb.from("performances").select("*").order("created_at",{ascending:false}),sb.from("player_funds").select("*").order("payment_month",{ascending:false}),sb.from("fund_expenses").select("*").order("expense_date",{ascending:false})]);if(pr.error)throw pr.error;if(mr.error)throw mr.error;if(perf.error)throw perf.error;if(fr.error)throw fr.error;if(er.error)throw er;data.players=(pr.data||[]).map(p=>({id:String(p.id),name:p.name,jersey:p.jersey,role:p.role,photo:p.photo,runs:p.runs||0,balls:p.balls||0,dismissals:p.dismissals||0,wickets:p.wickets||0,overs:p.overs||0,conceded:p.conceded||0,matches:p.matches||0}));data.matches=(mr.data||[]).map(m=>({id:String(m.id),date:m.match_date,opponent:m.opponent,venue:m.venue,result:m.result,score:m.score,oppScore:m.opp_score,batter:m.batter,bowler:m.bowler,notes:m.notes}));
data.performances=(perf.data||[]).map(x=>({id:String(x.id),match_id:String(x.match_id),player_id:String(x.player_id),runs:+x.runs||0,balls:+x.balls||0,dismissals:+x.dismissals||0,wickets:+x.wickets||0,overs:+x.overs||0,conceded:+(x.runs_conceded ?? x.conceded)||0,created_at:x.created_at}));
rebuildPlayerAggregates();data.fundPayments={};(fr.data||[]).forEach(f=>{let pid=String(f.player_id),k=String(f.payment_month).slice(0,7);if(!data.fundPayments[pid])data.fundPayments[pid]={};data.fundPayments[pid][k]={amount:+f.amount||0,status:f.status||"unpaid",paidAt:f.paid_at?new Date(f.paid_at).toLocaleDateString():"",dbId:f.id}});data.expenses=(er.data||[]).map(e=>({id:String(e.id),title:e.title,amount:+e.amount||0,date:e.expense_date,note:e.note||""}));ensureFundMonth(monthKey());renderAll()}catch(e){console.error(e);toast("Supabase data load failed")}}
async function savePlayerToDB(p){const row={name:p.name,jersey:p.jersey?+p.jersey:null,role:p.role,photo:p.photo||null,runs:runs(p),balls:balls(p),dismissals:+p.dismissals||0,wickets:wickets(p),overs:overs(p),conceded:+p.conceded||0,matches:+p.matches||0};const q=p.id&&/^\d+$/.test(String(p.id))?sb.from("players").update(row).eq("id",p.id):sb.from("players").insert(row).select().single();const {data:r,error}=await q;if(error)throw error;if(r)p.id=String(r.id)}
async function deletePlayerDB(pid){const {error}=await sb.from("players").delete().eq("id",pid);if(error)throw error}
async function saveMatchToDB(m){const row={match_date:m.date||null,opponent:m.opponent,venue:m.venue,result:m.result,score:m.score||null,opp_score:m.oppScore||null,batter:m.batter||null,bowler:m.bowler||null,notes:m.notes||null};const q=m.id&&/^\d+$/.test(String(m.id))?sb.from("matches").update(row).eq("id",m.id):sb.from("matches").insert(row).select().single();const {data:r,error}=await q;if(error)throw error;if(r)m.id=String(r.id)}
async function deleteMatchDB(mid){const {error}=await sb.from("matches").delete().eq("id",mid);if(error)throw error}
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
function renderAll(){renderDashboard();renderPlayers();renderMatches();renderRankings();renderLeader();renderFunds();renderPerformance();renderAnalytics();updateAdminUI()}
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
  <div class="player-body"><h3>${esc(p.name)}</h3><small>${+p.matches||0} matches</small><div class="player-metrics"><div class="metric"><b>${runs(p)}</b><span>SCORE</span></div><div class="metric"><b>${avg(p)}</b><span>AVERAGE</span></div><div class="metric"><b>${sr(p)}</b><span>STRIKE RATE</span></div><div class="metric"><b>${eco(p)}</b><span>ECONOMY</span></div></div></div>
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
 <div class="form-group full"><label>Photo preview</label><div class="photo-preview" id="photoPreview">${p.photo?`<img src="${esc(p.photo)}">`:"Choose a photo (optional)"}</div></div></div>
 <div class="modal-actions"><button class="ghost-btn" onclick="closeModal()">Cancel</button><button class="primary-btn" id="savePlayer">Save Player</button></div>`;
}
function bindPhoto(){let f=$("#fPhoto");if(!f)return;f.onchange=()=>{let file=f.files[0];if(!file)return;let r=new FileReader();r.onload=()=>{selectedPhoto=r.result;$("#photoPreview").innerHTML=`<img src="${selectedPhoto}">`};r.readAsDataURL(file)}}
async function addPlayer(){if(!isAdmin())return login();openModal(playerForm());bindPhoto();$("#savePlayer").onclick=async()=>{let name=$("#fName").value.trim();if(!name)return toast("Enter player name");let p={name,jersey:$("#fJersey").value,role:$("#fRole").value,photo:selectedPhoto,runs:0,balls:0,dismissals:0,wickets:0,overs:0,conceded:0,matches:0};try{await savePlayerToDB(p);data.players.push(p);ensureFundMonth(monthKey());closeModal();renderAll();toast("Player added")}catch(e){console.error(e);toast("Player save failed")}}}
async function editPlayer(pid){if(!isAdmin())return login();let p=data.players.find(x=>x.id===pid);if(!p)return;openModal(playerForm(p));bindPhoto();$("#savePlayer").onclick=async()=>{Object.assign(p,{name:$("#fName").value.trim(),jersey:$("#fJersey").value,role:$("#fRole").value,photo:selectedPhoto});try{await savePlayerToDB(p);closeModal();renderAll();toast("Player updated")}catch(e){console.error(e);toast("Player update failed")}}}
async function deletePlayer(pid){if(!isAdmin())return;if(confirm("Delete this player?")){try{await deletePlayerDB(pid);data.players=data.players.filter(p=>String(p.id)!==String(pid));delete data.fundPayments[pid];renderAll();toast("Player deleted")}catch(e){console.error(e);toast("Delete failed")}}}
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
async function addMatch(){if(!isAdmin())return login();openModal(matchForm());$("#saveMatch").onclick=async()=>{let opponent=$("#mOpponent").value.trim();if(!opponent)return toast("Enter opponent");let m={date:$("#mDate").value,opponent,venue:$("#mVenue").value,result:$("#mResult").value,score:$("#mScore").value,oppScore:$("#mOppScore").value,batter:$("#mBatter").value,bowler:$("#mBowler").value,notes:$("#mNotes").value};try{await saveMatchToDB(m);data.matches.push(m);closeModal();renderAll();toast("Match recorded")}catch(e){console.error(e);toast("Match save failed")}}}
function renderMatches(){
 let c=resultCounts();$("#matchSummary").innerHTML=[["MATCHES",data.matches.length],["WINS",c.win],["LOSSES",c.loss],["WIN RATE",winRate()+"%"]].map(x=>`<div class="match-kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join("");
 let ms=[...data.matches].sort((a,b)=>new Date(b.date)-new Date(a.date));
 $("#matchesTable").innerHTML=ms.length?ms.map(m=>`<tr><td>${esc(m.date)}</td><td><strong>${esc(m.opponent)}</strong></td><td>${esc(m.venue)}</td><td><b class="result-${(m.result||"").toLowerCase()}">${esc((m.result||"").toUpperCase())}</b></td><td>${esc(m.score||"-")}<br><small>${esc(m.oppScore||"")}</small></td><td>${esc(m.batter||"-")}</td><td>${esc(m.bowler||"-")}</td><td class="admin-only"><button class="small-btn danger" onclick="deleteMatch('${m.id}')">Delete</button></td></tr>`).join(""):`<tr><td colspan="8" style="text-align:center;padding:45px;color:var(--muted)">No matches recorded yet.</td></tr>`;
 updateAdminUI();
}
async function deleteMatch(mid){if(!isAdmin())return;if(confirm("Delete this match result?")){try{await deleteMatchDB(mid);data.matches=data.matches.filter(m=>String(m.id)!==String(mid));renderAll();toast("Match deleted")}catch(e){console.error(e);toast("Delete failed")}}}
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
const MONTHLY_DUE=400;
function money(n){return "PKR "+Number(n||0).toLocaleString()}
function monthKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function monthLabel(k){if(!k)return "";let [y,m]=k.split("-").map(Number);return new Date(y,m-1,1).toLocaleDateString(undefined,{month:"long",year:"numeric"})}
function ensureFundMonth(k){if(!data.fundPayments)data.fundPayments={};data.players.forEach(p=>{if(!data.fundPayments[p.id])data.fundPayments[p.id]={};if(!data.fundPayments[p.id][k])data.fundPayments[p.id][k]={amount:0,status:"unpaid",paidAt:""}})}
function fundStats(k){ensureFundMonth(k);let due=data.players.length*MONTHLY_DUE,paid=data.players.reduce((n,p)=>n+(data.fundPayments[p.id][k]?.status==="paid"?MONTHLY_DUE:0),0);return {due,paid,remaining:due-paid,paidCount:Math.round(paid/MONTHLY_DUE),unpaidCount:data.players.length-Math.round(paid/MONTHLY_DUE)}}
function renderFunds(){
 let picker=$("#fundMonthView"); if(!picker)return; if(!picker.value)picker.value=monthKey(); const k=picker.value; ensureFundMonth(k); const st=fundStats(k);
 $("#fundRegisterTitle").textContent=`Player payments • ${monthLabel(k)}`;
 $("#fundKpis").innerHTML=[["👥","Players due",data.players.length],["💵","Monthly due",money(st.due)],["✅","Paid",money(st.paid)],["⏳","Remaining",money(st.remaining)]].map(x=>`<div class="fund-kpi"><div class="fund-icon">${x[0]}</div><b>${x[2]}</b><span>${x[1]}</span></div>`).join("");
 $("#fundRegister").innerHTML=data.players.length?data.players.map(p=>{let q=data.fundPayments[p.id][k],paid=q.status==="paid";return `<tr><td><div class="fund-player"><div class="avatar">${photoHTML(p)}</div><strong>${esc(p.name)}</strong></div></td><td>${monthLabel(k)}</td><td><b>${money(MONTHLY_DUE)}</b></td><td><span class="fund-status ${paid?'paid':'unpaid'}">${paid?'PAID':'UNPAID'}</span></td><td>${paid?esc(q.paidAt):'—'}</td><td>${isAdmin()?(paid?`<button class="small-btn" onclick="markFundUnpaid('${p.id}','${k}')">Undo</button>`:`<button class="small-btn pay-btn" onclick="markFundPaid('${p.id}','${k}')">Mark paid</button>`):'<span class="muted">Admin only</span>'}</td></tr>`}).join(""):`<tr><td colspan="6"><div class="empty">Add players first. Each player will automatically have a PKR 400 monthly due record.</div></td></tr>`;
 $("#fundHistory").innerHTML=data.players.length?data.players.map(p=>{let months=Object.entries((data.fundPayments||{})[p.id]||{}).sort((a,b)=>b[0].localeCompare(a[0]));return `<div class="fund-history-player"><div class="fund-history-head"><div class="fund-player"><div class="avatar">${photoHTML(p)}</div><strong>${esc(p.name)}</strong></div><b>${months.filter(([,q])=>q.status==='paid').length} paid months</b></div><div class="fund-months">${months.length?months.map(([m,q])=>`<span class="history-chip ${q.status==='paid'?'paid':'unpaid'}"><b>${monthLabel(m)}</b> • ${q.status==='paid'?money(MONTHLY_DUE)+' paid':'PKR 400 due'}</span>`).join(''):'<span class="muted">No payment history yet.</span>'}</div></div>`}).join(""):`<div class="empty">No players available.</div>`;
 $("#fundExpenses").innerHTML=data.expenses.length?data.expenses.slice().reverse().map(e=>`<div class="expense-row"><span><strong>${esc(e.title)}</strong><small>${esc(e.date||"")} ${e.note?'• '+esc(e.note):''}</small></span><b class="expense-amount">− ${money(e.amount)}</b></div>`).join(""):'<div class="empty">No fund uses recorded yet.</div>';
 updateAdminUI();
}
async function markFundPaid(pid,k){if(!isAdmin())return login();ensureFundMonth(k);let q=data.fundPayments[pid][k];try{if(q?.dbId){let {error}=await sb.from("player_funds").update({amount:MONTHLY_DUE,status:"paid",paid_at:new Date().toISOString()}).eq("id",q.dbId);if(error)throw error}else{let {data:r,error}=await sb.from("player_funds").insert({player_id:+pid,payment_month:k+"-01",amount:MONTHLY_DUE,status:"paid",paid_at:new Date().toISOString()}).select().single();if(error)throw error;q={dbId:r.id}}data.fundPayments[pid][k]={amount:MONTHLY_DUE,status:"paid",paidAt:new Date().toLocaleDateString(),dbId:q.dbId};renderAll();toast("PKR 400 marked as paid")}catch(e){console.error(e);toast("Payment update failed")}}
async function markFundUnpaid(pid,k){if(!isAdmin())return login();let q=data.fundPayments[pid]?.[k];try{if(q?.dbId){let {error}=await sb.from("player_funds").update({amount:0,status:"unpaid",paid_at:null}).eq("id",q.dbId);if(error)throw error}data.fundPayments[pid][k]={amount:0,status:"unpaid",paidAt:"",dbId:q?.dbId};renderAll();toast("Payment marked unpaid")}catch(e){console.error(e);toast("Payment update failed")}}
function changeFundMonth(delta){let x=$("#fundMonthView"),d=new Date(x.value+"-01T00:00:00");d.setMonth(d.getMonth()+delta);x.value=monthKey(d);renderFunds()}
function expenseForm(){return `<span class="section-kicker">FUND EXPENSE</span><h2>Record fund use</h2><div class="form-grid"><div class="form-group full"><label>Expense / use</label><input id="eTitle" placeholder="Ground booking, balls, kit, transport..."></div><div class="form-group"><label>Amount (PKR)</label><input id="eAmount" type="number" min="1"></div><div class="form-group"><label>Date</label><input id="eDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="form-group full"><label>Details</label><input id="eNote" placeholder="What was purchased / paid?"></div></div><div class="modal-actions"><button class="ghost-btn" onclick="closeModal()">Cancel</button><button class="primary-btn" id="saveExpense">Save expense</button></div>`}
async function addExpense(){if(!isAdmin())return login();openModal(expenseForm());$("#saveExpense").onclick=async()=>{const title=$("#eTitle").value.trim(),amount=+$("#eAmount").value;if(!title||!amount)return toast("Enter expense and amount");try{const {data:r,error}=await sb.from("fund_expenses").insert({title,amount,expense_date:$("#eDate").value,note:$("#eNote").value.trim()}).select().single();if(error)throw error;data.expenses.push({id:String(r.id),title,amount,date:$("#eDate").value,note:$("#eNote").value.trim()});closeModal();renderAll();toast("Fund use recorded")}catch(e){console.error(e);toast("Expense save failed")}}}
function performanceTotalsForPlayer(pid){
 const rows=data.performances.filter(x=>String(x.player_id)===String(pid));
 return rows.reduce((a,x)=>{a.runs+=+x.runs||0;a.balls+=+x.balls||0;a.dismissals+=+x.dismissals||0;a.wickets+=+x.wickets||0;a.overs+=+x.overs||0;a.conceded+=+x.conceded||0;a.matchIds.add(String(x.match_id));return a},{runs:0,balls:0,dismissals:0,wickets:0,overs:0,conceded:0,matchIds:new Set()});
}
function rebuildPlayerAggregates(){
 if(!data.players.length||!data.performances.length)return;
 data.players.forEach(p=>{const t=performanceTotalsForPlayer(p.id);if(t.matchIds.size){p.runs=t.runs;p.balls=t.balls;p.dismissals=t.dismissals;p.wickets=t.wickets;p.overs=t.overs;p.conceded=t.conceded;p.matches=t.matchIds.size;}});
}
function performanceForm(pf={}){
 const matchOpts='<option value="">Select match</option>'+data.matches.map(m=>`<option value="${esc(m.id)}" ${String(pf.match_id||'')===String(m.id)?'selected':''}>${esc(m.date||'')} • ${esc(m.opponent||'Match')} • ${esc(m.result||'')}</option>`).join('');
 const playerOpts='<option value="">Select player</option>'+data.players.map(p=>`<option value="${esc(p.id)}" ${String(pf.player_id||'')===String(p.id)?'selected':''}>${esc(p.name)} • #${esc(p.jersey||'-')}</option>`).join('');
 return `<div class="form-grid">
   <div class="form-group"><label>Match</label><select id="pfMatch">${matchOpts}</select></div>
   <div class="form-group"><label>Player</label><select id="pfPlayer">${playerOpts}</select></div>
   <div class="form-group"><label>Runs</label><input id="pfRuns" type="text" inputmode="decimal" autocomplete="off" min="0" value="${+pf.runs||0}"></div>
   <div class="form-group"><label>Balls faced</label><input id="pfBalls" type="text" inputmode="decimal" autocomplete="off" min="0" value="${+pf.balls||0}"></div>
   <div class="form-group"><label>Dismissed?</label><select id="pfDismissed"><option value="0" ${!pf.dismissals?'selected':''}>No</option><option value="1" ${+pf.dismissals?'selected':''}>Yes</option></select></div>
   <div class="form-group"><label>Overs bowled</label><input id="pfOvers" type="text" inputmode="decimal" autocomplete="off" min="0" step="0.1" value="${+pf.overs||0}"></div>
   <div class="form-group"><label>Runs conceded</label><input id="pfConceded" type="text" inputmode="decimal" autocomplete="off" min="0" value="${+pf.conceded||0}"></div>
   <div class="form-group"><label>Wickets</label><input id="pfWickets" type="text" inputmode="decimal" autocomplete="off" min="0" value="${+pf.wickets||0}"></div>
 </div><div class="modal-actions"><button class="primary-btn" id="savePerformance">${pf.id?'Update Performance':'Save Performance'}</button></div>`;
}
async function refreshAggregatesInDB(){
 for(const p of data.players){const t=performanceTotalsForPlayer(p.id);const row={runs:t.runs,balls:t.balls,dismissals:t.dismissals,wickets:t.wickets,overs:t.overs,conceded:t.conceded,matches:t.matchIds.size};const {error}=await sb.from('players').update(row).eq('id',p.id);if(error)throw error;Object.assign(p,row);}
}
function renderPerformance(){
 const table=$('#performanceTable');if(!table)return;
 table.innerHTML=data.performances.length?data.performances.map(x=>{const p=data.players.find(q=>String(q.id)===String(x.player_id)),m=data.matches.find(q=>String(q.id)===String(x.match_id));const strike=x.balls?fmt(x.runs/x.balls*100):'0.00',economy=x.overs?fmt(x.conceded/x.overs):'0.00';return `<tr><td>${esc(m?.date||'')} • ${esc(m?.opponent||'Unknown match')}</td><td><strong>${esc(p?.name||'Unknown player')}</strong></td><td>${x.runs} runs • ${x.balls} balls • ${x.dismissals?'Out':'Not out'}</td><td>${x.overs} ov • ${x.conceded} runs • ${x.wickets} wkts</td><td>${strike}</td><td>${economy}</td><td class="admin-only"><button class="small-btn" onclick="editPerformance('${x.id}')">Edit</button> <button class="small-btn danger" onclick="deletePerformance('${x.id}')">Delete</button></td></tr>`}).join(''):'<tr><td colspan="7"><div class="empty">No performances yet. Add a match first, then record each player separately.</div></td></tr>';
 updateAdminUI();
}
function addPerformance(){if(!isAdmin())return login();if(!data.matches.length)return toast('Record a match first.');if(!data.players.length)return toast('Add a player first.');openModal(`<span class="section-kicker">MATCH PERFORMANCE</span><h2>Add performance</h2><p style="color:var(--muted)">Choose the match and player. A different match creates a new record; the old match stays safe.</p>${performanceForm()}`);bindPerformanceSave();}
function bindPerformanceSave(existing=null){$('#savePerformance').onclick=async()=>{const match_id=$('#pfMatch').value,player_id=$('#pfPlayer').value;if(!match_id||!player_id)return toast('Select a match and player.');const payload={match_id:+match_id,player_id:+player_id,runs:+$('#pfRuns').value||0,balls:+$('#pfBalls').value||0,dismissals:+$('#pfDismissed').value||0,wickets:+$('#pfWickets').value||0,overs:+$('#pfOvers').value||0,runs_conceded:+$('#pfConceded').value||0};try{let q;if(existing){q=await sb.from('performances').update(payload).eq('id',existing.id).select().single()}else{q=await sb.from('performances').upsert(payload,{onConflict:'player_id,match_id'}).select().single()}if(q.error)throw q.error;const row={id:String(q.data.id),match_id:String(q.data.match_id),player_id:String(q.data.player_id),runs:+q.data.runs||0,balls:+q.data.balls||0,dismissals:+q.data.dismissals||0,wickets:+q.data.wickets||0,overs:+q.data.overs||0,conceded:+(q.data.runs_conceded??q.data.conceded)||0};if(existing){const i=data.performances.findIndex(x=>x.id===row.id);if(i>=0)data.performances[i]=row}else{const i=data.performances.findIndex(x=>String(x.player_id)===row.player_id&&String(x.match_id)===row.match_id);if(i>=0)data.performances[i]=row;else data.performances.push(row)}await refreshAggregatesInDB();closeModal();renderAll();toast(existing?'Performance updated':'Performance saved');}catch(e){console.error(e);toast('Performance save failed: '+e.message)}}}
async function editPerformance(id){if(!isAdmin())return login();const pf=data.performances.find(x=>x.id===id);if(!pf)return;openModal(`<span class="section-kicker">MATCH PERFORMANCE</span><h2>Edit performance</h2>${performanceForm(pf)}`);bindPerformanceSave(pf);}
async function deletePerformance(id){if(!isAdmin())return login();if(!confirm('Delete this match performance? Player totals will be recalculated.'))return;try{const {error}=await sb.from('performances').delete().eq('id',id);if(error)throw error;data.performances=data.performances.filter(x=>x.id!==id);await refreshAggregatesInDB();renderAll();toast('Performance deleted');}catch(e){console.error(e);toast('Performance delete failed: '+e.message)}}
function clearPagePerformanceForm(){
  ["#pagePfPlayer","#pagePfMatch"].forEach(s=>{const el=$(s);if(el)el.value="";});
  ["#pagePfRuns","#pagePfBalls","#pagePfOvers","#pagePfConceded","#pagePfWickets"].forEach(s=>{const el=$(s);if(el)el.value=0;});
  if($("#pagePfDismissed"))$("#pagePfDismissed").value="0";
  updatePerformancePreview();
}
function populatePerformanceSelectors(selectedPlayer="",selectedMatch=""){
  const ps=$("#pagePfPlayer"), ms=$("#pagePfMatch");
  if(ps) ps.innerHTML='<option value="">Select player</option>'+data.players.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}${p.jersey?` • #${esc(p.jersey)}`:""} • ${esc(p.role||"Player")}</option>`).join("");
  if(ms) ms.innerHTML='<option value="">Select match</option>'+data.matches.map(m=>`<option value="${esc(m.id)}">${esc(m.date||"")} • ${esc(m.opponent||"Match")} • ${esc(m.result||"")}</option>`).join("");
  if(ps)ps.value=selectedPlayer||"";
  if(ms)ms.value=selectedMatch||"";
}
function updatePerformancePreview(){
  const r=+($("#pagePfRuns")?.value||0),b=+($("#pagePfBalls")?.value||0),o=+($("#pagePfOvers")?.value||0),c=+($("#pagePfConceded")?.value||0);
  if($("#previewSR"))$("#previewSR").textContent=b?fmt(r/b*100):"0.00";
  if($("#previewEco"))$("#previewEco").textContent=o?fmt(c/o):"0.00";
  const pid=$("#pagePfPlayer")?.value;
  const t=pid?performanceTotalsForPlayer(pid):{runs:0,dismissals:0};
  const d=(t.dismissals||0)+(+($("#pagePfDismissed")?.value||0));
  if($("#previewAvg"))$("#previewAvg").textContent=d?fmt(((t.runs||0)+r)/d):fmt((t.runs||0)+r);
}
function renderPerformance(){
  const table=$("#performanceTable"); if(!table)return;
  populatePerformanceSelectors($("#pagePfPlayer")?.value||"","");
  const rows=[...data.performances].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  table.innerHTML=rows.length?rows.map(x=>{
    const p=data.players.find(q=>String(q.id)===String(x.player_id));
    const m=data.matches.find(q=>String(q.id)===String(x.match_id));
    const strike=x.balls?fmt(x.runs/x.balls*100):"0.00", economy=x.overs?fmt(x.conceded/x.overs):"0.00";
    return `<tr><td><strong>${esc(m?.opponent||"Unknown match")}</strong><br><small>${esc(m?.date||"")}</small></td>
      <td><strong>${esc(p?.name||"Unknown player")}</strong><br><small>${esc(p?.role||"Player")}</small></td>
      <td>${x.runs}</td>
      <td>${(() => { const pt=performanceTotalsForPlayer(x.player_id); return pt.dismissals?fmt(pt.runs/pt.dismissals):fmt(pt.runs); })()}</td>
      <td>${strike}</td><td>${economy}</td>
      <td class="admin-only"><button class="small-btn" onclick="editPerformance('${x.id}')">Edit</button> <button class="small-btn danger" onclick="deletePerformance('${x.id}')">Delete</button></td></tr>`;
  }).join(""):'<tr><td colspan="7"><div class="empty">No performances yet. Add a player and a match first.</div></td></tr>';
  updateAdminUI();
}
function addPerformance(){
  if(!isAdmin())return login();
  nav("performance");
  clearPagePerformanceForm();
  toast("Ready — select a player and match");
}
async function savePagePerformance(){
  if(!isAdmin()) return login();
  const match_id=$("#pagePfMatch")?.value;
  const player_id=$("#pagePfPlayer")?.value;
  if(!match_id || !player_id) return toast("Select a player and match first.");

  const num=(selector)=>{
    const v=String($(selector)?.value ?? "").trim().replace(/,/g,"");
    const n=Number(v);
    return Number.isFinite(n) && n>=0 ? n : 0;
  };

  const payload={
    match_id:Number(match_id),
    player_id:Number(player_id),
    runs:num("#pagePfRuns"),
    balls:num("#pagePfBalls"),
    dismissals:$("#pagePfDismissed")?.value==="1"?1:0,
    wickets:num("#pagePfWickets"),
    overs:num("#pagePfOvers"),
    runs_conceded:num("#pagePfConceded")
  };

  try{
    // Find only this player's record for THIS match.
    // A different match always gets its own row; earlier matches are untouched.
    const find=await sb.from("performances")
      .select("id")
      .eq("player_id",payload.player_id)
      .eq("match_id",payload.match_id)
      .limit(1);
    if(find.error) throw find.error;

    let row;
    let updated=false;
    const existing=find.data?.[0];

    if(existing){
      const q=await sb.from("performances")
        .update(payload)
        .eq("id",existing.id)
        .select("*")
        .single();
      if(q.error) throw q.error;
      row=q.data;
      updated=true;
    }else{
      const q=await sb.from("performances")
        .insert(payload)
        .select("*")
        .single();
      if(q.error) throw q.error;
      row=q.data;
    }

    const local={
      id:String(row.id),
      match_id:String(row.match_id),
      player_id:String(row.player_id),
      runs:Number(row.runs)||0,
      balls:Number(row.balls)||0,
      dismissals:Number(row.dismissals)||0,
      wickets:Number(row.wickets)||0,
      overs:Number(row.overs)||0,
      conceded:Number(row.runs_conceded ?? row.conceded)||0,
      created_at:row.created_at
    };

    const i=data.performances.findIndex(x=>String(x.id)===local.id);
    if(i>=0) data.performances[i]=local;
    else data.performances.push(local);

    await refreshAggregatesInDB();
    clearPagePerformanceForm();
    renderAll();
    toast(updated ? "Performance updated" : "Performance saved successfully");
  }catch(e){
    console.error("Performance save error:",e);
    toast("Performance save failed: "+(e.message||"Please check admin login and Supabase permissions."));
  }
}
async function editPerformance(pid){
  if(!isAdmin())return login();
  const pf=data.performances.find(x=>String(x.id)===String(pid)); if(!pf)return;
  nav("performance");
  populatePerformanceSelectors(String(pf.player_id),String(pf.match_id));
  $("#pagePfRuns").value=pf.runs||0; $("#pagePfBalls").value=pf.balls||0; $("#pagePfDismissed").value=pf.dismissals?"1":"0";
  $("#pagePfOvers").value=pf.overs||0; $("#pagePfConceded").value=pf.conceded||0; $("#pagePfWickets").value=pf.wickets||0;
  // Editing uses the same player+match upsert key, so only that match changes.
  window._editingPerformanceId=String(pf.id);
  updatePerformancePreview();
  toast("Edit the performance, then save");
}
async function deletePerformance(pid){
  if(!isAdmin())return login();
  if(!confirm("Delete this match performance? Player totals will be recalculated."))return;
  try{
    const {error}=await sb.from("performances").delete().eq("id",pid); if(error)throw error;
    data.performances=data.performances.filter(x=>String(x.id)!==String(pid));
    await refreshAggregatesInDB(); renderAll(); toast("Performance deleted");
  }catch(e){console.error(e);toast("Performance delete failed: "+e.message)}
}
function renderAnalytics(){
 let ps=[...data.players], maxR=Math.max(1,...ps.map(runs)),maxW=Math.max(1,...ps.map(wickets));
 $("#battingBars").innerHTML=ps.sort((a,b)=>runs(b)-runs(a)).slice(0,7).map(p=>`<div class="bar-row"><div class="bar-top"><b>${esc(p.name)}</b><span>${runs(p)} runs</span></div><div class="bar-track"><div class="bar-fill" data-width="${runs(p)/maxR*100}%"></div></div></div>`).join("")||"<span style='color:var(--muted)'>No player data.</span>";
 $("#bowlingBars").innerHTML=ps.sort((a,b)=>wickets(b)-wickets(a)).slice(0,7).map(p=>`<div class="bar-row"><div class="bar-top"><b>${esc(p.name)}</b><span>${wickets(p)} wickets</span></div><div class="bar-track"><div class="bar-fill" data-width="${wickets(p)/maxW*100}%"></div></div></div>`).join("")||"<span style='color:var(--muted)'>No player data.</span>";
 let t=totals();$("#analyticsKpis").innerHTML=[["Runs",t.runs],["Wickets",t.wickets],["Matches",data.matches.length],["Win rate",winRate()+"%"]].map(x=>`<div><b>${x[1]}</b><span>${x[0]}</span></div>`).join("");
 setTimeout(()=>$$(".bar-fill").forEach(x=>x.style.width=x.dataset.width),60);
}
function updateAdminUI(){let admin=isAdmin();$$('.admin-only').forEach(x=>x.style.display=admin?"":"none");$("#adminBtn").textContent=admin?"Admin Logout":"Admin Login"}
function login(){openModal(`<span class="section-kicker">SECURE AREA</span><h2>Admin login</h2><p style="color:var(--muted)">Sign in with your Supabase admin account.</p><div class="form-grid"><div class="form-group full"><label>Email</label><input id="loginUser" type="email" autocomplete="username" placeholder="Admin email"></div><div class="form-group full"><label>Password</label><input id="loginPass" type="password" autocomplete="current-password" placeholder="Password"></div></div><div class="modal-actions"><button class="ghost-btn" onclick="closeModal()">Cancel</button><button class="primary-btn" id="doLogin">Login</button></div>`);$("#doLogin").onclick=async()=>{try{const {data:r,error}=await sb.auth.signInWithPassword({email:$("#loginUser").value.trim(),password:$("#loginPass").value});if(error)throw error;adminSession=r.session;closeModal();updateAdminUI();toast("Admin signed in")}catch(e){console.error(e);toast("Login failed")}}}
async function logout(){await sb.auth.signOut();adminSession=null;updateAdminUI();toast("Admin logged out")}
$$('nav a').forEach(a=>a.onclick=e=>{e.preventDefault();nav(a.dataset.page)});
$("#mobileMenu").onclick=()=>$(".topbar").classList.toggle("nav-open");
$("#modalClose").onclick=closeModal;$("#modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
$("#adminBtn").onclick=()=>isAdmin()?logout():login();
$("#addPlayerBtn").onclick=addPlayer;$("#addMatchBtn").onclick=addMatch;$("#addExpenseBtn").onclick=addExpense;$("#fundMonthView").onchange=renderFunds;$("#fundPrevMonth").onclick=()=>changeFundMonth(-1);$("#fundNextMonth").onclick=()=>changeFundMonth(1);
$("#savePagePerformanceBtn").onclick=savePagePerformance;
$("#clearPerformanceBtn").onclick=clearPagePerformanceForm;
["#pagePfRuns","#pagePfBalls","#pagePfOvers","#pagePfConceded","#pagePfWickets","#pagePfDismissed","#pagePfPlayer"].forEach(s=>$(s)?.addEventListener("input",updatePerformancePreview));
["#pagePfRuns","#pagePfBalls","#pagePfOvers","#pagePfConceded","#pagePfWickets","#pagePfDismissed","#pagePfPlayer"].forEach(s=>$(s)?.addEventListener("change",updatePerformancePreview));
$("#playerSearch").oninput=renderPlayers;$("#roleFilter").onchange=renderPlayers;
$$('.ranking-tabs button').forEach(b=>b.onclick=()=>{$$('.ranking-tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentRank=b.dataset.rank;renderRankings()});
$("#themeBtn").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem(THEME,document.body.classList.contains("light")?"light":"dark");$("#themeBtn").textContent=document.body.classList.contains("light")?"🌙":"☀️"};
if(localStorage.getItem(THEME)==="light"){$("body").classList.add("light");$("#themeBtn").textContent="🌙"}
$("#year").textContent=new Date().getFullYear();
let initial=(location.hash||"#dashboard").slice(1);nav(["dashboard","players","matches","rankings","performance","leader","analytics","funds"].includes(initial)?initial:"dashboard");
sb.auth.getSession().then(({data:r})=>{adminSession=r.session;updateAdminUI();loadFromSupabase()});
sb.auth.onAuthStateChange((_event,session)=>{adminSession=session;updateAdminUI()});
