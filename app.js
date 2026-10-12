'use strict';
// MÁS CASA, MÁS PROBLEMAS: a Weasel Hub parody that roasts the Rebuilding Morehouse's (SHADYNASTY). Everything is computed in the
// browser from public Sleeper data, ESPN's public scoreboard and FantasyCalc dynasty SF values. Fantasy decisions only.
var API='https://api.sleeper.app/v1/',LEAGUE='1312055708249767936',TEAM="rebuilding morehouse's",MHJ='11628';
var ELIG={QB:['QB'],RB:['RB'],WR:['WR'],TE:['TE'],K:['K'],DEF:['DEF'],FLEX:['RB','WR','TE'],WRRB_FLEX:['RB','WR'],REC_FLEX:['WR','TE'],SUPER_FLEX:['QB','RB','WR','TE']};
var ORD=['','1st','2nd','3rd','4th','5th'];
var ESPN_FIX={WSH:'WAS',LA:'LAR',JAC:'JAX'};
function $(s){return document.querySelector(s)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function f1(n){return (Math.round((+n||0)*10)/10).toFixed(1)}
function int(n){return Math.round(+n||0).toLocaleString('en-US')}
function sgn(n){return (n>=0?'+':'−')+int(Math.abs(n))}
function ordn(n){var s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])}
function norm(s){return String(s||'').replace(/[\u2018\u2019]/g,"'").trim().toLowerCase()}
function J(u,o){return fetch(u,o||{}).then(function(r){if(!r.ok)throw new Error(r.status+' '+u.replace(/\?.*/,''));return r.json()})}
function S(u){return J(API+u)}
var LS={get:function(k){try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
function phi(z){return Math.exp(-z*z/2)/2.5066282746}
function Phi(z){var t=1/(1+0.2316419*Math.abs(z)),d=0.3989423*Math.exp(-z*z/2),p=d*t*(0.3193815+t*(-0.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>0?1-p:p}
function hash(s){var h=2166136261;s=String(s);for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function pick(arr,seed){return arr[hash(seed)%arr.length]}
function fill(t,o){return t.replace(/\{(\w+)\}/g,function(m,k){return o[k]==null?m:o[k]})}
function tstr(t){return new Date(t).toLocaleString('en-US',{timeZone:'America/New_York',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET'}
var D={};

// ---------------- data ----------------
function fcValues(){var k='mc:fc1',c=LS.get(k);if(c&&Date.now()-c.at<6*36e5)return Promise.resolve(c);
  return J('https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&numTeams=12&ppr=1').then(function(d){var v={at:Date.now(),p:{},a:{},n:{},pk:{}};
    d.forEach(function(x){var pl=x.player||{};if(pl.position==='PICK'){v.pk[pl.name]=x.value;return}if(!pl.sleeperId)return;v.p[pl.sleeperId]=x.value;v.n[pl.sleeperId]=pl.name;if(pl.maybeAge)v.a[pl.sleeperId]=Math.round(pl.maybeAge*10)/10});
    LS.set(k,v);return v}).catch(function(){return c||{at:0,p:{},a:{},n:{},pk:{}}})}
function pickValue(season,round,slot){var V=D.V,n=12,tier=slot?(slot<=n/3?' (Early)':slot>2*n/3?' (Late)':' (Mid)'):'';
  return V.pk[season+' '+ORD[round]+tier]||V.pk[season+' '+ORD[round]]||V.pk[season+' '+ORD[round]+' (Mid)']||(V.pk[(season-1)+' '+ORD[round]]||0)*0.9||0}
function slimPlayers(){return J('../weaselhub/data/players.json?_='+Math.floor(Date.now()/6e5)).then(function(d){return d.p||{}}).catch(function(){return {}})}
function loadGames(n){return J('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week='+D.week+'&seasontype=2&dates='+D.season).then(function(sb){var g={};
  (sb.events||[]).forEach(function(ev){var c=ev.competitions[0],st=c.status||ev.status,state=st.type.state,per=st.period||0,clk=st.clock||0,frac=1;
    if(state==='in'){var el=per<=4?((per-1)*900+(900-clk))/3600:0.985;frac=Math.max(0.015,Math.min(1,1-el))}else if(state==='post')frac=0;
    var info={state:state,frac:frac,detail:st.type.shortDetail,kick:new Date(ev.date),name:ev.shortName};
    c.competitors.forEach(function(x){g[ESPN_FIX[x.team.abbreviation]||x.team.abbreviation]=info})});if(!Object.keys(g).length)throw new Error('empty');D.gOk=1;return g}).catch(function(e){if(!n)return new Promise(function(r){setTimeout(r,1500)}).then(function(){return loadGames(1)});console.info('ESPN scoreboard unavailable',e.message);D.gOk=0;return D.games||{}})}
function loadProj(){return J(API.replace('/v1/','/')+'projections/nfl/'+D.season+'/'+D.week+'?season_type=regular&position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=K&position[]=DEF')
  .then(function(a){var m={};a.forEach(function(x){m[x.player_id]={s:x.stats||{},team:x.team,pl:x.player||{}}});return m}).catch(function(){return {}})}
function scoreStats(s,ss){var t=0;for(var k in ss){var w=ss[k];if(!w)continue;var v=s[k];if(v==null)continue;t+=v*w}return t}
function proj(id){var p=D.proj[id];if(!p||!p.s)return 0;var v=scoreStats(p.s,D.lg.scoring_settings||{});if(!isFinite(v)||(v===0&&p.s.pts_ppr))v=p.s.pts_ppr||0;return v}
function pinfo(id){var db=D.P[id]||{},pr=D.proj[id],pl=pr&&pr.pl||{};if(isNaN(+id))return {id:id,n:id+' D/ST',pos:'DEF',fp:['DEF'],team:id};
  var n=D.V.n[id]||db.n||((pl.first_name||'')+' '+(pl.last_name||'')).trim()||(D.H&&D.H.names[id])||'Player '+id;
  return {id:id,n:n,pos:(db.p&&db.p[0])||pl.position||'?',fp:db.p||pl.fantasy_positions||[pl.position],team:db.t||pr&&pr.team||pl.team||null,inj:db.i||pl.injury_status||null,body:db.b}}
function head(id){if(isNaN(+id))return '<img class="hs" loading="lazy" alt="" src="https://sleepercdn.com/images/team_logos/nfl/'+String(id).toLowerCase()+'.png">';
  return '<img class="hs" loading="lazy" alt="" src="https://sleepercdn.com/content/nfl/players/thumb/'+id+'.jpg" onerror="this.style.visibility=\'hidden\'">'}
function posChip(p){return '<span class="pos '+esc(p)+'">'+esc(p||'?')+'</span>'}
function teamName(rid){var r=D.R[rid],u=r&&D.U[r.owner_id];return u?((u.metadata&&u.metadata.team_name)||u.display_name).replace(/\s*🏆+/g,'').trim():'Team '+rid}
function val(id){return D.V.p[id]||0}

// standings + projected 2027 rookie order (Brett's league rule: non-playoff teams by LOWEST max PF, then playoff teams worst seed first)
function standings(){var lg=D.lg,pt=lg.settings.playoff_teams||6,pws=lg.settings.playoff_week_start||15;
  var arr=Object.keys(D.R).map(function(k){var s=D.R[k].settings||{},g=(s.wins||0)+(s.losses||0)+(s.ties||0),mpf=(s.ppts||0)+(s.ppts_decimal||0)/100,pf=(s.fpts||0)+(s.fpts_decimal||0)/100;
    var left=Math.max(0,(pws-1)-g);return {rid:+k,w:s.wins||0,l:s.losses||0,g:g,pf:pf,mpf:mpf,pace:mpf+(g?mpf/g:0)*left,bench:mpf-pf}});
  var desc=arr.slice().sort(function(a,b){return b.w-a.w||b.pf-a.pf});desc.forEach(function(x,i){x.rank=i+1;x.po=i<pt});
  var order=desc.filter(function(x){return !x.po}).sort(function(a,b){return a.pace-b.pace}).concat(desc.filter(function(x){return x.po}).reverse());order.forEach(function(x,i){x.slot=i+1});
  var o={};arr.forEach(function(x){o[x.rid]=x});o._order=order;o._pt=pt;return o}

function boot(){
  Promise.all([S('state/nfl'),S('league/'+LEAGUE),S('league/'+LEAGUE+'/users'),S('league/'+LEAGUE+'/rosters'),S('league/'+LEAGUE+'/traded_picks').catch(function(){return []}),fcValues(),slimPlayers(),J('data/hist.json?v=1').catch(function(){return null})]).then(function(r){
    D.state=r[0];D.lg=r[1];D.season=D.lg.season;D.week=+(new URLSearchParams(location.search).get('w')||D.state.display_week||D.state.week||1);
    D.U={};r[2].forEach(function(u){D.U[u.user_id]=u});D.R={};r[3].forEach(function(x){D.R[x.roster_id]=x});D.tp=r[4]||[];D.V=r[5];D.P=r[6];D.H=r[7];
    var me=r[3].filter(function(x){var u=D.U[x.owner_id];return u&&norm(u.metadata&&u.metadata.team_name)===TEAM})[0];
    if(!me)throw new Error('could not find the Rebuilding Morehouse\'s. Did he finally rename it? (Growth?)');
    D.me=me.roster_id;D.uid=me.owner_id;
    $('#sub').innerHTML='WEEK '+D.week+'<br>STILL BUILDING';
    var wks=[];for(var w=1;w<=D.week;w++)wks.push(w);
    return Promise.all([loadGames(),loadProj(),Promise.all(wks.map(function(w){return S('league/'+LEAGUE+'/matchups/'+w).catch(function(){return []})})),
      Promise.all([0].concat(wks).concat([D.week+1]).map(function(w){return S('league/'+LEAGUE+'/transactions/'+w).catch(function(){return []})}))])}).then(function(r){
    D.games=r[0];D.proj=r[1];D.M=r[2];D.TX=[].concat.apply([],r[3]).filter(function(t){return t&&t.status==='complete'});
    D.st=standings();render()}).catch(function(e){console.error(e);$('#body').innerHTML='<section class="panel err">The foundation cracked: '+esc(e.message)+'. <a href="javascript:location.reload()">Pour it again</a></section>'})}

// ---------------- trades ----------------
function sideOf(t,rid){// what roster `rid` got and gave in Sleeper trade t. picks resolved to the drafted player when that draft happened
  var got=[],gave=[],pk=t.draft_picks||t.pk||[];
  Object.keys(t.adds||{}).forEach(function(pid){var to=+t.adds[pid];(to===rid?got:gave).push(pItem(pid))});
  pk.forEach(function(p){var to=p.owner_id!=null?p.owner_id:p.to,fr=p.previous_owner_id!=null?p.previous_owner_id:p.fr,o=p.roster_id!=null?p.roster_id:p.o,s=p.season||p.s,rd=p.round||p.r;
    if(to!==rid&&fr!==rid)return;(to===rid?got:gave).push(pkItem(s,rd,o,t))});
  return {got:got,gave:gave,gv:got.reduce(function(a,x){return a+x.v},0),cv:gave.reduce(function(a,x){return a+x.v},0)}}
function pItem(pid){var pi=pinfo(pid);return {id:pid,n:pi.n,pos:pi.pos,v:val(pid)}}
function pkItem(s,rd,o,t){var drafted=D.H&&D.H.picks[s+'|'+rd+'|'+o];
  if(drafted){var pid=drafted[0],pi=pinfo(pid);return {id:pid,n:s+' '+ORD[rd]+' → '+pi.n,pos:'PICK',v:val(pid),pk:1,drafted:1}}
  var cur=+s===+D.season+1,slot=cur&&D.st[o]?D.st[o].slot:null;
  var who=t&&t.tn?t.tn[o]:(+s>=+D.season?teamName(o):null);
  return {n:s+' '+ORD[rd]+(slot?' (proj #'+slot+')':'')+(who?' · via '+who.replace(/\s*🏆+/g,''):''),pos:'PICK',v:pickValue(+s,rd,slot),pk:1,slot:slot,o:o}}
function curTrades(){return D.TX.filter(function(t){return t.type==='trade'&&(t.roster_ids||[]).indexOf(D.me)>=0}).sort(function(a,b){return (b.status_updated||0)-(a.status_updated||0)})}
function allTrades(){var out=[];curTrades().forEach(function(t){var s=sideOf(t,D.me);s.season=D.season;s.at=t.status_updated;s.wk=t.leg;s.with=(t.roster_ids||[]).filter(function(x){return x!==D.me}).map(teamName).join(', ');out.push(s)});
  ((D.H&&D.H.trades)||[]).forEach(function(t){var s=sideOf(t,t.rid);s.season=t.s;s.at=t.at;s.wk=t.wk;s.with=Object.keys(t.tn).filter(function(k){return +k!==t.rid}).map(function(k){return (t.tn[k]||'').replace(/\s*🏆+/g,'')}).join(', ');out.push(s)});
  out.forEach(function(s){s.d=s.gv-s.cv});return out}
function itemsHTML(a){return a.length?a.map(function(x){return '<div class="it">'+(x.pk&&!x.drafted?'<span class="pos PICK" style="flex:0 0 auto">PICK</span>':head(x.id))+'<span>'+esc(x.n)+'</span><b>'+int(x.v)+'</b></div>'}).join(''):'<div class="small muted">Nothing. Literally nothing.</div>'}

function heroHTML(){
  var wk=curTrades().filter(function(t){return +t.leg===+D.week||Date.now()-(t.status_updated||0)<7*864e5});
  var t=wk.filter(function(t){return t.adds&&t.adds[MHJ]!=null})[0]||wk[0]||curTrades()[0];
  if(!t)return '<section class="panel" id="trade"><h2>🚨 Breaking</h2><div>No trades this week. He\'s just staring at the trade screen, cursor hovering over "Accept". Give it an hour.</div></section>';
  var s=sideOf(t,D.me),d=s.gv-s.cv,isM=t.adds&&t.adds[MHJ]!=null&&+t.adds[MHJ]!==D.me,partner=(t.roster_ids||[]).filter(function(x){return x!==D.me})[0];
  var ptn=teamName(partner),pst=D.st[partner]||{},star=s.gave.slice().sort(function(a,b){return b.v-a.v})[0]||{n:'his dignity'};
  var pct=s.cv?d/s.cv:0,lines=[];
  if(d>0)lines.push('First good trade in 6 years. Suspicious. '+pick(['Somebody check if '+esc(ptn)+' got hacked.','He WON a trade (+'+int(d)+'). Alert the Commish, run the tape back, this has to be collusion with the universe.','He won by '+int(d)+' value points, which is roughly one (1) Tyjae Spears handcuff. Year 6, baby, the rebuild produced something.'],t.transaction_id)+' (Note: he traded a 24-year-old WR1 for a pick that\'s worth about the same and he just has to hit on it. His trade history is reviewed below. Hold your applause.)');
  else if(pct>-0.1)lines.push('Basically even ('+sgn(d)+'). For this franchise that\'s a parade. Historians will call it "the year he didn\'t get fleeced."');
  else lines.push(pick(['Down '+int(-d)+' in value. He didn\'t rebuild, he donated to a contender.','Lost '+int(-d)+' value. '+esc(ptn)+' should send a thank-you card and maybe a fruit basket.','-'+int(-d)+'. The only thing he\'s building is '+esc(ptn)+'\'s dynasty.'],t.transaction_id));
  s.got.filter(function(x){return x.pk&&x.slot}).forEach(function(x){lines.push('That pick comes from '+esc(teamName(x.o))+' ('+(D.st[x.o]?D.st[x.o].w+'-'+D.st[x.o].l:'')+'), currently projected <b>#'+x.slot+'</b>. '+(x.slot>=9?'A late 1st from a contender. Wow. Rookie fever: sleeper-pick edition.':x.slot>=5?'A mid 1st. The most "fine" asset in football.':'An early 1st. Fine, that one actually slaps. Still suspicious.'))});
  if(isM)lines.push('MHJ: '+esc(pinfo(MHJ).team||'')+' WR, age '+(D.V.a[MHJ]||'?')+'. Exactly the kind of young stud you build AROUND, which is why he got moved. Rebuild logic: tear down the one load-bearing wall.');
  var stamp=d>0?'<span class="stamp g">WON?? ON PAPER</span>':'<span class="stamp">FLEECED</span>';
  return '<section class="panel" id="trade"><h2>🚨 Breaking: '+(isM?'Marvin Harrison Jr. Traded':'He Traded Again')+' <small>'+tstr(t.status_updated)+'</small></h2>'+
   '<div class="small muted" style="margin-bottom:8px">Rebuilding Morehouse\'s ↔ '+esc(ptn)+(pst.w!=null?' ('+pst.w+'-'+pst.l+')':'')+' · Week '+esc(t.leg)+' · FantasyCalc dynasty SF values, live</div>'+
   '<div class="tr"><div><h4>HE GAVE</h4>'+itemsHTML(s.gave)+'<div class="tot"><span>Total</span><span>'+int(s.cv)+'</span></div></div><div><h4>HE GOT</h4>'+itemsHTML(s.got)+'<div class="tot"><span>Total</span><span>'+int(s.gv)+'</span></div></div></div>'+
   '<div style="display:flex;align-items:center;gap:10px;margin-top:10px"><div class="big" style="color:'+(d>0?'var(--for)':'var(--ag)')+'">'+sgn(d)+'</div><div class="small muted">value delta for the rebuild<br>('+(s.cv?(pct>=0?'+':'')+Math.round(pct*100)+'%':'')+')</div>'+stamp+'</div>'+
   '<div class="verdict"><p>'+lines.join('</p><p>')+'</p></div></section>'}

// ---------------- live ----------------
function line(id,pp){var pi=pinfo(id),g=pi.team?D.games[pi.team]:null,pr=proj(id),act=+(pp&&pp[id])||0,state=g?g.state:D.gOk?'none':(act?'post':'pre');
  var rem=state==='pre'?pr:state==='in'?pr*g.frac:0;return {id:id,pi:pi,g:g,proj:pr,act:act,rem:rem,fin:state==='pre'?pr:act+rem,state:state}}
function side(m){var ls=(m.starters||[]).map(function(id){return id&&id!=='0'?line(id,m.players_points):{empty:1,proj:0,act:0,rem:0,fin:0,state:'none'}});
  var o={rid:m.roster_id,ls:ls,act:+m.points||0,fin:0,rem:0,proj:0};ls.forEach(function(l){o.fin+=l.fin;o.rem+=l.rem;o.proj+=l.proj});o.fin=o.act+o.rem;return o}
function liveHTML(){var M=D.M[D.week-1]||[],mm=M.filter(function(x){return x.roster_id===D.me})[0];if(!mm||mm.matchup_id==null)return '<section class="panel" id="live"><h2>📺 Live</h2>No matchup this week. Even the schedule is tanking for him.</section>';
  var om=M.filter(function(x){return x.matchup_id===mm.matchup_id&&x.roster_id!==D.me})[0],A=side(mm),B=side(om),tot=Math.max(1,A.proj+B.proj),sig=Math.max(1.5,Math.max(10,0.13*tot)*Math.sqrt(Math.max(0,(A.rem+B.rem)/tot))),m=A.fin-B.fin;
  var p=A.rem+B.rem<0.05?(m>0?1:m<0?0:0.5):Phi(m/sig),pc=Math.round(p*1000)/10;
  var oddsTxt=p>=0.5?'Win '+Math.round(p*100)+'%. Wait, what? Refresh. That can\'t be right.':p>=0.2?'Win '+Math.round(p*100)+'%. Dangerously close to accidentally ruining the tank.':p>=0.01?'Win '+(pc<1?pc.toFixed(1):Math.round(pc))+'%... generous.':p>0?'Win <0.1%. 🎺 wah wah wahhh.':'Win 0%. Mathematically eliminated from this week. The tank is safe. 🎺';
  var ou=D.U[D.R[om.roster_id].owner_id]||{},mu=D.U[D.uid]||{};
  function tm(u,s,nm,lead){return '<div class="tm">'+(u.avatar?'<img class="av" loading="lazy" alt="" src="https://sleepercdn.com/avatars/thumbs/'+u.avatar+'">':'<span class="av"></span>')+'<div class="nm">'+esc(nm)+'<small>'+s.ls.filter(function(l){return l.state==='pre'}).length+' yet to play · proj '+f1(s.fin)+'</small></div><div class="pts"><b style="color:'+(lead?'var(--for)':'var(--ag)')+'">'+f1(s.act)+'</b></div></div>'}
  var left=A.ls.filter(function(l){return !l.empty&&(l.state==='pre'||l.state==='in')}),empty=A.ls.filter(function(l){return l.empty}).length,dead=A.ls.filter(function(l){return !l.empty&&/^(Out|IR|Inactive|Sus|PUP)$/.test(l.pi.inj||'')&&l.act===0});
  var bye=A.ls.filter(function(l){return !l.empty&&l.state==='none'&&l.act===0&&!dead.some(function(d){return d.id===l.id})});
  var need=B.act-A.act,WL=['{n}: {p} projected. Even if he goes nuclear, that\'s a rounding error.','{n} hasn\'t played yet. Thoughts and prayers ({p} proj).','{n} ({p} proj) has the weight of the whole franchise on his back. Again.','{n}: {p} proj. The cavalry is one guy on a scooter.'];
  var wl=left.length?left.map(function(l){return '<div class="row">'+head(l.id)+'<div class="fx"><div class="ft">'+esc(l.pi.n)+' '+posChip(l.pi.pos)+' <span class="pill'+(l.state==='in'?' r':'')+'">'+(l.state==='in'?'LIVE':l.g?esc(l.g.detail):'')+'</span></div><div class="small muted">'+fill(pick(WL,l.id+D.week),{n:esc(l.pi.n.split(' ').slice(-1)[0]),p:f1(l.rem)})+'</div></div></div>'}).join(''):'<div class="small">Nobody left. Everyone already played. It is what it is, and what it is is '+f1(A.act)+'.</div>';
  var notes=[];if(need>0&&left.length)notes.push('Needs '+f1(need)+' to tie with '+left.length+' guy'+(left.length>1?'s':'')+' left projected for '+f1(A.rem)+'. '+(A.rem<need?'Math says no. Math has been saying no since 2021.':'Possible! Don\'t tell him, he\'ll start making lineup decisions.'));
  if(empty)notes.push('🚧 '+empty+' EMPTY starting slot'+(empty>1?'s':'')+'. Under construction. Permit pending.');
  dead.forEach(function(l){notes.push('🪦 Started '+esc(l.pi.n)+' ('+esc(l.pi.inj)+(l.pi.body?', '+esc(l.pi.body):'')+'). Zero points, full commitment.')});
  bye.forEach(function(l){notes.push('🛌 '+esc(l.pi.n)+' scored 0 (bye/no game). Bold lineup strategy.')});
  return '<section class="panel" id="live"><h2>📺 Live: Week '+D.week+' <small>'+(A.rem+B.rem<0.05?'FINAL-ISH':'SUNDAY')+'</small></h2>'+tm(mu,A,'Rebuilding Morehouse\'s',A.act>=B.act)+tm(ou,B,teamName(om.roster_id),B.act>A.act)+
   '<div class="wp"><b style="color:var(--ag)">'+oddsTxt+'</b></div><div class="wp"><div class="bar"><i style="width:'+Math.max(1,Math.round(p*100))+'%"></i></div></div>'+
   (notes.length?'<div class="verdict" style="font-size:14px">'+notes.join('<br>')+'</div>':'')+'<h3>Who\'s Left</h3>'+wl+'<div class="hint">Win odds: projected margin (live points + Sleeper projections for what\'s left, scaled by ESPN game clock) under a normal approximation. Same math as Weasel Hub, much sadder output.</div></section>'}

// ---------------- reverse start/sit ----------------
function revHTML(){var r=D.R[D.me],M=D.M[D.week-1]||[],mm=M.filter(function(x){return x.roster_id===D.me})[0]||{},st=(mm.starters||r.starters||[]).filter(function(x){return x&&x!=='0'});
  var bench=(r.players||[]).filter(function(x){return st.indexOf(x)<0&&(r.reserve||[]).indexOf(x)<0&&(r.taxi||[]).indexOf(x)<0});
  var S1=st.map(function(id){return line(id,mm.players_points)}).filter(function(l){return l.state==='pre'}).sort(function(a,b){return b.proj-a.proj});
  var anyPre=S1.length>0;
  var pool=anyPre?S1:st.map(function(id){var l=line(id,mm.players_points);l.v=val(id);return l}).sort(function(a,b){return b.v-a.v});
  var B=bench.map(function(id){var l=line(id,mm.players_points);l.v=val(id);return l}).sort(function(a,b){return (anyPre?a.proj-b.proj:a.v-b.v)});
  var R=['Bench {x}. He\'s projected for {p}, which risks a WIN, which risks pick #{s}. Unacceptable.','Sit {x} ({p} proj). Points are a liability in Year 6 of the plan.','{x} is too good for this lineup. Bench him before he scores a garbage-time TD and ruins everything.','{x}: BENCH. Strong. The process demands it.'],
    Q=['Start {y} instead ({p} proj). Fits the culture.','Slide in {y}. Nobody has ever been blamed for a {p}-point performance. Nobody has ever checked.','{y} gets the nod. Upside: none. Downside: also none. Perfect.'];
  var rows=pool.slice(0,3).map(function(x,i){var y=B[i];var s=D.st[D.me].slot;
    return '<div class="row">'+head(x.id)+'<div class="fx"><div class="ft">BENCH '+esc(x.pi.n)+' '+posChip(x.pi.pos)+' <span class="pill r">STRONG SIT</span></div><div class="small">'+fill(pick(R,x.id),{x:esc(x.pi.n),p:anyPre?f1(x.proj):'something',s:s})+'</div>'+(y?'<div class="small muted">'+fill(pick(Q,y.id),{y:esc(y.pi.n),p:anyPre?f1(y.proj):f1(y.act)})+'</div>':'')+'</div></div>'}).join('');
  return '<section class="panel" id="sit"><h2>🧠 Reverse Start/Sit <small>TANK OPTIMIZER™</small></h2><div class="hint" style="margin:0 0 6px">'+(anyPre?'Optimized against the remaining unlocked players this week. Weasel Hub finds the best lineup; this finds the worst one.':'Every game\'s locked, so these are next week\'s recommendations, ranked by dynasty value. Bench the good ones early, get ahead of it.')+'</div>'+(rows||'<div class="small">Lineup\'s already maximally bad. Nothing to optimize. Respect.</div>')+'</section>'}

// ---------------- pick watch ----------------
function picksHTML(){var st=D.st,me=st[D.me],ord=st._order,pt=st._pt,nxt=+D.season+1;
  var own=D.tp.filter(function(t){return +t.season===nxt&&t.round===1&&t.roster_id===D.me})[0];
  var holds=D.tp.filter(function(t){return +t.season===nxt&&t.round===1&&t.owner_id===D.me&&t.roster_id!==D.me}).map(function(t){return t.roster_id});
  var tank=ord.filter(function(x){return !x.po}).slice(0,4);
  var line1=me.slot===1?'Projected 1.01: still not enough. You can\'t draft your way out of six years of this. (He will try.)':'Projected '+'1.'+(me.slot<10?'0':'')+me.slot+'. '+(me.slot<=3?'So close to the 1.01 he can smell it. Smells like a rookie WR he\'ll trade in 18 months.':'Somehow not even winning the tank. Max PF too high: his BENCH is ruining the rebuild.');
  var rows=tank.map(function(x){return '<div class="row"><span class="slot" style="width:40px;height:40px;flex:0 0 40px;font-size:15px;line-height:40px">1.'+(x.slot<10?'0':'')+x.slot+'</span><div class="fx"><div class="ft">'+esc(teamName(x.rid))+(x.rid===D.me?' 👈':'')+'</div><div class="small muted">'+x.w+'-'+x.l+' · max PF '+f1(x.mpf)+' · pace '+int(x.pace)+'</div></div></div>'}).join('');
  var gap=tank[1]&&tank[0]?tank[1].pace-tank[0].pace:0;
  var tbC=ord.filter(function(x){return !x.po}).sort(function(a,b){return b.w-a.w||b.pf-a.pf})[0];
  return '<section class="panel" id="picks"><h2>🎯 Pick Watch <small>'+nxt+' ROOKIE DRAFT</small></h2><div style="display:flex;gap:12px;align-items:center"><span class="slot">1.'+(me.slot<10?'0':'')+me.slot+'</span><div class="verdict" style="margin:0;flex:1">'+line1+'</div></div>'+
   '<div class="small" style="margin-top:8px">'+(own&&own.owner_id!==D.me?'Plot twist: his own '+nxt+' 1st belongs to <b>'+esc(teamName(own.owner_id))+'</b>. Tanking for someone else. Altruism.':'He still owns his own '+nxt+' 1st, the one asset he hasn\'t found a way to trade yet. Give it time.')+(holds.length?' Also holds '+holds.map(function(r){return esc(teamName(r))+'\'s (proj #'+st[r].slot+')'}).join(', ')+'.':'')+'</div>'+
   '<h3>The Tank Race (lowest max PF, non-playoff)</h3>'+rows+(me.slot===1&&gap?'<div class="hint">Lead in the tank race: '+int(gap)+' projected max PF. The most dominant thing he\'s done in years.</div>':'')+
   '<h3>🚽 The Toilet Bowl 2.13 Dream</h3><div class="small">The Toilet Bowl champ (winner of the losers bracket) gets a supplemental <b>2.13</b>. The dream: lose enough for the 1.01, then rip off a heater in December for the 2.13. Current Toilet Bowl favorite: <b>'+esc(teamName(tbC.rid))+'</b> ('+tbC.w+'-'+tbC.l+'). Rebuilding Morehouse\'s odds: about the same as the win odds above. The only playoffs he\'ll see this year come with a plunger.</div>'+
   '<div class="hint">League rule: picks 1-'+(12-pt)+' go to non-playoff teams by lowest max PF (Sleeper "potential points", bench included), paced over the regular season; playoff teams after. Top '+pt+' by record make it.</div></section>'}

// ---------------- news ----------------
function newsHTML(){var items=[],s=D.st[D.me],r=D.R[D.me],rank=D.st._order.slice().sort(function(a,b){return b.pf-a.pf}).map(function(x){return x.rid}).indexOf(D.me)+1;
  function add(k,h,b){items.push('<div class="news"><div class="kicker">'+k+'</div><div class="hl">'+h+'</div>'+(b?'<div class="small muted">'+b+'</div>':'')+'</div>')}
  var wkData=[];D.M.forEach(function(M,i){var m=M.filter(function(x){return x.roster_id===D.me})[0];if(!m||!m.points)return;var om=M.filter(function(x){return x.matchup_id===m.matchup_id&&x.roster_id!==D.me})[0];
    var sp=(m.starters||[]).map(function(id,j){return {id:id,p:+(m.starters_points||[])[j]||0}}).filter(function(x){return x.id&&x.id!=='0'});
    var osp=om?(om.starters||[]).map(function(id,j){return {id:id,p:+(om.starters_points||[])[j]||0}}):[];wkData.push({w:i+1,m:m,om:om,sp:sp,osp:osp,live:i+1===D.week})});
  // 1. his best skill player vs a kicker/DEF that week
  wkData.forEach(function(W){if(W.live&&wkData.length>1)return;var skill=W.sp.filter(function(x){var p=pinfo(x.id).pos;return p==='RB'||p==='WR'}).sort(function(a,b){return b.p-a.p});
    var k=W.osp.filter(function(x){var p=pinfo(x.id).pos;return p==='K'||p==='DEF'}).sort(function(a,b){return b.p-a.p})[0];
    var rb=W.sp.filter(function(x){return pinfo(x.id).pos==='RB'}).sort(function(a,b){return b.p-a.p})[0];
    if(rb&&k&&k.p>rb.p&&items.length<1)add('WEEK '+W.w+' · LOCAL','Local Man\'s RB1 Outscored By A '+(pinfo(k.id).pos==='K'?'Kicker':'Defense'),esc(pinfo(rb.id).n)+' gave him '+f1(rb.p)+'. The opponent\'s '+esc(pinfo(k.id).n)+' put up '+f1(k.p)+'. Neighbors report hearing a single, defeated "cool."')});
  if(s.bench>0)add('INVESTIGATION','Area Man Leaves '+f1(s.bench)+' Points On His Own Bench This Season','Max PF '+f1(s.mpf)+' vs actual '+f1(s.pf)+'. In fairness, leaving points on the bench is great for the tank. In unfairness, it also hurts his max-PF pick slot. Nobody knows what he\'s doing, including him.');
  var lows=[];wkData.forEach(function(W){W.sp.forEach(function(x){if(!W.live)lows.push({w:W.w,id:x.id,p:x.p})})});lows.sort(function(a,b){return a.p-b.p});
  var z=lows.filter(function(x){return x.p<=0});if(z.length)add('BY THE NUMBERS',z.length+' Starting Lineup Spot'+(z.length>1?'s':'')+' Produced Zero Or Less This Season','Lowlight: '+esc(pinfo(z[0].id).n)+', Week '+z[0].w+', '+f1(z[0].p)+'. Started on purpose. Allegedly.');
  else if(lows[0])add('BY THE NUMBERS','Starter Of The Year Candidate: '+esc(pinfo(lows[0].id).n)+' ('+f1(lows[0].p)+')','Week '+lows[0].w+'. Somebody had to.');
  var best=wkData.slice().sort(function(a,b){return b.m.points-a.m.points})[0];
  if(best){var beat=0;(D.M[best.w-1]||[]).forEach(function(x){if(x.roster_id!==D.me&&x.points<best.m.points)beat++});add('SEASON HIGHLIGHT','Franchise Celebrates Season-High '+f1(best.m.points)+' In Week '+best.w,'Would have beaten '+beat+' of 11 teams that week. '+(beat<4?'Banners are being printed anyway.':'Some of those teams were trying, too.'))}
  add('STANDINGS',(s.w===0?'Still Winless':s.w+'-'+s.l)+' After '+s.g+' Games; '+ordn(rank)+' Of 12 In Points','Points for: '+f1(s.pf)+'. Experts say the rebuild is "ahead of schedule," if the schedule is "lose."');
  var marg=wkData.filter(function(W){return !W.live&&W.om}).map(function(W){return {w:W.w,d:W.om.points-W.m.points}}).sort(function(a,b){return b.d-a.d})[0];
  if(marg&&marg.d>0)add('WEEK '+marg.w+' · SPORTS','Rebuilding Morehouse\'s Lose By '+f1(marg.d)+'; Coach Calls It "A Building Block"','The block was a cinder block. It was tied to his ankle.');
  return '<section class="panel" id="news"><h2>📰 The Morehouse Ledger <small>REAL STATS · FAKE NEWS</small></h2>'+items.join('')+'</section>'}

// ---------------- hall of shame ----------------
function shameHTML(){var T=allTrades();if(!T.length)return '';var tot=T.reduce(function(a,x){return a+x.d},0),worst=T.slice().sort(function(a,b){return a.d-b.d}).slice(0,5),won=T.filter(function(x){return x.d>0}).length;
  var R=['Gave {g}. Got {r}. Accepted anyway.','The other guy probably screenshotted this.','Not a rebuild. A demolition, without the rebuilding part.','This one still shows up in {w}\'s highlight reel.','Hindsight is 20/20. This was also bad with 20/200 vision.'];
  return '<section class="panel" id="shame"><h2>🏛️ Trade Hall Of Shame <small>'+T.length+' TRADES SINCE '+(D.H&&D.H.seasons.length?D.H.seasons[D.H.seasons.length-1].season:D.season)+'</small></h2>'+
   '<div style="display:flex;gap:10px;align-items:center"><div class="big" style="color:'+(tot>=0?'var(--for)':'var(--ag)')+'">'+sgn(tot)+'</div><div class="small muted">career net trade value, hindsight-adjusted (current FantasyCalc values; traded picks count as the player actually drafted). Won '+won+' of '+T.length+' on paper.</div></div>'+
   worst.map(function(x,i){var g=x.gave.slice().sort(function(a,b){return b.v-a.v})[0],rr=x.got.slice().sort(function(a,b){return b.v-a.v})[0];
    return '<div class="row"><span class="slot" style="width:34px;height:34px;flex:0 0 34px;font-size:14px;line-height:34px;background:var(--ag)">#'+(i+1)+'</span><div class="fx"><div class="ft">'+esc(x.season)+' Wk '+esc(x.wk||'?')+' with '+esc(x.with)+' <span class="pill r">'+sgn(x.d)+'</span></div>'+
     '<div class="small">Gave: '+x.gave.map(function(y){return esc(y.n)+' ('+int(y.v)+')'}).join(', ')+'</div><div class="small">Got: '+(x.got.map(function(y){return esc(y.n)+' ('+int(y.v)+')'}).join(', ')||'air')+'</div>'+
     '<div class="small" style="color:var(--y);font-style:italic">'+fill(R[i%R.length],{g:esc(g?g.n:'stuff'),r:esc(rr?rr.n:'nothing'),w:esc(x.with)})+'</div></div></div>'}).join('')+
   '<div class="hint">Values are what everything is worth today, so old trades get judged with hindsight. Retired guys are worth 0, same as at the time, probably.</div></section>'}

// ---------------- roster age / window ----------------
function windowHTML(){var r=D.R[D.me],ids=(r.players||[]),sum=function(rid){return (D.R[rid].players||[]).reduce(function(a,id){return a+val(id)},0)};
  var vals=Object.keys(D.R).map(function(k){return {rid:+k,v:sum(k)}}).sort(function(a,b){return b.v-a.v}),vr=vals.map(function(x){return x.rid}).indexOf(D.me)+1;
  var top=ids.map(function(id){return {id:id,v:val(id),a:D.V.a[id]||(D.P[id]&&D.P[id].a)||null}}).sort(function(a,b){return b.v-a.v});
  var wa=0,ws=0;top.forEach(function(x){if(x.a){wa+=x.a*x.v;ws+=x.v}});var age=ws?wa/ws:0,old=top.filter(function(x){return x.a>=28&&pinfo(x.id).pos!=='QB'}).length;
  var lg=Object.keys(D.R).map(function(k){var a=0,s=0;(D.R[k].players||[]).forEach(function(id){var v=val(id),g=D.V.a[id];if(g){a+=g*v;s+=v}});return s?a/s:0});var young=lg.filter(function(x){return x&&x<age}).length+1;
  return '<section class="panel" id="window"><h2>🪟 Contention Window <small>STATUS: NEVER</small></h2>'+
   '<div class="tr"><div><h4>ROSTER VALUE</h4><div class="big">'+ordn(vr)+'</div><div class="small muted">of 12 ('+int(vals.filter(function(x){return x.rid===D.me})[0].v)+')</div></div><div><h4>VALUE-WEIGHTED AGE</h4><div class="big">'+f1(age)+'</div><div class="small muted">'+ordn(young)+' youngest of 12</div></div></div>'+
   '<h3>Window Opens</h3><div class="meter"><i style="width:3%"></i></div><div class="small">ETA: '+(+D.season+3)+'. It was '+(+D.season+2)+' last year. And '+(+D.season+1)+' the year before. The window is a painting of a window.</div>'+
   '<h3>Load-bearing walls (top value)</h3>'+top.slice(0,5).map(function(x){var pi=pinfo(x.id);return '<div class="it">'+head(x.id)+'<span>'+esc(pi.n)+' '+posChip(pi.pos)+' <span class="muted small">'+(x.a?'age '+x.a:'')+'</span></span><b>'+int(x.v)+'</b></div>'}).join('')+
   '<div class="small muted" style="margin-top:6px">'+old+' non-QB vets aged 28+ on a "rebuilding" roster. '+(old>3?'That\'s not a rebuild, that\'s a retirement home with a Sleeper account.':'Honestly, pretty young. Which makes the 0-fer harder to explain.')+'</div></section>'}

// ---------------- missing ----------------
function missingHTML(){var H=D.H,last=null,s=D.st[D.me],r=D.R[D.me],streak=(r.metadata&&r.metadata.streak)||'';
  if(H)H.seasons.forEach(function(x){if(!last&&x.w>x.l)last=x});
  var titles=H?H.seasons.map(function(x){return x.season+': '+x.w+'-'+x.l+(x.tn?' as "'+esc(x.tn.trim())+'"':'')}).join('<br>'):'';
  return '<section class="panel" id="missing"><h2>🥛 Missing <small>HAVE YOU SEEN THIS FRANCHISE?</small></h2><div class="carton"><picture><source srcset="img/carton.webp" type="image/webp"><img src="img/carton.jpg" width="520" height="480" loading="lazy" alt="Milk carton: MISSING, manager of Rebuilding Morehouse\'s"></picture>'+
   '<ul class="small"><li><b>Last seen:</b> hitting "accept" on '+(curTrades().length?tstr(curTrades()[0].status_updated):'a trade')+'.</li><li><b>Last winning season:</b> '+(last?last.season+' ('+last.w+'-'+last.l+')':'never')+'.</li><li><b>Current streak:</b> '+esc(streak||(s.w+'-'+s.l))+'.</li><li><b>Missing since:</b> the playoffs, emotionally.</li><li><b>Distinguishing marks:</b> a new team name every year, same results.</li><li><b>Reward:</b> one used shoey.</li></ul></div>'+
   (titles?'<h3>Known aliases</h3><div class="small muted">'+titles+'<br>'+D.season+': '+s.w+'-'+s.l+' as "Rebuilding Morehouse\'s" (finally, honesty)</div>':'')+'</section>'}

// ---------------- render + joke tabs ----------------
var SECS=[['trade','🚨'],['live','📺'],['sit','🧠'],['picks','🎯'],['news','📰'],['shame','🏛️'],['window','🪟'],['missing','🥛']];
var SUBS=['(again)','(still)','(yr 6)','(trust it)','(soon™)','(no)','(pls)','(help)'];
function render(){var parts=[heroHTML,liveHTML,revHTML,picksHTML,newsHTML,shameHTML,windowHTML,missingHTML].map(function(f){try{return f()}catch(e){console.error(e);return '<section class="panel err">This section collapsed during construction ('+esc(e.message)+').</section>'}});
  $('#body').innerHTML=parts.join('');
  $('#tabs').innerHTML=SECS.map(function(s,i){return '<a href="#'+s[0]+'" data-k="'+s[0]+'"><span>'+s[1]+'</span>REBUILDING…<small style="font-size:9px;opacity:.7">'+SUBS[i]+'</small></a>'}).join('');
  Array.prototype.forEach.call(document.querySelectorAll('#tabs a'),function(a){a.onclick=function(e){e.preventDefault();var el=document.getElementById(a.getAttribute('data-k'));if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
    Array.prototype.forEach.call(document.querySelectorAll('#tabs a'),function(b){b.className=b===a?'on':''})}})}
$('#tabs').innerHTML=SECS.map(function(s){return '<a><span>'+s[1]+'</span>REBUILDING…</a>'}).join('');
boot();
// refresh the live numbers every 2 min while visible during game windows (cheap: matchups + scoreboard only)
setInterval(function(){if(document.hidden||!D.st)return;var any=false;for(var k in D.games)if(D.games[k].state==='in')any=true;if(!any)return;
  Promise.all([loadGames(),S('league/'+LEAGUE+'/matchups/'+D.week)]).then(function(r){D.games=r[0];D.M[D.week-1]=r[1];var y=scrollY;render();scrollTo(0,y)}).catch(function(){})},120000);
