const GAME_ID='balloon_pop';

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
    this.key=`lernquest-game:${GAME_ID}:${this.playerId}`; this.remaining=clamp(Number(options.timeBudgetSec)||0,0,3600); this.running=false; this.timer=null; this.timers=[];
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
  destroy(){this.pause('destroy');this.destroyed=true;this.timers.forEach(id=>clearTimeout(id));this.timers=[];this.el.innerHTML='';}
  renderHud(){const t=this.el.querySelector('[data-time]');if(t)t.textContent=`${Math.ceil(this.remaining)}s`;const b=this.el.querySelector('[data-start]');if(b)b.textContent=this.running?this.L('playing','Playing…'):this.remaining>0?this.L('play','Play / Resume'):this.L('timeUp','Time finished');if(b)b.disabled=this.running||this.remaining<=0;this.el.classList.toggle('paused',!this.running)}
  render(){} onFrame(){} onPause(){} sanitizeState(){}
}

export class BalloonPopGame extends BudgetGame{
 initialState(){return {...super.initialState(),score:0,bestCombo:0,totalPopped:0};}
 render(){if(this.destroyed)return;this.el.innerHTML=`<section class="game-shell"><h1>${esc(this.L('title','🎈 Balloon Pop Challenge'))}</h1><div class="hud"><span>⏱️ <b data-time></b></span><span>${esc(this.L('score','Score'))} <b data-score>${this.state.score}</b></span><span>${esc(this.L('bestCombo','Best combo'))} ${this.state.bestCombo}</span></div><div class="arena" data-arena><p data-result class="status">${esc(this.L('status','Pop balloons. Rainbow balloons are worth 5!'))}</p></div><button class="primary" data-start>${esc(this.L('play','Play / Resume'))}</button> <button class="secondary" data-pause>${esc(this.L('pause','Pause'))}</button></section>`;this.combo=0;this.spawnClock=0;this.el.querySelector('[data-start]').onclick=()=>this.start();this.el.querySelector('[data-pause]').onclick=()=>this.pause();this.renderHud()}
 onFrame(delta){this.spawnClock+=delta;if(this.spawnClock>650){this.spawnClock=0;this.spawn()}}
 spawn(){const a=this.el.querySelector('[data-arena]');if(!a||a.children.length>14)return;const special=Math.random()>.84,b=document.createElement('button');b.className='balloon';b.textContent=special?'🌈':'🎈';b.dataset.value=special?'5':'1';b.style.left=Math.floor(Math.random()*82+5)+'%';b.style.top=Math.floor(Math.random()*70+15)+'%';b.style.background=`hsl(${Math.random()*360} 85% 65%)`;b.onclick=()=>this.pop(b);a.appendChild(b);this.timers.push(setTimeout(()=>{if(b.isConnected){b.remove();this.combo=0}},2400))}
 pop(b){if(!this.running)return;const value=Number(b.dataset.value);this.state.score+=value;this.state.totalPopped++;this.combo++;this.state.bestCombo=Math.max(this.state.bestCombo,this.combo);b.style.animation='pop .25s forwards';this.timers.push(setTimeout(()=>b.remove(),220));this.el.querySelector('[data-score]').textContent=this.state.score;this.emit('game:reward',{reward:{type:'coins',amount:value},combo:this.combo});if(this.state.totalPopped%5===0)this.save('five_balloons')}
 onPause(reason){this.save(reason)}
}
export function createGame(container,options){return new BalloonPopGame(container,options)}
