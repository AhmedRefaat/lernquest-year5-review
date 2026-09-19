const GAME_ID='treasure_chest';

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

export class TreasureChestGame extends BudgetGame{
 initialState(){return {...super.initialState(),coins:0,diamonds:0,puzzlePieces:0,opened:0,lastLoot:null};}
 render(){if(this.destroyed)return;this.el.innerHTML=`<section class="game-shell"><h1>${esc(this.L('title','🏴‍☠️ Treasure Chest Adventure'))}</h1><div class="hud"><span>⏱️ <b data-time></b></span><span>🪙 ${this.state.coins}</span><span>💎 ${this.state.diamonds}</span><span>🧩 ${this.state.puzzlePieces}</span></div><div class="arena"><div class="chests">${[1,2,3].map(i=>`<button class="card chest" data-chest="${i}" aria-label="${esc(this.L('openChest','Open chest {n}').replace('{n}', i))}">🎁</button>`).join('')}</div><div data-result class="status">${esc(this.L('status','Choose a chest while the timer is running.'))}</div></div><button class="primary" data-start>${esc(this.L('play','Play / Resume'))}</button> <button class="secondary" data-pause>${esc(this.L('pause','Pause'))}</button></section>`;this.el.querySelector('[data-start]').onclick=()=>this.start();this.el.querySelector('[data-pause]').onclick=()=>this.pause();this.el.querySelectorAll('[data-chest]').forEach(x=>x.onclick=()=>this.openChest(x));this.renderHud()}
 openChest(btn){if(!this.running)return;const roll=Math.random(),loot=roll>.93?['diamonds',1,'💎 Rare diamond!']:roll>.72?['puzzlePieces',1,'🧩 Puzzle piece!']:['coins',1+Math.floor(Math.random()*8),'🪙 Gold coins!'];this.state[loot[0]]+=loot[1];this.state.opened++;this.state.lastLoot={type:loot[0],amount:loot[1],at:new Date().toISOString()};btn.textContent=loot[0]==='diamonds'?'💎':loot[0]==='puzzlePieces'?'🧩':'🪙';btn.style.animation='pop .35s alternate 2';this.el.querySelector('[data-result]').innerHTML=`<div class="loot">${esc(loot[2])}</div><b>+${loot[1]}</b>`;this.emit('game:reward',{reward:{type:loot[0],amount:loot[1]}});this.save('chest_opened');this.timers.push(setTimeout(()=>this.render(),650))}
 onPause(reason){const r=this.el.querySelector('[data-result]');if(r)r.textContent=reason==='budget_exhausted'?this.L('timeUpMsg','Time finished. Your treasure is safe!'):this.L('pausedMsg','Paused. Come back when you earn more play time.')}
}
export function createGame(container,options){return new TreasureChestGame(container,options)}
