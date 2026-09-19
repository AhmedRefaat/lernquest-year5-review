const GAME_ID='build_world';

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

const SHOP=[['🌳',2],['🌸',1],['🏠',5],['🏰',12],['🚀',15],['🌊',8]];
export class BuildWorldGame extends BudgetGame{
 initialState(){return {...super.initialState(),coins:20,world:Array(24).fill(''),unlocked:['🌳','🌸','🏠'],placed:0};}
 sanitizeState(){const allowed=new Set(SHOP.map(([x])=>x));this.state.world=Array.from({length:24},(_,i)=>allowed.has(this.state.world?.[i])?this.state.world[i]:'')}
 render(){this.el.innerHTML=`<section class="game-shell"><h1>${esc(this.L('title','🏝️ Build Your Own World'))}</h1><div class="hud"><span>⏱️ <b data-time></b></span><span>🪙 ${this.state.coins}</span><span>${esc(this.L('built','Built'))} ${this.state.placed}</span></div><div class="arena"><div class="world">${this.state.world.map((x,i)=>`<button class="tile" data-tile="${i}">${x?esc(x):'➕'}</button>`).join('')}</div><div class="shop">${SHOP.map(([x,c])=>`<button class="card" data-item="${x}" data-cost="${c}" title="${esc(this.L('coinsTooltip','{n} coins').replace('{n}', c))}">${x}<small>${c}</small></button>`).join('')}</div><p data-result class="status">${esc(this.L('status','Choose an item, then choose a tile.'))}</p></div><button class="primary" data-start>${esc(this.L('play','Play / Resume'))}</button> <button class="secondary" data-pause>${esc(this.L('pause','Pause'))}</button></section>`;this.selected=null;this.el.querySelector('[data-start]').onclick=()=>this.start();this.el.querySelector('[data-pause]').onclick=()=>this.pause();this.el.querySelectorAll('[data-item]').forEach(x=>x.onclick=()=>{if(!this.running)return;this.selected={item:x.dataset.item,cost:Number(x.dataset.cost)};this.el.querySelector('[data-result]').textContent=this.L('chooseTile','Now choose a place for {item}').replace('{item}',x.dataset.item)});this.el.querySelectorAll('[data-tile]').forEach(x=>x.onclick=()=>this.place(Number(x.dataset.tile)));this.renderHud()}
 place(index){if(!this.running||!this.selected)return;if(this.state.coins<this.selected.cost){this.el.querySelector('[data-result]').textContent=this.L('needCoins','Earn more coins to build this item.');return}this.state.coins-=this.selected.cost;this.state.world[index]=this.selected.item;this.state.placed++;if(this.state.placed%3===0)this.state.coins+=5;this.emit('game:reward',{reward:{type:'world_item',item:this.selected.item},coins:this.state.coins});this.save('item_placed');this.render()}
 onFrame(delta){this.coinClock=(this.coinClock||0)+delta;if(this.coinClock>4000){this.coinClock=0;this.state.coins++;this.render()}}
 onPause(reason){this.save(reason)}
}
export function createGame(container,options){return new BuildWorldGame(container,options)}
