/* =====================================================================
   THE TABLE: crew, match flow, human input, coach
   Seats: 0 You (bottom) · 1 left opp · 2 partner (top) · 3 right opp
   ===================================================================== */
const CREW={
  you:{id:'you',name:'You'},
  bandit:{id:'bandit',name:'Bandit',brain:'steady',bio:'Your partner. Steady, leads trump back to you.'},
  gus:{id:'gus',name:'Gus',brain:'reckless',bio:'Calls trump on vibes.'},
  tiny:{id:'tiny',name:'Tiny',brain:'timid',bio:'Only calls with the goods.'},
  slick:{id:'slick',name:'Slick',brain:'slick',bio:'Cashes aces early. Talks constantly.'},
  duchess:{id:'duchess',name:'Duchess',brain:'sharp',bio:'Counts every card.'},
  professor:{id:'professor',name:'Professor',brain:'sharp',bio:'By the book. Every book.'}
};
const TABLES=[
  {id:'porch',name:'The Back Porch',lvl:'easy',lvlName:'Easy',opps:['gus','tiny'],sloppy:.22,blurb:'Gus calls on vibes. Tiny barely calls at all.'},
  {id:'pizza',name:'Behind the Pizza Place',lvl:'med',lvlName:'Medium',opps:['slick','gus'],sloppy:.07,blurb:'Slick cashes aces early and never stops talking.'},
  {id:'laundro',name:'The Laundromat',lvl:'hard',lvlName:'Hard',opps:['duchess','professor'],sloppy:0,blurb:'They count every card. Every. Single. Card.'}
];
const AV=(id,m='neutral')=>(typeof AVATARS!=='undefined'&&AVATARS[id+'_'+m])||'';
const WIN_PTS=10;

const VOICE={
  bandit:{pass:['Not this one.','Pass.','I got nothing.'],order:['I got you.','Pick it up, partner.',"Let's ride."],call:['{s}. Trust me.',"{s}. Don't ask."],alone:['Sit back, partner. I got this.'],
    win:["That's how it's done.",'Easy money.','Like we drew it up.'],lose:['We regroup.','Shake it off.'],euchre:["Read 'em and weep.",'Get that outta here!'],euchred:["That one's on me.",'Rough.'],
    youCall:['{s}? Solid.','{s}. I like it.','Hope you got the bower.'],youAlone:["Go get 'em.","I'll just... sit here."],youEuchred:["We'll get it back.",'Happens to the best.']},
  slick:{pass:["I'll allow it.",'Pass. For now.'],order:["Let's see what you got.",'Pick it up. Watch this.'],call:['{s}. Feeling slick.'],alone:['Just me and the chain.'],
    win:['Too easy.','Chain stays shiny.'],lose:['Cards were sticky.'],euchre:['Euchred! Say it with me!'],euchred:['That was a warmup.']},
  tiny:{pass:['...pass.','Mm. No.','Pass, please.'],order:['Okay. Yes.'],call:['{s}, please.'],alone:['I will try alone.'],win:['Oh! Nice.'],lose:['Oh no.'],euchre:['Sorry. Not sorry.'],euchred:['Oh dear.']},
  duchess:{pass:['Pass, darling.','Hardly.'],order:['Order it up. Obviously.'],call:['{s}. Do keep up.'],alone:['I prefer to dine alone.'],win:['As expected.'],lose:['How common.'],euchre:['Euchred. How tragic.'],euchred:['The cards are dirty.']},
  gus:{pass:['Nah.','Vibes say no.'],order:['Vibes say yes.'],call:['{s}! Felt it in my whiskers.'],alone:['Gus goes solo!'],win:['Whiskers never lie!'],lose:['Bad vibes.'],euchre:['YEEHAW.'],euchred:['The river took it.']},
  professor:{pass:['Statistically, pass.','Insufficient data.'],order:['The math supports it.'],call:['{s}, per chapter four.'],alone:['A textbook loner.'],win:['Elementary.'],lose:['An outlier.'],euchre:['Q.E.D.'],euchred:['Peer review pending.']}
};

let G=null;
const pace=()=>window.__turbo?0.02:(S().fast?.55:1);
const sleep=ms=>{const g=G;return new Promise((res,rej)=>setTimeout(()=>(g&&g.dead)?rej('abort'):res(),ms*pace()));};
const seatEl=s=>$(`.seat[data-s="${s}"]`);
const nameOf=s=>G.seats[s].name;
const teamTricks=t=>G.seats[t].tricks+G.seats[t+2].tricks;
const suitWord=s=>SUIT_NAME[s];

/* =====================================================================
   UNLOCKABLES: card backs and card faces
   ===================================================================== */
const BACKS=[
  {id:'classic',name:'Classic Red',req:'Always yours'},
  {id:'pizza',name:"Tony's Pizza",req:'Win a game',prog:s=>[s.won,1]},
  {id:'alley',name:'Night Alley',req:'Win Behind the Pizza Place',prog:s=>[s.winsBy.pizza||0,1]},
  {id:'recycle',name:'Recycling Bin',req:'Euchre the other team 5 times',prog:s=>[s.euchresFor,5]},
  {id:'mask',name:'Bandit Mask',req:'Win 3 games in a row',prog:s=>[s.bestStreak,3]},
  {id:'grime',name:'Grime Lords',req:'Win at The Laundromat',prog:s=>[s.winsBy.laundro||0,1]},
  {id:'king',name:'Trash King',req:'Sweep a hand going alone',prog:s=>[s.loners,1]},
  {id:'ace',name:'Lucky Ace',req:'Take 100 tricks yourself',prog:s=>[s.tricksTotal,100]}
];
const FACES=[
  {id:'paper',name:'Fresh Paper',req:'Always yours'},
  {id:'notebook',name:'Notebook',req:'Play 5 games',prog:s=>[s.played,5]},
  {id:'newsprint',name:'Newsprint',req:'Play 25 hands',prog:s=>[s.handsPlayed,25]},
  {id:'greasy',name:'Pizza Grease',req:'Win 5 games',prog:s=>[s.won,5]}
];
const isUnlocked=it=>!it.prog||(()=>{const [a,b]=it.prog(S());return a>=b;})();
const unlockedIds=()=>[...BACKS,...FACES].filter(isUnlocked).map(i=>i.id);
function newUnlockCount(){const seen=new Set(S().seen);return [...BACKS,...FACES].filter(it=>it.prog&&isUnlocked(it)&&!seen.has(it.id)).length;}

/* =====================================================================
   HOME: the alley crew is the menu
   ===================================================================== */
function renderHome(){
  if(G){G.dead=true;if(G.pending) G.pending.rej('abort');G=null;}
  closeModal();show('home');setScene('hub');applyLook();
  const t=TABLES.find(x=>x.id===S().table)||TABLES[0];
  $('#tableName').textContent=t.name;
  $('#tableFaces').innerHTML=t.opps.map(o=>`<img src="${AV(o)}" alt="${CREW[o].name}">`).join('');
  const n=newUnlockCount();$('#deckBadge').hidden=!n;$('#deckBadge').textContent=n>1?n+' new':'new';
  const st=S();
  $('#homeStats').innerHTML=st.played?`<span>Games <b>${st.played}</b></span><span>Won <b>${st.won}</b></span><span>Euchres <b>${st.euchresFor}</b></span><span>Best streak <b>${st.bestStreak}</b></span>`:'<span>Pull up a crate.</span>';
}
function show(id){$$('.screen').forEach(s=>s.hidden=s.id!==id);}
$('#dealBtn').onclick=()=>{sfx.call();startMatch();};
$('#rulesBtn').onclick=()=>{sfx.tap();openRules();};
$('#tableNote').onclick=()=>{sfx.tap();renderTables();};
$('#deckBtn').onclick=()=>{sfx.tap();renderDeck('backs');};
$('#gearBtn').onclick=()=>{sfx.tap();openSettings();};
$('#subBack').onclick=()=>{sfx.tap();renderHome();};

function renderTables(){
  show('sub');setScene('sub');$('#subTitle').textContent='Tables';
  const b=$('#subBody');b.innerHTML='';
  TABLES.forEach((t,i)=>{
    const w=S().winsBy[t.id]||0;
    const c=el(`<button class="tblcard" role="radio" aria-checked="${S().table===t.id}" style="--r:${[-1.5,1.2,-.8][i]}deg"><span class="faces">${t.opps.map(o=>`<img src="${AV(o)}" alt="">`).join('')}</span>
      <span class="tx"><b>${t.name}</b><small>${CREW[t.opps[0]].name} & ${CREW[t.opps[1]].name}. ${t.blurb}</small><span class="wins">${w?`Won here ${w} time${w>1?'s':''}`:'Not beaten yet'}</span></span><span class="lvl ${t.lvl}">${t.lvlName}</span></button>`);
    c.onclick=()=>{S().table=t.id;persist();sfx.tap();renderHome();};b.appendChild(c);
  });
  b.insertAdjacentHTML('beforeend','<p class="decknote">Bandit is always your partner. Beat a table to unlock its card back.</p>');
}
function renderDeck(tab){
  show('sub');setScene('sub');$('#subTitle').textContent='My deck';applyLook();
  const b=$('#subBody');
  const list=tab==='backs'?BACKS:FACES,key=tab==='backs'?'back':'face';
  const seen=new Set(S().seen);
  b.innerHTML=`<div class="deckhead" role="tablist"><button class="btn b-plain small" role="tab" aria-selected="${tab==='backs'}" data-t="backs" style="--r:-2deg">Card backs</button><button class="btn b-plain small" role="tab" aria-selected="${tab==='faces'}" data-t="faces" style="--r:1.5deg">Card faces</button></div>
    <div class="deckgrid">${list.map(it=>{
      const ok=isUnlocked(it),sel=S()[key]===it.id,isNew=ok&&!seen.has(it.id)&&it.prog;
      const card=tab==='backs'?`<div class="card" style="--tr:0deg"><div class="inner"><div class="face"></div><div class="back b-${it.id}"></div></div></div>`
        :cardHTML(5+6*[0,1,2,3][FACES.indexOf(it)%4],{faceCls:'f-'+it.id});
      let foot;
      if(sel) foot='<span class="inuse">in use</span>';
      else if(ok) foot=isNew?'<span class="inuse">new!</span>':'<small>Tap to use</small>';
      else{const [a,n]=it.prog(S());foot=`<small>${it.req}</small><span class="prog"><i style="width:${Math.min(100,100*a/n)}%"></i></span>`;}
      return `<button class="deckcard${ok?'':' locked'}${sel?' sel':''}" data-id="${it.id}" ${ok?'':'aria-disabled="true"'}><span class="cardwrap">${card}</span><b>${it.name}</b>${foot}</button>`;}).join('')}</div>
    <p class="decknote">${tab==='backs'?'Your back shows on every card face-down at the table.':'Faces change the paper your cards are printed on.'}</p>`;
  list.filter(isUnlocked).forEach(it=>{if(!S().seen.includes(it.id)) S().seen.push(it.id);});persist();
  b.querySelectorAll('[data-t]').forEach(x=>x.onclick=()=>{sfx.tap();renderDeck(x.dataset.t);});
  b.querySelectorAll('.deckcard').forEach(x=>x.onclick=()=>{
    const it=list.find(i=>i.id===x.dataset.id);
    if(!isUnlocked(it)){toast(`Locked: ${it.req}`);return;}
    S()[key]=it.id;persist();sfx.tap();renderDeck(tab);
  });
}
function openSettings(){
  const tog=(k,l,sub)=>`<button class="tog" role="switch" data-k="${k}" aria-checked="${!!S()[k]}"><span>${l}${sub?`<small>${sub}</small>`:''}</span><span class="sw"></span></button>`;
  openModal(`<h2>House rules</h2><div class="toglist">${tog('stick','Stick the dealer','Dealer must call if everyone passes twice')}${tog('coach','Coach hints','A ★ marks the sharp play')}${tog('fast','Fast pace')}${tog('sound','Sound')}</div>
    <div class="btns"><button class="btn b-gold" id="mDone" style="--r:-1deg">Done</button></div>`);
  bindToggles();$('#mDone').onclick=closeModal;
}
function bindToggles(){$$('#modal .tog').forEach(b=>b.onclick=()=>{const k=b.dataset.k;S()[k]=!S()[k];persist();b.setAttribute('aria-checked',S()[k]);sfx.tap();
  if(k==='coach'&&G&&G.legal) renderHand('play');});}

/* =====================================================================
   MATCH SETUP
   ===================================================================== */
function startMatch(){
  if(G){G.dead=true;if(G.pending) G.pending.rej('abort');}
  const t=TABLES.find(x=>x.id===S().table)||TABLES[0];
  const ids=['you',t.opps[0],'bandit',t.opps[1]];
  const seats=ids.map((id,i)=>({i,id,name:CREW[id].name,hand:[],tricks:0,
    brain:i===0?null:{...BRAINS[CREW[id].brain],sloppy:i%2?t.sloppy:0}}));
  G={table:t,seats,dealer:Math.floor(Math.random()*4),score:[0,0],handNo:0,dead:false,pending:null,
     trump:null,maker:null,alone:false,out:null,trick:[],known:new Set(),upcard:null,
     stats:{tricks:0,euchres:0,euchred:0,loners:0,coachHit:0,coachN:0}};
  show('game');setScene('table');applyLook();buildSeats();renderScore(true);requestAnimationFrame(layout);layout();
  playMatch().catch(e=>{if(e!=='abort') console.error(e);});
}
async function playMatch(){
  setStatus(`${G.table.name}. First to ${WIN_PTS}.`);
  await sleep(700);
  while(G.score[0]<WIN_PTS&&G.score[1]<WIN_PTS){
    await playHand();
    G.dealer=(G.dealer+1)%4;
  }
  endMatch(G.score[0]>=WIN_PTS);
}

/* =====================================================================
   ONE HAND
   ===================================================================== */
async function playHand(){
  G.handNo++;
  Object.assign(G,{trump:null,maker:null,alone:false,out:null,trick:[],known:new Set(),turned:null});
  G.seats.forEach(s=>{s.hand=[];s.tricks=0;});
  clearTrick();renderTrump();$('#hand').innerHTML='';setActions('');
  G.seats.forEach((_,i)=>renderSeat(i));
  const deck=newDeck();
  for(let i=0;i<4;i++) G.seats[i].hand=deck.slice(i*5,i*5+5);
  G.upcard=deck[20];
  setStatus(G.dealer===0?'Your deal':`${nameOf(G.dealer)} deals`);
  await dealAnim();
  renderHand();
  showKitty(true);
  await sleep(300);
  const up=G.upcard,upSuit=cs(up);

  /* ----- round one: order up the up card ----- */
  setStatus(`Up card: ${cardShort(up)}`);
  for(let k=1;k<=4&&G.maker==null;k++){
    const s=(G.dealer+k)%4;setTurn(s);
    let r;
    if(s===0) r=await humanOrder();
    else{await sleep(rnd(650,1050));r=botOrder(s,G.seats[s].hand,up,G.dealer,G.seats[s].brain,{});}
    if(r.call){G.maker=s;G.alone=!!r.alone;G.trump=upSuit;await announceCall(s,1);}
    else passed(s);
  }
  if(G.maker!=null){
    if(G.alone) G.out=partnerOf(G.maker);
    if(G.out===G.dealer){
      setStatus(`${nameOf(G.dealer)} sits out, up card stays down`);
      flipKitty(false);await sleep(700);
    }else await dealerPickup();
  }else{
    /* ----- round two: name another suit ----- */
    const kc=$('#kitty .kup .card');if(kc){kc.classList.remove('hot');kc.classList.add('down');}G.turned=upSuit;
    setStatus(`${SUIT_SYM[upSuit]} turned down. Name a different suit.`);
    await sleep(500);
    for(let k=1;k<=4&&G.maker==null;k++){
      const s=(G.dealer+k)%4;setTurn(s);
      const forced=S().stick&&s===G.dealer;
      let r;
      if(s===0) r=await humanCall(upSuit,forced);
      else{await sleep(rnd(700,1100));r=botCall(s,G.seats[s].hand,upSuit,G.dealer,G.seats[s].brain,{stick:S().stick});}
      if(r.suit!=null){G.maker=s;G.alone=!!r.alone;G.trump=r.suit;await announceCall(s,2);}
      else passed(s);
    }
    if(G.maker==null){
      setTurn(null);setStatus('Everybody passed. Throw them in.');
      await sleep(1300);showKitty(false);return;
    }
    if(G.alone) G.out=partnerOf(G.maker);
  }
  showKitty(false);setTurn(null);
  G.seats.forEach((_,i)=>renderSeat(i));
  renderHand();
  if(G.out!=null){setStatus(G.out===0?`${nameOf(G.maker)} goes alone. Sit back.`:`${G.maker===0?'You go':nameOf(G.maker)+' goes'} alone!`);await sleep(900);}

  /* ----- five tricks ----- */
  let leader=(G.dealer+1)%4;if(leader===G.out) leader=(leader+1)%4;
  for(let tn=0;tn<5;tn++){
    G.trick=[];
    for(let k=0;k<4;k++){
      const s=(leader+k)%4;if(s===G.out) continue;
      setTurn(s);
      let c;
      if(s===0) c=await humanPlay();
      else{await sleep(rnd(520,900));c=botPlay(s,G.seats[s].hand,{trump:G.trump,maker:G.maker,alone:G.alone,out:G.out,trick:G.trick,known:G.known},G.seats[s].brain);}
      await playCard(s,c);
    }
    setTurn(null);
    const w=trickWinner(G.trick,G.trump);
    await finishTrick(w.seat);
    leader=w.seat;
  }
  await scoreTheHand();
}

/* ---------- dealing ---------- */
async function dealAnim(){
  const from=seatEl(G.dealer).querySelector('.ava');
  $$('.seat .backs').forEach(b=>b.innerHTML='');
  const order=[1,2,3,0].map(k=>(G.dealer+k)%4);
  for(const n of [3,2]) for(const s of order){
    sfx.deal();
    const to=s===0?$('#hand'):seatEl(s).querySelector('.ava');
    flyCard(backHTML(),from,to,{ms:260,w:s===0?40:24,rot:rnd(-30,30)});
    await sleep(70);
  }
  await sleep(260);
  G.seats.forEach((_,i)=>renderSeat(i));
}
function showKitty(on){
  const k=$('#kitty');k.hidden=!on;
  if(on){k.querySelector('.kdeck').innerHTML=backHTML()+backHTML()+backHTML();k.querySelector('.kup').innerHTML=cardHTML(G.upcard,{cls:'hot',mark:false});}
}
function flipKitty(up){const c=$('#kitty .kup .card');if(c){c.classList.toggle('up',up);c.classList.remove('hot');}}

/* ---------- bidding ---------- */
function passed(s){
  if(s===0){bubble(0,'Pass',1100);sfx.pass();}
  else{bubble(s,line(s,'pass')||'Pass',1300);sfx.pass();mood(s,'meh',1200);}
  renderSeat(s);
}
async function announceCall(s,round){
  setTurn(null);
  const kind=G.alone?'alone':round===1?'order':'call';
  if(s===0) bubble(0,G.alone?`Alone in ${suitWord(G.trump)}!`:round===1?'Order it up!':`${suitWord(G.trump)}!`,1600,true);
  else bubble(s,line(s,kind,G.trump)||suitWord(G.trump),1800,true);
  mood(s,'wink',1600);sfx.call();
  flash(G.alone?'#8a5ad6':'#f2b440');
  renderTrump(true);renderSeat(s);renderHand();
  setStatus(`${s===0?'You':nameOf(s)} ${round===1?'ordered up':'called'} ${SUIT_SYM[G.trump]} ${suitWord(G.trump)}${G.alone?' — alone':''}`);
  if(s===0&&G.seats[2]){await sleep(500);bubble(2,line(2,G.alone?'youAlone':'youCall',G.trump),1500);mood(2,G.alone?'shock':'laugh',1200);}
  await sleep(1100);
}
async function dealerPickup(){
  const d=G.dealer,up=G.upcard;
  setStatus(`${d===0?'You pick':nameOf(d)+' picks'} up the ${cardShort(up)}`);
  const src=$('#kitty .kup');
  src.innerHTML='';
  await flyCard(cardHTML(up,{mark:false}),src,d===0?$('#hand'):seatEl(d).querySelector('.ava'),{ms:420,w:d===0?$('#hand').offsetHeight/1.6:40});
  sfx.card();
  const h=G.seats[d].hand;h.push(up);
  if(d===0){
    renderHand('discard');
    const disc=await humanDiscard();
    const node=$(`#hand .hcard[data-c="${disc}"]`);
    G.seats[0].hand=h.filter(c=>c!==disc);
    renderHand();
    await flyCard(backHTML(),node||$('#hand'),$('#kitty .kdeck'),{ms:300,w:40});
  }else{
    await sleep(500);
    const disc=chooseDiscard(h,G.trump);
    G.seats[d].hand=h.filter(c=>c!==disc);
    await flyCard(backHTML(),seatEl(d).querySelector('.ava'),$('#kitty .kdeck'),{ms:300,w:30});
  }
  sfx.deal();renderSeat(d);
}

/* ---------- card play ---------- */
async function playCard(s,c){
  const p=G.seats[s];p.hand=p.hand.filter(x=>x!==c);
  G.trick.push({seat:s,card:c});G.known.add(c);
  const slot=$(`.tslot[data-s="${s}"]`);
  let from;
  if(s===0){from=$(`#hand .hcard[data-c="${c}"]`)||$('#hand');}
  else from=seatEl(s).querySelector('.ava');
  if(s===0){const n=$(`#hand .hcard[data-c="${c}"]`);if(n) n.style.visibility='hidden';}
  sfx.card();
  const tl=tiltFor(c);
  await flyCard(cardHTML(c,{trump:G.trump}),from,slot,{ms:330,rot:s===1?-35:s===3?35:0,toRot:tl,fromScale:s===0?1.2:.5});
  slot.innerHTML=cardHTML(c,{trump:G.trump,tilt:tl});
  if(s===0) renderHand(); else renderSeat(s);
}
async function finishTrick(w){
  const ws=$(`.tslot[data-s="${w}"] .card`);
  $$('.tslot .card').forEach(c=>c.classList.add(c===ws?'win':'dim'));
  G.seats[w].tricks++;
  const ours=teamOf(w)===0;
  if(ours) sfx.trick(); else sfx.lostTrick();
  mood(w,'laugh',1000);
  renderSeat(w,true);renderScore();
  if(w===0) G.stats.tricks++;
  setStatus(`${w===0?'You take':nameOf(w)+' takes'} it with ${cardName(G.trick.find(x=>x.seat===w).card,G.trump)}`);
  await sleep(1050);
  const to=seatEl(w).querySelector('.ava');
  const flights=$$('.tslot').map(sl=>{const c=sl.querySelector('.card');if(!c) return null;const html=c.outerHTML;sl.innerHTML='';
    const ph=el('<div style="position:absolute;inset:0"></div>');sl.appendChild(ph);
    return flyCard(html.replace(' win','').replace(' dim',''),ph,to,{ms:320,w:20}).then(()=>ph.remove());});
  await Promise.all(flights.filter(Boolean));
  clearTrick();
}
function clearTrick(){$$('.tslot').forEach(s=>s.innerHTML='');}

/* ---------- scoring ---------- */
async function scoreTheHand(){
  const tricks=[teamTricks(0),teamTricks(1)];
  const r=scoreHand(G.maker,G.alone,tricks);
  G.score[r.team]+=r.pts;
  const ours=r.team===0,weMade=teamOf(G.maker)===0;
  const T={make:'Made it',march:'March!',loner:'Loner sweep!',euchre:'Euchred!'}[r.kind];
  let sub;
  if(r.kind==='euchre') sub=weMade?`${G.maker===0?'You':nameOf(G.maker)} got set. +2 them`:`Stopped ${nameOf(G.maker)} cold. +2 us`;
  else sub=`${ours?'Us':'Them'} +${r.pts} · ${tricks[r.team]} tricks`;
  if(r.kind==='euchre'){if(ours) G.stats.euchres++; else G.stats.euchred++;}
  if(r.kind==='loner'&&ours) G.stats.loners++;
  showBanner(T,sub,ours);
  renderScore();$(`.team.${ours?'us':'them'}`).classList.add('bump');setTimeout(()=>$$('.team').forEach(t=>t.classList.remove('bump')),600);
  if(r.kind==='euchre'){ours?sfx.euchre():sfx.bad();flash(ours?'#f2b440':'#3fb5c8');}
  else if(ours){sfx.point();flash('#f2b440');}
  else{sfx.lostTrick();flash('#d4473f');}
  for(let s=0;s<4;s++){
    const scored=teamOf(s)===r.team;
    mood(s,scored?'laugh':(r.kind==='euchre'?'shock':'scowl'),2400);
  }
  // one voice from each side
  const talker=[1,2,3].filter(s=>teamOf(s)===r.team);
  const loser=[1,2,3].filter(s=>teamOf(s)!==r.team);
  if(talker.length) bubble(talker[0],line(talker[0],r.kind==='euchre'?'euchre':'win'),2000);
  if(r.kind==='euchre'&&loser.length){const l=loser[0];setTimeout(()=>G&&!G.dead&&bubble(l,line(l,l===2&&G.maker===0?'youEuchred':'euchred'),1800),600);}
  await sleep(2500);
  $('#banner').hidden=true;
}
function showBanner(t,sub,good){const b=$('#banner');b.className=good?'good':'bad';b.innerHTML=`<b>${t}</b><span>${sub}</span>`;b.hidden=false;
  b.style.animation='none';void b.offsetWidth;b.style.animation='';}

/* =====================================================================
   HUMAN INPUT
   ===================================================================== */
function waitInput(auto){
  return new Promise((res,rej)=>{G.pending={res:v=>{G.pending=null;res(v);},rej};
    if(window.__auto) setTimeout(()=>G.pending&&G.pending.res(auto()),5);});
}
function coachOn(){return S().coach;}
function coachNote(hit){G.stats.coachN++;if(hit) G.stats.coachHit++;}
const coachBrain=()=>({...BRAINS.sharp,nerve:0,sloppy:0});

function describeHand(hand,t){
  const st=handStrength(hand,t);
  const bits=[];
  bits.push(`${st.trumps} trump`);
  if(st.right&&st.left) bits.push('both bowers');else if(st.right) bits.push('the right bower');else if(st.left) bits.push('the left bower');
  const aces=hand.filter(c=>!isTrump(c,t)&&cr(c)===5).length;if(aces) bits.push(`${aces} off ace${aces>1?'s':''}`);
  return bits.join(', ');
}
async function humanOrder(){
  const up=G.upcard,t=cs(up),hand=G.seats[0].hand,dealer=G.dealer==0;
  const rec=botOrder(0,hand,up,G.dealer,coachBrain(),{});
  const evalHand=dealer?withPickup(hand,up,t):hand;
  const who=dealer?'you':nameOf(G.dealer);
  const side=partnerOf(0)===G.dealer?' Bandit is dealing, so the up card helps your team.':teamOf(G.dealer)===1&&!dealer?` ${nameOf(G.dealer)} gets the up card if you order.`:'';
  const recKey=rec.call?(rec.alone?'alone':'order'):'pass';
  const coach=coachOn()?`<div class="coach"><b>Coach:</b> ${recKey==='pass'?'Pass':recKey==='alone'?'Go alone':'Order it up'} — you'd have ${describeHand(evalHand,t)}.${side}</div>`:'';
  setActions(`${coach}<div class="arow">
    <button class="btn b-grey" data-a="pass">Pass</button>
    <button class="btn b-gold" data-a="order">${dealer?'Pick it up':'Order up'}<small>${SUIT_SYM[t]} ${suitWord(t)} trump</small></button>
    <button class="btn b-violet" data-a="alone">Alone<small>4 pts if you sweep</small></button></div>`,recKey);
  setStatus(`Order up the ${cardShort(up)}?`);
  const a=await waitInput(()=>recKey);
  setActions('');
  coachNote((a==='pass')===(recKey==='pass'));
  return {call:a!=='pass',alone:a==='alone'};
}
async function humanCall(turned,forced){
  const hand=G.seats[0].hand;
  const rec=botCall(0,hand,turned,G.dealer,coachBrain(),{stick:forced});
  const recKey=rec.suit!=null?'s'+rec.suit:'pass';
  let alone=false;
  const suits=[0,1,2,3].filter(s=>s!==turned);
  const coach=coachOn()?`<div class="coach"><b>Coach:</b> ${rec.suit!=null?`Call ${suitWord(rec.suit)}${rec.alone?' and go alone':''} — ${describeHand(hand,rec.suit)}.`:`Pass — nothing strong enough. Best is ${suitWord(bestSuit(hand,turned))}.`}${forced?' Stick the dealer: you have to call.':''}</div>`:'';
  setActions(`${coach}<div class="arow">${suits.map(s=>`<button class="btn suitbtn ${isRedSuit(s)?'red':'black'}" data-a="s${s}">${SUIT_SVG[s]}${suitWord(s)}</button>`).join('')}</div>
    <div class="arow"><button class="btn b-grey alonetog" data-a="alonetog" aria-pressed="false">Alone: off</button><button class="btn b-grey" data-a="pass" ${forced?'disabled':''}>${forced?'Stuck — must call':'Pass'}</button></div>`,recKey,true);
  setStatus(forced?'Stick the dealer: name trump.':'Name trump, or pass.');
  let a;
  for(;;){
    a=await waitInput(()=>recKey);
    if(a==='alonetog'){alone=!alone;const b=$('[data-a="alonetog"]');b.setAttribute('aria-pressed',alone);b.textContent=`Alone: ${alone?'on':'off'}`;sfx.tap();continue;}
    break;
  }
  setActions('');
  coachNote(a===recKey);
  if(a==='pass') return {suit:null};
  return {suit:+a.slice(1),alone:window.__auto?!!rec.alone:alone};
}
function bestSuit(hand,turned){let b=null,bs=-99;for(let t=0;t<4;t++){if(t===turned) continue;const s=handStrength(hand,t).s;if(s>bs){bs=s;b=t;}}return b;}
async function humanDiscard(){
  const h=G.seats[0].hand,rec=chooseDiscard(h,G.trump);
  setActions(`${coachOn()?`<div class="coach"><b>Coach:</b> Ditch the ${cardShort(rec)}. ${isTrump(rec,G.trump)?'All trump — drop the lowest.':'Getting rid of a weak off-suit card lets you trump in sooner.'}</div>`:''}<div class="hint">Tap a card to discard it</div>`);
  setStatus('Pick a card to throw away');
  G.rec=rec;renderHand('discard');
  const c=await waitInput(()=>rec);
  G.rec=null;setActions('');coachNote(c===rec);
  return c;
}
async function humanPlay(){
  const h=G.seats[0].hand,led=G.trick.length?effSuit(G.trick[0].card,G.trump):null;
  const legal=legalPlays(h,led,G.trump);
  const rec=botPlay(0,h,{trump:G.trump,maker:G.maker,alone:G.alone,out:G.out,trick:G.trick,known:G.known},coachBrain());
  G.rec=rec;G.legal=legal;
  renderHand('play');
  setStatus(G.trick.length?(legal.length<h.length?`Follow ${SUIT_SYM[led]} if you can`:'Your play'):'Your lead');
  setActions(coachOn()?`<div class="coach"><b>Coach:</b> ${explainPlay(rec,legal,led)}</div>`:`<div class="hint">${G.trick.length?'Tap a card to play':'Your lead — tap a card'}</div>`);
  const c=await waitInput(()=>rec);
  coachNote(c===rec);
  G.rec=null;G.legal=null;setActions('');
  return c;
}
function explainPlay(rec,legal,led){
  const t=G.trump,nm=cardShort(rec);
  if(legal.length===1) return `Only one legal card: ${nm}.`;
  if(led==null){
    if(isTrump(rec,t)) return `Lead ${nm} — pull their trump.`;
    if(cr(rec)===5) return `Cash your ace: lead ${nm}.`;
    return `Lead ${nm} and let partner work.`;
  }
  const w=trickWinner(G.trick,t),wp=power(w.card,t,led);
  if(w.seat===2&&power(rec,t,led)<=wp) return `Bandit's winning — throw off ${nm}.`;
  if(power(rec,t,led)>wp) return isTrump(rec,t)&&led!==t?`Trump in with ${nm}.`:`Take it with ${nm}.`;
  return `Can't win this one — ditch ${nm}.`;
}

/* clicks: actions tray + hand */
$('#actions').addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||!G||!G.pending) return;sfx.tap();G.pending.res(b.dataset.a);});
$('#hand').addEventListener('click',e=>{const b=e.target.closest('.hcard.ok');if(!b||!G||!G.pending) return;G.pending.res(+b.dataset.c);});

/* =====================================================================
   RENDERING
   ===================================================================== */
function buildSeats(){
  for(let s=0;s<4;s++){
    const p=G.seats[s],e=seatEl(s);
    e.className=`seat s${s} ${teamOf(s)===0?'us':'them'}`;
    e.innerHTML=`<div class="ava polaroid"><div class="ph"><img alt="${p.name}" src="${AV(p.id)}"></div><span class="nm">${p.name}${s===2?'<small>partner</small>':''}</span></div>
      <div class="tally" aria-label="tricks"></div>${s!==0?'<div class="backs"></div>':''}`;
  }
}
function renderSeat(s,pop){
  const p=G.seats[s],e=seatEl(s);
  e.classList.toggle('out',G.out===s);
  const ava=e.querySelector('.ava');
  ava.querySelectorAll('.dchip,.tag').forEach(x=>x.remove());
  if(G.dealer===s) ava.insertAdjacentHTML('beforeend','<span class="dchip" title="Dealer">D</span>');
  if(G.maker===s) ava.insertAdjacentHTML('beforeend',`<span class="tag ${G.alone?'alone':''} ${isRedSuit(G.trump)?'red':''}">${SUIT_SVG[G.trump]}${G.alone?'alone!':'called'}</span>`);
  else if(G.out===s) ava.insertAdjacentHTML('beforeend','<span class="tag sit">sitting out</span>');
  const t=e.querySelector('.tally');
  let h='';for(let k=0;k<Math.min(4,p.tricks);k++) h+=`<i style="--k:${k}" class="${pop&&k===p.tricks-1?'pop':''}"></i>`;
  if(p.tricks>=5) h+='<i class="x pop"></i>';
  t.innerHTML=h;t.setAttribute('aria-label',`${p.tricks} tricks`);
  const bk=e.querySelector('.backs');
  if(bk) bk.innerHTML=G.out===s?'':p.hand.map((_,k)=>backHTML('sm',k+(5-p.hand.length)/2)).join('');
}
function setTurn(s){
  $$('.seat').forEach(e=>{e.classList.remove('turn');e.querySelectorAll('.think').forEach(x=>x.remove());});
  if(s==null) return;
  const e=seatEl(s);e.classList.add('turn');
  if(s!==0&&!G.pending) $('#actions').innerHTML=`<div class="hint">${nameOf(s)} is thinking…</div>`;
  if(s!==0) e.querySelector('.ava').insertAdjacentHTML('beforeend','<span class="think">…</span>');
}
function renderScore(init){
  const ids=[['#scoreUs','#barUs'],['#scoreThem','#barThem']];
  ids.forEach(([n,b],t)=>{$(n).textContent=G.score[t];$(b).innerHTML=Array.from({length:WIN_PTS},(_,i)=>`<i class="${i<G.score[t]?'on':''}"></i>`).join('');});
}
function renderTrump(pop){
  const c=$('#trumpChip');
  if(G.trump==null){c.hidden=true;return;}
  c.hidden=false;c.className='trumpchip '+(isRedSuit(G.trump)?'red':'black')+(pop?' pop':'');
  const tt=[teamTricks(0),teamTricks(1)];
  c.innerHTML=`${SUIT_SVG[G.trump]}<span class="tt"><small>TRUMP</small><b>${suitWord(G.trump)}</b></span>`;
}
function renderHand(mode){
  const h=G.seats[0].hand;
  const sorted=sortHand(h,G.trump);
  const box=$('#hand');
  const W=box.clientWidth||360,n=Math.max(1,sorted.length);
  const hw=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hw'))||72;
  const ov=Math.max(-hw*.5,Math.min(6,(W-8-n*hw)/(Math.max(1,n-1))));
  box.style.setProperty('--ov',ov+'px');
  const prev=new Set($$('#hand .hcard').map(x=>+x.dataset.c));
  const mid=(sorted.length-1)/2;
  box.innerHTML=sorted.map((c,i)=>{
    let cls='hcard';
    if(mode==='play') cls+=G.legal.includes(c)?' ok':' no';
    if(mode==='discard') cls+=' ok';
    if((mode==='play'||mode==='discard')&&coachOn()&&G.rec===c) cls+=' rec';
    if(prev.size&&!prev.has(c)) cls+=' newc';
    const d=i-mid;
    return `<button class="${cls}" data-c="${c}" style="--fr:${(d*3.2).toFixed(1)}deg;--fy:${(Math.abs(d)*Math.abs(d)*2.2).toFixed(1)}px" aria-label="${cardName(c,G.trump)}" ${mode?'':'tabindex="-1"'}>${cardHTML(c,{trump:G.trump})}</button>`;
  }).join('');
  if(G.out===0) box.style.opacity=.35; else box.style.opacity='';
}
function setActions(html,rec,suitRec){
  const a=$('#actions');a.innerHTML=html;
  a.querySelectorAll('.btn').forEach((b,i)=>b.style.setProperty('--r',(((i*53)%5)-2)*.7+'deg'));
  if(rec&&coachOn()){const b=a.querySelector(`[data-a="${rec}"]`);if(b) b.classList.add('rec');}
}
function setStatus(t){$('#status').textContent=t||'';}
function line(s,kind,suit){const v=VOICE[G.seats[s].id];const arr=v&&v[kind];if(!arr) return null;return pick(arr).replace('{s}',suit!=null?suitWord(suit):'');}
function bubble(s,text,ms=1600,big){
  if(!text) return;const e=seatEl(s);e.querySelectorAll('.bubble').forEach(b=>b.remove());
  const b=el(`<div class="bubble${big?' big':''}">${esc(text)}</div>`);e.appendChild(b);
  setTimeout(()=>{b.classList.add('out');setTimeout(()=>b.remove(),260);},ms*Math.max(pace(),.6));
}
const moodTimers={};
function mood(s,m,ms=1200){
  const img=seatEl(s).querySelector('.ava img');if(!img) return;
  const id=G.seats[s].id;img.src=AV(id,m)||AV(id);
  const a=seatEl(s).querySelector('.ava');a.classList.remove('react');void a.offsetWidth;a.classList.add('react');
  clearTimeout(moodTimers[s]);moodTimers[s]=setTimeout(()=>{if(img.isConnected) img.src=AV(id);},ms);
}
function layout(){
  const w=Math.min(innerWidth,560)-24;
  const hw=Math.max(54,Math.min(80,Math.floor(w/5.2)));
  document.documentElement.style.setProperty('--hw',hw+'px');
  const tb=$('#table');
  if(tb&&tb.clientHeight){
    const fw=tb.clientWidth-2*86, fh=tb.clientHeight-64-58;
    const cw=Math.max(46,Math.min(78,Math.floor(Math.min(fw/2.95,fh/3.3))));
    tb.style.setProperty('--cw',cw+'px');
  }
  if(G&&!$('#game').hidden&&G.seats[0].hand.length){const m=$('#hand .hcard.ok')?(G.legal?'play':'discard'):null;renderHand(m);}
}
addEventListener('resize',layout);

/* =====================================================================
   END OF MATCH, MENU, RULES
   ===================================================================== */
function endMatch(won){
  const before=new Set(unlockedIds());
  const st=S();st.played++;if(won){st.won++;st.streak++;st.bestStreak=Math.max(st.bestStreak,st.streak);st.winsBy[G.table.id]=(st.winsBy[G.table.id]||0)+1;}else st.streak=0;
  st.euchresFor+=G.stats.euchres;st.euchredAgainst+=G.stats.euchred;st.loners+=G.stats.loners;st.handsPlayed+=G.handNo;st.tricksTotal+=G.stats.tricks;persist();
  const fresh=[...BACKS,...FACES].filter(it=>!before.has(it.id)&&isUnlocked(it));
  won?sfx.win():sfx.bad();flash(won?'#f2b440':'#d4473f');
  if(fresh.length) setTimeout(()=>sfx.unlock(),900);
  for(let s=0;s<4;s++) mood(s,teamOf(s)===(won?0:1)?'laugh':'scowl',60000);
  const cs_=G.stats,acc=cs_.coachN?Math.round(100*cs_.coachHit/cs_.coachN):0;
  const prev=it=>BACKS.includes(it)?`<div class="card"><div class="inner"><div class="face"></div><div class="back b-${it.id}"></div></div></div>`:cardHTML(5,{faceCls:'f-'+it.id});
  openModal(`<h2 class="${won?'good':''}">${won?'You win!':'They win.'}</h2>
    <div class="endfaces">${[0,2].map(s=>`<div class="polaroid"><div class="ph"><img src="${AV(G.seats[s].id,won?'laugh':'scowl')}" alt=""></div><span class="nm">${G.seats[s].name}</span></div>`).join('')}</div>
    <p style="text-align:center;font-size:19px"><b style="font-family:var(--marker);font-weight:400;font-size:26px">${G.score[0]}</b> to <b style="font-family:var(--marker);font-weight:400;font-size:26px">${G.score[1]}</b> at ${G.table.name}</p>
    ${fresh.length?`<div class="unlocks"><h3>Unlocked!</h3>${fresh.map(it=>`<div class="u">${prev(it)}<span>${it.name}<br><small style="font-weight:400">${BACKS.includes(it)?'card back':'card face'} · ${it.req}</small></span></div>`).join('')}</div>`:''}
    <div class="statgrid">
      <div><small>Hands</small><b>${G.handNo}</b></div>
      <div><small>Tricks you took</small><b>${cs_.tricks}</b></div>
      <div><small>Euchres for us</small><b>${cs_.euchres}</b></div>
      <div><small>Coach agreed</small><b>${acc}%</b></div>
    </div>
    <div class="btns"><button class="btn b-gold big" id="mRematch" style="--r:-1deg">Rematch</button>
      ${fresh.length?'<button class="btn b-teal" id="mDeck" style="--r:1deg">Try it on</button>':''}
      <button class="btn b-plain" id="mHome" style="--r:.6deg">Back to the alley</button></div>`,false);
  $('#mRematch').onclick=()=>{closeModal();startMatch();};
  $('#mHome').onclick=()=>{closeModal();renderHome();};
  if(fresh.length) $('#mDeck').onclick=()=>{closeModal();G.dead=true;G=null;renderDeck(BACKS.includes(fresh[0])?'backs':'faces');};
}
function openModal(html,dismissable=true){$('#modal').innerHTML=html;$('#modal').hidden=false;$('#scrim').hidden=false;$('#scrim').onclick=dismissable?closeModal:null;}
function closeModal(){$('#modal').hidden=true;$('#scrim').hidden=true;}
$('#menuBtn').onclick=()=>{
  sfx.tap();
  const tog=(k,l)=>`<button class="tog" role="switch" data-k="${k}" aria-checked="${!!S()[k]}"><span>${l}</span><span class="sw"></span></button>`;
  openModal(`<h2>Paused</h2><div class="toglist">${tog('coach','Coach hints')}${tog('fast','Fast pace')}${tog('sound','Sound')}</div>
    <div class="btns"><button class="btn b-gold" id="mResume" style="--r:-1deg">Resume</button><button class="btn b-teal" id="mRules" style="--r:1deg">How to play</button><button class="btn b-plain" id="mQuit" style="--r:-.5deg">Quit to the alley</button></div>`);
  bindToggles();
  $('#mResume').onclick=closeModal;
  $('#mRules').onclick=openRules;
  $('#mQuit').onclick=()=>{closeModal();renderHome();};
};
function openRules(){
  const t=1; // hearts as the example
  const order=[2+6*1,2+6*2,5+6*1,4+6*1,3+6*1,1+6*1,0+6*1];
  openModal(`<h2>How to play</h2><div class="rules">
    <h3>The table</h3><ul><li>You and <b>Bandit</b> (across from you) are a team against the two players on your sides.</li><li>24 cards: 9 through Ace. Five cards each. First team to <b>${WIN_PTS}</b> wins.</li></ul>
    <h3>Trump ranking (if ♥ is trump)</h3>
    <div class="rankrow">${order.map(c=>cardHTML(c,{trump:t})).join('')}</div>
    <ul><li>The <b>right bower</b> is the jack of trump. The <b>left bower</b> is the other jack of the same colour — it counts as trump.</li></ul>
    <h3>Picking trump</h3><ul><li>One card is turned up. Going around, each player can <b>order it up</b> (dealer takes it and discards) or pass.</li>
    <li>If all pass, it's turned down and players can name any <i>other</i> suit. With <b>stick the dealer</b> on, the dealer must name one.</li></ul>
    <h3>Playing</h3><ul><li>Follow the suit that was led if you can. Highest trump wins, otherwise the highest card of the led suit.</li></ul>
    <h3>Scoring</h3><ul><li>Calling team takes 3 or 4 tricks: <b>1 pt</b>. All 5: <b>2 pts</b>.</li><li>Go <b>alone</b> (partner sits out) and take all 5: <b>4 pts</b>.</li><li>Calling team takes fewer than 3: they're <b>euchred</b>, other team gets <b>2 pts</b>.</li></ul>
    <h3>Coach</h3><ul><li>With coach hints on, a <b>★</b> marks what a sharp player would do. Trump cards have a gold corner.</li></ul>
    </div><div class="btns"><button class="btn b-gold" id="mClose" style="--r:-1deg">Got it</button></div>`);
  $('#mClose').onclick=closeModal;
}
