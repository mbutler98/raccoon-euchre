/* =====================================================================
   UI KIT: dom helpers, save data, sound, scenes, paper cards
   ===================================================================== */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const pick=a=>a[Math.floor(Math.random()*a.length)];
const rnd=(a,b)=>a+Math.random()*(b-a);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- save data (per-browser convenience; the game runs fine without it) ---------- */
const STORE_KEY='trashnight_euchre_v1';
const DEFAULTS={table:'porch',stick:true,coach:true,fast:false,sound:true,back:'classic',face:'paper',
  played:0,won:0,handsPlayed:0,euchresFor:0,euchredAgainst:0,loners:0,bestStreak:0,streak:0,tricksTotal:0,winsBy:{},seen:[]};
let SAVE=(()=>{try{const s=Object.assign({},DEFAULTS,JSON.parse(localStorage.getItem(STORE_KEY)||'{}'));s.winsBy=s.winsBy||{};s.seen=s.seen||[];return s;}catch(e){return JSON.parse(JSON.stringify(DEFAULTS));}})();
const S=()=>SAVE;
function persist(){try{localStorage.setItem(STORE_KEY,JSON.stringify(SAVE));}catch(e){}}

/* ---------- sound (tiny WebAudio blips, no files) ---------- */
let AC=null;
function ac(){if(!S().sound) return null;if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}}if(AC.state==='suspended') AC.resume();return AC;}
function tone(f,d,type='triangle',v=.05,t0=0,slide=0){const a=ac();if(!a) return;const t=a.currentTime+t0;
  const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide) o.frequency.linearRampToValueAtTime(f+slide,t+d);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g).connect(a.destination);o.start(t);o.stop(t+d+.02);}
function noise(d=.05,v=.05,hp=2500,t0=0){const a=ac();if(!a) return;const t=a.currentTime+t0;const n=Math.floor(a.sampleRate*d);const b=a.createBuffer(1,n,a.sampleRate);
  const ch=b.getChannelData(0);for(let i=0;i<n;i++) ch[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);const s=a.createBufferSource();s.buffer=b;
  const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=hp;f.Q.value=.7;const g=a.createGain();g.gain.value=v;s.connect(f).connect(g).connect(a.destination);s.start(t);}
const sfx={  /* papery: swishes and soft plucks rather than chiptune */
  card(){noise(.09,.16,2200);},
  deal(){noise(.05,.09,3000);},
  tap(){noise(.03,.08,1500);tone(520,.05,'sine',.02);},
  pass(){tone(300,.1,'sine',.04);},
  call(){tone(523,.12,'triangle',.05);tone(784,.16,'triangle',.05,.08);},
  trick(){tone(784,.1,'triangle',.05);tone(1047,.14,'triangle',.05,.07);},
  lostTrick(){tone(392,.12,'sine',.05);tone(311,.16,'sine',.05,.09);},
  point(){[523,659,784].forEach((f,i)=>tone(f,.14,'triangle',.05,i*.08));},
  euchre(){[392,523,659,784,1047].forEach((f,i)=>tone(f,.16,'triangle',.06,i*.08));noise(.4,.12,1800,.35);},
  bad(){[392,330,262].forEach((f,i)=>tone(f,.2,'sawtooth',.025,i*.13));},
  win(){[523,659,784,1047,784,1047].forEach((f,i)=>tone(f,.18,'triangle',.06,i*.11));},
  unlock(){[784,988,1175,1568].forEach((f,i)=>tone(f,.16,'sine',.05,i*.07));}
};

/* ---------- scenes + mood flashes (replaces the swirl) ---------- */
function setScene(name){document.body.dataset.scene=name;}
function flash(color='#f2b440'){const f=$('#flash');f.style.setProperty('--fc',color);f.classList.remove('go');void f.offsetWidth;f.classList.add('go');}
function applyLook(){document.body.dataset.back=S().back;document.body.dataset.face=S().face;}

/* ---------- suits: smooth, slightly hand-drawn shapes ---------- */
const SUIT_PATHS=[
  'M50 4C42 20 24 33 13 46 2 59 4 78 20 84 31 88 40 83 45 76 44 86 38 93 29 97H71C62 93 56 86 55 76 60 83 69 88 80 84 96 78 98 59 87 46 76 33 58 20 50 4Z',
  'M50 93C33 78 6 60 5 35 4 18 16 7 30 7 40 7 47 13 50 22 53 13 60 7 70 7 84 7 96 18 95 35 94 60 67 78 50 93Z',
  'M50 3C58 18 72 35 91 50 72 65 58 82 50 97 42 82 28 65 9 50 28 35 42 18 50 3Z',
  'M50 5C38 5 29 14 29 26 29 31 31 35 33 39 30 37 26 36 22 36 11 36 3 45 3 57 3 69 12 77 23 77 32 77 39 72 44 64 44 79 38 90 29 97H71C62 90 56 79 56 64 61 72 68 77 77 77 88 77 97 69 97 57 97 45 89 36 78 36 74 36 70 37 67 39 69 35 71 31 71 26 71 14 62 5 50 5Z'
];
const SUIT_SVG=SUIT_PATHS.map(d=>`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${d}"/></svg>`);
const isRedSuit=s=>s===1||s===2;
const RANK_TXT=['9','10','J','Q','K','A'];

/* ---------- cards ---------- */
/* cardHTML(c,{up,trump,cls,mark,tilt}) — trump marks trump cards and labels the bowers */
function cardHTML(c,o={}){
  const up=o.up!==false&&c!=null;
  let cls='card'+(up?' up':'')+(o.cls?' '+o.cls:'');
  let face='<div class="face"></div>';
  if(c!=null){
    const s=cs(c),r=cr(c),t=o.trump;
    if(t!=null&&isTrump(c,t)&&o.mark!==false) cls+=' trump';
    const court=r>=2&&r<=4;
    const centre=court?`<span class="court">${RANK_TXT[r]}</span>`:`<div class="mid">${SUIT_SVG[s]}</div>`;
    const bw=t!=null&&o.mark!==false?(isRight(c,t)?'<span class="bw">RIGHT</span>':isLeft(c,t)?'<span class="bw">LEFT</span>':''):'';
    const corner=k=>`<div class="cr ${k}"><b>${RANK_TXT[r]}</b>${SUIT_SVG[s]}</div>`;
    face=`<div class="face ${isRedSuit(s)?'red':''}${o.faceCls?' '+o.faceCls:''}" aria-label="${cardName(c,t)}">${corner('')}${centre}${corner('cr2')}${bw}</div>`;
  }
  const tilt=o.tilt!=null?` style="--tr:${o.tilt}deg"`:'';
  return `<div class="${cls}"${c!=null?` data-c="${c}"`:''}${tilt}><div class="inner">${face}<div class="back${o.backCls?' '+o.backCls:''}"></div></div></div>`;
}
const backHTML=(cls='',k=0)=>`<div class="card ${cls}" style="--k:${k}"><div class="inner"><div class="face"></div><div class="back"></div></div></div>`;
const tiltFor=c=>((c*37)%9-4)*1.3;   /* stable little tilt per card, like they were tossed down */
function el(html){const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;}

/* fly a card from one element's box to another's; resolves when it lands */
function flyCard(html,fromEl,toEl,{ms=380,w=null,rot=0,toRot=0,fromScale=1}={}){
  return new Promise(res=>{
    const a=fromEl.getBoundingClientRect(),b=toEl.getBoundingClientRect();
    const node=el(html);node.classList.add('flycard');
    const W=w||b.width||60;node.style.setProperty('--w',W+'px');
    $('#fx').appendChild(node);
    const nw=W,nh=W*1.4;
    const ax=a.left+a.width/2-nw/2,ay=a.top+a.height/2-nh/2,bx=b.left+b.width/2-nw/2,by=b.top+b.height/2-nh/2;
    const anim=node.animate([{transform:`translate(${ax}px,${ay}px) scale(${fromScale}) rotate(${rot}deg)`},{transform:`translate(${bx}px,${by}px) scale(1) rotate(${toRot}deg)`}],
      {duration:ms*pace(),easing:'cubic-bezier(.25,.8,.35,1)',fill:'forwards'});
    anim.onfinish=()=>{node.remove();res();};
  });
}
function toast(html){const t=el(`<div class="toast">${html}</div>`);document.body.appendChild(t);setTimeout(()=>t.remove(),3400);}
