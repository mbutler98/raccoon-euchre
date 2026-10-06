/* =====================================================================
   EUCHRE RULES ENGINE + RACCOON BRAINS
   card int = suit*6 + rank   rank 0..5 = 9,10,J,Q,K,A   suit 0..3 = ♠ ♥ ♦ ♣
   Same-colour partner suit is 3-s (♠↔♣, ♥↔♦), which is where the left bower lives.
   Seats run clockwise: 0 You (bottom), 1 left, 2 partner (top), 3 right. Teams = seat%2.
   ===================================================================== */
const RANKS=['9','10','J','Q','K','A'];
const RANK_WORD=['Nine','Ten','Jack','Queen','King','Ace'];
const SUITS=['spades','hearts','diamonds','clubs'];
const SUIT_NAME=['Spades','Hearts','Diamonds','Clubs'];
const SUIT_SYM=['♠','♥','♦','♣'];
const isRed=s=>s===1||s===2;
const cs=c=>Math.floor(c/6), cr=c=>c%6;
const partnerOf=p=>(p+2)%4;
const teamOf=p=>p%2;
const isRight=(c,t)=>cr(c)===2&&cs(c)===t;
const isLeft=(c,t)=>cr(c)===2&&cs(c)===3-t;
const effSuit=(c,t)=>isLeft(c,t)?t:cs(c);
const isTrump=(c,t)=>effSuit(c,t)===t;
function power(c,t,led){
  if(isRight(c,t)) return 200;
  if(isLeft(c,t)) return 190;
  if(cs(c)===t) return 100+cr(c);
  if(cs(c)===led) return 50+cr(c);
  return cr(c);
}
function cardName(c,t){
  if(t!=null&&isRight(c,t)) return 'the right bower';
  if(t!=null&&isLeft(c,t)) return 'the left bower';
  return `${RANK_WORD[cr(c)]} of ${SUIT_NAME[cs(c)]}`;
}
const cardShort=c=>RANKS[cr(c)]+SUIT_SYM[cs(c)];
function newDeck(){const d=[];for(let i=0;i<24;i++) d.push(i);for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return d;}
function legalPlays(hand,led,t){if(led==null) return hand.slice();const f=hand.filter(c=>effSuit(c,t)===led);return f.length?f:hand.slice();}
function trickWinner(plays,t){
  const led=effSuit(plays[0].card,t);let best=plays[0];
  for(const pl of plays) if(power(pl.card,t,led)>power(best.card,t,led)) best=pl;
  return best;
}
/* sort a hand for display: trump first (bowers on top), then alternating colours */
function sortHand(hand,t){
  const order=t==null?[0,1,3,2]:[t,(t+1)%4,(t+2)%4,(t+3)%4].sort((a,b)=>a===t?-1:b===t?1:0);
  // alternate colours after trump
  let rest=order.filter(s=>s!==t);if(t!=null){const blacks=rest.filter(s=>!isRed(s)),reds=rest.filter(s=>isRed(s));
    rest=isRed(t)?[blacks[0],reds[0],blacks[1]].filter(x=>x!=null):[reds[0],blacks[0],reds[1]].filter(x=>x!=null);}
  const seq=t==null?order:[t,...rest];
  const key=c=>{const s=t==null?cs(c):effSuit(c,t);return seq.indexOf(s)*1000-(t==null?cr(c):power(c,t,s));};
  return hand.slice().sort((a,b)=>key(a)-key(b));
}

/* ---------- scoring ---------- */
/* returns {team, pts, kind} kind: make | march | loner | euchre */
function scoreHand(makerSeat,alone,tricks){
  const mt=teamOf(makerSeat),made=tricks[mt],def=tricks[1-mt];
  if(made>=3){
    if(made===5) return {team:mt,pts:alone?4:2,kind:alone?'loner':'march'};
    return {team:mt,pts:1,kind:'make'};
  }
  return {team:1-mt,pts:2,kind:'euchre',def};
}

/* ---------- bot evaluation ---------- */
const TRUMP_VAL=[1.2,1.3,0,1.5,1.7,2.0];
function cardCallValue(c,t){if(isRight(c,t)) return 3;if(isLeft(c,t)) return 2.5;if(cs(c)===t) return TRUMP_VAL[cr(c)];return 0;}
function handStrength(hand,t){
  let s=0,trumps=0;const held=new Set();
  for(const c of hand){
    if(isTrump(c,t)){trumps++;s+=cardCallValue(c,t);}
    else{held.add(cs(c));if(cr(c)===5) s+=.9;else if(cr(c)===4) s+=.2;}
  }
  const voids=3-held.size;if(trumps>=2) s+=.5*voids;
  if(trumps<=1) s-=.6;
  return {s,trumps,right:hand.some(c=>isRight(c,t)),left:hand.some(c=>isLeft(c,t))};
}
/* which card the dealer throws away after picking up */
function chooseDiscard(hand,t){
  const non=hand.filter(c=>!isTrump(c,t));
  if(non.length){
    const bySuit={};non.forEach(c=>(bySuit[cs(c)]=bySuit[cs(c)]||[]).push(c));
    // short a suit if it's a lone non-ace
    const singles=Object.values(bySuit).filter(a=>a.length===1&&cr(a[0])!==5).map(a=>a[0]).sort((a,b)=>cr(a)-cr(b));
    if(singles.length) return singles[0];
    const nonAce=non.filter(c=>cr(c)!==5).sort((a,b)=>cr(a)-cr(b));
    if(nonAce.length) return nonAce[0];
    return non.sort((a,b)=>cr(a)-cr(b))[0];
  }
  return hand.slice().sort((a,b)=>power(a,t,t)-power(b,t,t))[0];
}
function withPickup(hand,up,t){const h=hand.concat([up]);const d=chooseDiscard(h,t);return h.filter(c=>c!==d);}

/* round one: order the upcard? returns {call,alone} */
function botOrder(seat,hand,up,dealer,P,rules){
  const t=cs(up);let st;
  if(seat===dealer) st=handStrength(withPickup(hand,up,t),t);
  else{
    st=handStrength(hand,t);const uv=cardCallValue(up,t);
    if(partnerOf(seat)===dealer) st.s+=uv*.55; else st.s-=uv*.5;
  }
  const s=st.s+(P.nerve||0)*(Math.random()-.5);
  let call=s>=P.call&&st.trumps>=2;
  if(!call) return {call:false,alone:false,score:s};
  let alone=s>=P.alone&&st.trumps>=3&&(st.right||st.left);
  if(rules.canadian&&partnerOf(seat)===dealer) alone=true;   // Canadian loner: ordering your dealer-partner means going it alone
  if(rules.canadian&&partnerOf(seat)===dealer&&s<P.alone-1.2) return {call:false,alone:false,score:s};
  return {call,alone,score:s};
}
/* round two: name a suit? returns {suit|null, alone} */
function botCall(seat,hand,turned,dealer,P,rules){
  let best=null,bs=-9,bst=null;
  for(let t=0;t<4;t++){if(t===turned) continue;const st=handStrength(hand,t);let s=st.s;
    if(t===3-turned&&(seat===(dealer+1)%4)) s+=.35;   // "next": same colour as the turned-down card
    if(s>bs){bs=s;best=t;bst=st;}}
  const forced=rules.stick&&seat===dealer;
  const s=bs+(P.nerve||0)*(Math.random()-.5);
  if(s>=P.call-.15&&bst.trumps>=2||forced){
    const alone=s>=P.alone&&bst.trumps>=3&&(bst.right||bst.left);
    return {suit:best,alone,score:s};
  }
  return {suit:null,alone:false,score:s};
}

/* ---------- card play ---------- */
function unseenHigher(c,t,led,known){
  // is there any card not yet known that beats c in its own effective suit?
  const es=effSuit(c,t);const pw=power(c,t,es);
  for(let x=0;x<24;x++){if(known.has(x)) continue;if(effSuit(x,t)===es&&power(x,t,es)>pw) return true;}
  return false;
}
function trumpsOut(t,known){let n=0;for(let x=0;x<24;x++) if(!known.has(x)&&isTrump(x,t)) n++;return n;}
function keepValue(c,t){if(isTrump(c,t)) return 20+power(c,t,t)/10;if(cr(c)===5) return 12;return cr(c);}
function dumpCard(cards,t){return cards.slice().sort((a,b)=>keepValue(a,t)-keepValue(b,t))[0];}
/*  H = hand state view {trump,maker,alone,out,trick:[{seat,card}],known:Set} */
function botPlay(seat,hand,H,P){
  const t=H.trump,trick=H.trick,led=trick.length?effSuit(trick[0].card,t):null;
  const leg=legalPlays(hand,led,t);if(leg.length===1) return leg[0];
  if(P.sloppy&&Math.random()<P.sloppy) return leg[Math.floor(Math.random()*leg.length)];
  const known=new Set(H.known);hand.forEach(c=>known.add(c));
  const makers=teamOf(H.maker)===teamOf(seat);
  const byPow=(a,b)=>power(b,t,led==null?effSuit(b,t):led)-power(a,t,led==null?effSuit(a,t):led);
  if(!trick.length){
    const trumps=leg.filter(c=>isTrump(c,t)).sort(byPow);
    const non=leg.filter(c=>!isTrump(c,t));
    const offAces=non.filter(c=>cr(c)===5);
    const out=trumpsOut(t,known);
    if(trumps.length&&out>0){
      const boss=!unseenHigher(trumps[0],t,t,known);
      if(makers&&boss) return trumps[0];
      if(makers&&H.maker===seat&&trumps.length>=2) return trumps[0];
      if(makers&&P.leadTrump&&H.maker===partnerOf(seat)) return trumps[0];
    }
    const bossOff=non.filter(c=>!unseenHigher(c,t,cs(c),known));
    if(offAces.length) return offAces[0];
    if(bossOff.length) return bossOff[0];
    if(non.length){
      // defenders: lead a low card, ideally a short suit so we can trump in later
      return non.slice().sort((a,b)=>cr(a)-cr(b))[0];
    }
    return makers?trumps[0]:trumps[trumps.length-1];
  }
  const win=trickWinner(trick,t);const wpow=power(win.card,t,led);
  const active=H.out==null?4:3;const last=trick.length===active-1;
  const partnerWinning=win.seat===partnerOf(seat);
  const winners=leg.filter(c=>power(c,t,led)>wpow).sort((a,b)=>power(a,t,led)-power(b,t,led));
  if(partnerWinning){
    const safe=last||!unseenHigher(win.card,t,led,known)||(wpow>=100&&P.trustPartner);
    if(safe||!winners.length) return dumpCard(leg,t);
    // partner is winning with a weak card and someone still plays after us: cover it if cheap
    const cover=winners.filter(c=>!isTrump(c,t)||effSuit(win.card,t)===t);
    return cover.length?cover[cover.length-1]:dumpCard(leg,t);
  }
  if(winners.length){
    if(last) return winners[0];
    // play a card that will hold up if we have one, else cheapest winner
    const holders=winners.filter(c=>!unseenHigher(c,t,led,known));
    if(holders.length) return holders[0];
    return winners[0];
  }
  return dumpCard(leg,t);
}

/* ---------- personalities ---------- */
const BRAINS={
  steady:{call:5.6,alone:9.6,nerve:.4,leadTrump:true,trustPartner:true},
  reckless:{call:4.9,alone:8.0,nerve:1.1,leadTrump:false,trustPartner:false},
  slick:{call:5.3,alone:9.0,nerve:.7,leadTrump:true,trustPartner:true},
  sharp:{call:5.4,alone:9.2,nerve:.3,leadTrump:true,trustPartner:true},
  timid:{call:6.4,alone:10.5,nerve:.5,leadTrump:true,trustPartner:true}
};

if(typeof module!=='undefined') module.exports={RANKS,SUITS,SUIT_SYM,cs,cr,partnerOf,teamOf,isRight,isLeft,effSuit,isTrump,power,newDeck,legalPlays,trickWinner,sortHand,scoreHand,handStrength,chooseDiscard,botOrder,botCall,botPlay,BRAINS,cardName,cardShort};
