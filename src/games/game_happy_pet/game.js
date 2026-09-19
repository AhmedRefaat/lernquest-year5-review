const GAME_ID='happy_pet';

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

const ACCESSORIES=['🎩','👓','👑','🎀'];
export class HappyPetGame extends BudgetGame{
 initialState(){return {...super.initialState(),petName:'Spark',petType:'dragon',xp:0,level:1,fullness:0,ownedAccessories:[],equipped:null};}
 sanitizeState(){const allowed=new Set(ACCESSORIES);this.state.ownedAccessories=(this.state.ownedAccessories||[]).filter(a=>allowed.has(a));if(!allowed.has(this.state.equipped))this.state.equipped=null}
 render(){if(this.destroyed)return;const next=this.state.level*50;this.el.innerHTML=`<section class="game-shell"><h1>${esc(this.L('title','🐉 Feed & Grow'))} ${esc(this.state.petName)}</h1><div class="hud"><span>⏱️ <b data-time></b></span><span>${esc(this.L('level','Level'))} ${this.state.level}</span><span>${esc(this.L('xp','XP'))} ${this.state.xp}/${next}</span><span>${esc(this.L('fullness','Fullness'))} ${this.state.fullness}%</span></div><div class="meter"><div style="width:${Math.min(100,this.state.xp/next*100)}%"></div></div><div class="arena"><span class="pet" data-pet>${this.state.level>=5?'🐲':'🐉'}${this.state.equipped?esc(this.state.equipped):''}</span><p data-result class="status">${esc(this.L('status','Choose healthy or funny food!'))}</p>${[['🍎',8],['🥕',9],['🍪',6],['🍕',7]].map(([f,x])=>`<button class="card food" data-food="${f}" data-xp="${x}">${f}</button>`).join('')}<div class="closet">${this.state.ownedAccessories.map(a=>`<button class="secondary" data-wear="${a}">${esc(a)}</button>`).join('')}</div></div><button class="primary" data-start>${esc(this.L('play','Play / Resume'))}</button> <button class="secondary" data-pause>${esc(this.L('pause','Pause'))}</button></section>`;this.el.querySelector('[data-start]').onclick=()=>this.start();this.el.querySelector('[data-pause]').onclick=()=>this.pause();this.el.querySelectorAll('[data-food]').forEach(x=>x.onclick=()=>this.feed(x));this.el.querySelectorAll('[data-wear]').forEach(x=>x.onclick=()=>{this.state.equipped=x.dataset.wear;this.save('accessory_equipped');this.render()});this.renderHud()}
 feed(btn){if(!this.running)return;const xp=Number(btn.dataset.xp);this.state.xp+=xp;this.state.fullness=Math.min(100,this.state.fullness+8);const target=this.state.level*50;let unlock=null;if(this.state.xp>=target){this.state.xp-=target;this.state.level++;unlock=ACCESSORIES[this.state.level%4];if(!this.state.ownedAccessories.includes(unlock))this.state.ownedAccessories.push(unlock);this.emit('game:milestone',{level:this.state.level,unlock})}const pet=this.el.querySelector('[data-pet]');pet.classList.add('happy');this.el.querySelector('[data-result]').textContent=unlock?this.L('levelUp','Level up! New accessory {item}').replace('{item}',unlock):this.L('yummy','Yummy {food}! +{xp} XP').replace('{food}',btn.dataset.food).replace('{xp}',xp);this.emit('game:reward',{reward:{type:'pet_xp',amount:xp}});this.save('pet_fed');this.timers.push(setTimeout(()=>this.render(),700))}
 onFrame(delta){this.state.fullness=Math.max(0,this.state.fullness-delta/7000)}
 onPause(reason){this.save(reason)}
}
export function createGame(container,options){return new HappyPetGame(container,options)}
