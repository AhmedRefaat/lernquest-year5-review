const GAME_ID='falling_stars';

const VERSION = 1;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaultStorage={load:key=>{try{return JSON.parse(localStorage.getItem(key))}catch{return null}},save:(key,value)=>localStorage.setItem(key,JSON.stringify(value))};
export class BudgetGame {
  constructor(container,options={}){
    if(!container) throw new Error('A container element is required.');
    this.el=container; this.options=options; this.playerId=options.playerId||'anonymous'; this.sessionId=options.sessionId||crypto.randomUUID?.()||String(Date.now());
    this.storage=options.storage||defaultStorage; this.log=options.logger||((event,data={})=>console.info(JSON.stringify({ts:new Date().toISOString(),game:GAME_ID,event,...data})));
    this.labels=options.labels||{};
    this.key=`lernquest-game:${GAME_ID}:${this.playerId}`; this.remaining=clamp(Number(options.timeBudgetSec)||0,0,3600); this.running=false; this.timer=null;
    this.state=Object.assign(this.initialState(),this.storage.load(this.key)||{}); this.state.version=VERSION; this.sanitizeState(); this.save('loaded'); this.render();
  }
  initialState(){return {version:VERSION,totalPlayMs:0,rounds:0,coins:0,lastPlayedAt:null};}
  L(key,fallback){return this.labels[key]??fallback}
  start(){if(this.running||this.remaining<=0)return;this.running=true;this.lastTick=performance.now();this.state.rounds++;this.emit('game:start');this.loop();this.renderHud();}
  loop(){if(!this.running)return;const now=performance.now(),delta=now-this.lastTick;this.lastTick=now;this.remaining=Math.max(0,this.remaining-delta/1000);this.state.totalPlayMs+=delta;this.onFrame(delta);this.renderHud();if(this.remaining<=0){this.pause('budget_exhausted');return}this.timer=requestAnimationFrame(()=>this.loop())}
  pause(reason='manual'){if(!this.running)return;this.running=false;cancelAnimationFrame(this.timer);this.state.lastPlayedAt=new Date().toISOString();this.save(reason);this.emit('game:paused',{reason,remainingSec:this.remaining,state:this.publicState()});this.onPause(reason);this.renderHud();}
  addBudget(seconds){this.remaining=clamp(this.remaining+Number(seconds||0),0,3600);this.emit('game:budget-added',{seconds:Number(seconds||0),remainingSec:this.remaining});this.renderHud();}
  complete(extra={}){this.save('complete');this.emit('game:complete',{remainingSec:this.remaining,state:this.publicState(),...extra});}
  save(reason){this.storage.save(this.key,this.state);this.log('state.saved',{reason,playerId:this.playerId,remainingSec:Number(this.remaining.toFixed(2))});}
  emit(name,detail={}){this.el.dispatchEvent(new CustomEvent(name,{bubbles:true,detail:{gameId:GAME_ID,playerId:this.playerId,sessionId:this.sessionId,...detail}}));this.options.onEvent?.(name,detail)}
  publicState(){return JSON.parse(JSON.stringify(this.state));}
  destroy(){this.pause('destroy');this.el.innerHTML='';}
  renderHud(){const t=this.el.querySelector('[data-time]');if(t)t.textContent=`${Math.ceil(this.remaining)}s`;const b=this.el.querySelector('[data-start]');if(b)b.textContent=this.running?this.L('playing','Playing…'):this.remaining>0?this.L('play','Play / Resume'):this.L('timeUp','Time finished');if(b)b.disabled=this.running||this.remaining<=0;this.el.classList.toggle('paused',!this.running)}
  render(){} onFrame(){} onPause(){} sanitizeState(){}
}

export class FallingStarsGame extends BudgetGame{
 initialState(){return {...super.initialState(),score:0,caught:0,bestScore:0,playerX:45};}
 render(){this.el.innerHTML=`<section class="game-shell"><h1>${esc(this.L('title','🌟 Catch the Falling Stars'))}</h1><div class="hud"><span>⏱️ <b data-time></b></span><span>${esc(this.L('score','Score'))} <b data-score>${this.state.score}</b></span><span>${esc(this.L('caught','Caught'))} ${this.state.caught}</span></div><div class="arena space" data-arena><div class="player" data-player style="left:${this.state.playerX}%">🚀</div><div class="controls"><button class="secondary" data-left>⬅️</button><button class="secondary" data-right>➡️</button></div></div><button class="primary" data-start>${esc(this.L('play','Play / Resume'))}</button> <button class="secondary" data-pause>${esc(this.L('pause','Pause'))}</button></section>`;this.falls=[];this.spawnClock=0;this.el.querySelector('[data-start]').onclick=()=>this.start();this.el.querySelector('[data-pause]').onclick=()=>this.pause();this.el.querySelector('[data-left]').onpointerdown=()=>this.move(-10);this.el.querySelector('[data-right]').onpointerdown=()=>this.move(10);this.keyHandler=e=>{if(e.key==='ArrowLeft')this.move(-7);if(e.key==='ArrowRight')this.move(7)};window.addEventListener('keydown',this.keyHandler,{once:false});this.renderHud()}
 move(d){if(!this.running)return;this.state.playerX=clamp(this.state.playerX+d,2,88);const p=this.el.querySelector('[data-player]');if(p)p.style.left=this.state.playerX+'%'}
 onFrame(delta){this.spawnClock+=delta;if(this.spawnClock>700){this.spawnClock=0;this.spawn()}const arena=this.el.querySelector('[data-arena]');if(!arena)return;const h=arena.clientHeight,w=arena.clientWidth;this.falls=[...arena.querySelectorAll('.fall')];for(const s of this.falls){let y=Number(s.dataset.y)+delta*.13;s.dataset.y=y;s.style.top=y+'px';const sx=Number(s.dataset.x);if(y>h-105&&y<h-25&&Math.abs(sx-this.state.playerX)<10){const value=Number(s.dataset.value);this.state.score+=value;this.state.caught++;this.state.bestScore=Math.max(this.state.bestScore,this.state.score);this.el.querySelector('[data-score]').textContent=this.state.score;s.remove();this.emit('game:reward',{reward:{type:'coins',amount:value}})}else if(y>h)s.remove()}}
 spawn(){const a=this.el.querySelector('[data-arena]');if(!a)return;const rare=Math.random()>.88,s=document.createElement('div');s.className='fall';s.textContent=rare?'💎':'⭐';s.dataset.value=rare?'5':'1';s.dataset.y='-45';s.dataset.x=String(Math.floor(Math.random()*86+2));s.style.left=s.dataset.x+'%';a.appendChild(s)}
 onPause(reason){this.save(reason)}
 destroy(){window.removeEventListener('keydown',this.keyHandler);super.destroy()}
}
export function createGame(container,options){return new FallingStarsGame(container,options)}
