const GAME_ID='os13k';
// Local, unmodified copy of https://github.com/KilledByAPixel/OS13k (GPL-3.0) vendored under ./OS13k/,
// served same-origin so it's covered by the already-allowed GitHub Pages prefix (see ARCHITECTURE.md 4d).
const OS13K_URL=new URL('./OS13k/index.html',import.meta.url).href;
const OS13K_DIR_PATH=new URL('./OS13k/',import.meta.url).pathname;
// Sandbox omits allow-top-navigation/allow-popups/allow-forms so the framed site can't navigate this
// app or open windows, but a plain link can still navigate the iframe's OWN document elsewhere; the
// outer 'load' event fires for that, so mountFrame/onFrameLoad detect an unexpected load and snap the
// frame back to OS13K_URL. Nested iframes/windows OS13k spawns internally stay same-origin now but still
// never bubble a 'load' up to the outer frame (iframe load events don't bubble across frames), so this
// only reacts to the outer frame's own document navigating. Now that the frame is same-origin,
// allow-same-origin means the framed code could script window.parent and shares this origin's
// localStorage with the host — accepted here since OS13k is an unmodified third-party copy (see report).

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

// Inline icons (not emoji) for chrome-bar buttons whose glyphs render as tofu on some devices/fonts.
const ICON_RELOAD='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 15a9 9 0 0 0 14.85 3.36L23 14M1 10l4.64 4.36A9 9 0 0 0 20.49 9"/></svg>';
const ICON_FULLSCREEN_ENTER='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
const ICON_FULLSCREEN_EXIT='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';

// Wraps the local, vendored OS13k arcade copy (./OS13k/, upstream killedbyapixel.github.io/OS13k) in a
// sandboxed iframe, mounted only while this.running so the budget clock and the iframe's lifetime stay in lockstep.
export class Os13kGame extends BudgetGame{
 initialState(){return {...super.initialState(),lastOpenedAt:null};}
 // Renders a browser-style chrome bar (home/reload/address/fullscreen/time) locked to one site.
 render(){if(this.destroyed)return;const t=k=>esc(this.L(k,GAME_OS13K_FALLBACK[k]));this.el.innerHTML=`<section class="game-shell os13k-shell"><h1>${t('title')}</h1><div class="os13k-browser" data-browser><div class="os13k-chrome" role="toolbar" aria-label="${t('lockedSite')}"><button class="os13k-btn" type="button" data-home title="${t('home')}" aria-label="${t('home')}">🏠</button><button class="os13k-btn" type="button" data-reload title="${t('reload')}" aria-label="${t('reload')}">${ICON_RELOAD}</button><span class="os13k-spacer" aria-hidden="true"></span><button class="os13k-btn" type="button" data-fullscreen title="${t('fullscreenEnter')}" aria-label="${t('fullscreenEnter')}">${ICON_FULLSCREEN_ENTER}</button><span class="os13k-time" data-time-wrap>⏱️ <b data-time></b></span></div><div class="arena os13k-wrap" data-frame-wrap><p class="os13k-placeholder" data-placeholder>${esc(this.L('paused','Paused. Press Play to continue.'))}</p></div></div><div class="status" data-result>${esc(this.L('status','Explore tiny games inside OS13k while your time lasts.'))}</div><button class="primary" data-start>${esc(this.L('play','Play / Resume'))}</button> <button class="secondary" data-pause>${esc(this.L('pause','Pause'))}</button></section>`;this.el.querySelector('[data-start]').onclick=()=>this.start();this.el.querySelector('[data-pause]').onclick=()=>this.pause();this.el.querySelector('[data-home]').onclick=()=>this.reloadFrame();this.el.querySelector('[data-reload]').onclick=()=>this.reloadFrame();this.el.querySelector('[data-fullscreen]').onclick=()=>this.toggleFullscreen();this._fsHandler=()=>this.updateFullscreenBtn();document.addEventListener('fullscreenchange',this._fsHandler);this.renderHud()}
 // Low-time CSS hook only; the numeric format itself is unchanged from the shared HUD.
 renderHud(){super.renderHud();const w=this.el.querySelector('[data-time-wrap]');if(w)w.classList.toggle('low-time',this.remaining>0&&this.remaining<=60)}
 start(){super.start();if(this.running)this.mountFrame()}
 // Home and Reload both just re-fetch the one locked start URL via a fresh iframe (rather than
 // reusing contentWindow.location) — there's no other page to go to.
 reloadFrame(){if(this.destroyed||!this.running||!this.frameMounted)return;this.unmountFrame();this.mountFrame()}
 // Toggles the Fullscreen API on the browser-window container; quietly no-ops if unsupported.
 toggleFullscreen(){const box=this.el.querySelector('[data-browser]');if(!box)return;if(!document.fullscreenElement)box.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.().catch(()=>{})}
 updateFullscreenBtn(){const btn=this.el.querySelector('[data-fullscreen]');if(!btn)return;const active=this.el.contains(document.fullscreenElement);const label=active?this.L('fullscreenExit','Exit fullscreen'):this.L('fullscreenEnter','Fullscreen');btn.title=label;btn.setAttribute('aria-label',label);btn.innerHTML=active?ICON_FULLSCREEN_EXIT:ICON_FULLSCREEN_ENTER}
 // Guards our own localStorage keys against OS13k's same-origin access (see ARCHITECTURE.md 4d): snapshots
 // lernquest-v1/lernquest-game:* while the frame is mounted and restores them if the framed site changes or
 // clears localStorage. The 'storage' event only fires in THIS document for changes made elsewhere (the
 // iframe or another tab), never for our own same-document writes, so it can't mistake our own saves for
 // tampering. A frame clear() takes effect synchronously but that 'storage' event is delivered async, so a
 // parent read racing in that gap (e.g. syncGameBudget) could see the cleared store and persist an empty/
 // default DB before the event arrives. ensureStorage()/refreshSnapshot() close that window: app.js calls
 // ensureStorage() to restore-if-drifted BEFORE every such read, and refreshSnapshot() right after its own
 // save so the snapshot is always the latest parent write — the later async event then compares against
 // that same fresh value and is a no-op, never a regression. No periodic timer is needed since the parent's
 // own 1s budget-sync loop already drives that cadence via ensureStorage/refreshSnapshot.
 _isGuardedKey(key){return key==='lernquest-v1'||key.startsWith('lernquest-game:')}
 _guardSnapshot(){this._guardData=new Map();for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(this._isGuardedKey(k))this._guardData.set(k,localStorage.getItem(k))}}
 _guardRestore(){if(!this._guardData)return;let restored=false;for(const[k,v]of this._guardData){if(localStorage.getItem(k)!==v){localStorage.setItem(k,v);restored=true}}if(restored)console.warn('[os13k] restored LernQuest localStorage after the framed site changed it')}
 // Public hook for app.js: restore-if-drifted synchronously before a parent load-modify-save cycle reads storage.
 ensureStorage(){this._guardRestore()}
 // Public hook for app.js: re-snapshot right after a parent save, so the guard's restore value is never stale.
 refreshSnapshot(){this._guardSnapshot()}
 _guardStart(){this._guardSnapshot();this._guardStorageHandler=e=>{if(e.storageArea&&e.storageArea!==localStorage)return;if(e.key!==null&&!this._isGuardedKey(e.key))return;this._guardRestore()};window.addEventListener('storage',this._guardStorageHandler)}
 _guardStop(){if(this._guardStorageHandler){window.removeEventListener('storage',this._guardStorageHandler);this._guardStorageHandler=null}this._guardRestore()}
 // Lazily creates the sandboxed iframe on first play; if 'load' never fires, only the hint text changes.
 mountFrame(){if(this.frameMounted||this.destroyed)return;const wrap=this.el.querySelector('[data-frame-wrap]');if(!wrap)return;wrap.innerHTML=`<p class="os13k-placeholder" data-placeholder>${esc(this.L('loading','Loading OS13k…'))}</p><iframe class="os13k-frame" data-frame src="${OS13K_URL}" title="${esc(this.L('title','OS13k Arcade'))}" sandbox="allow-scripts allow-same-origin allow-pointer-lock" referrerpolicy="no-referrer" allow="fullscreen; autoplay"></iframe>`;this.frameMounted=true;this._guardStart();this.state.lastOpenedAt=new Date().toISOString();this.save('frame_open');const ph=wrap.querySelector('[data-placeholder]'),frame=wrap.querySelector('[data-frame]');frame._expectLoad=true;frame.onload=()=>this.onFrameLoad(frame);this._loadHintTimer=setTimeout(()=>{this._loadHintTimer=null;if(ph?.isConnected)ph.textContent=this.L('slow','Still loading… check your internet connection.')},6000)}
 // Any 'load' we didn't cause via mount/reload means the framed site navigated itself elsewhere. Since the
 // frame is same-origin, first check whether it's still inside the local OS13k folder (e.g. help.html) and
 // let that be, since the site is still contained; only a real escape outside the folder resets it back to
 // OS13K_URL. More than 3 resets inside 10s stops resetting (avoids a reset loop) and shows the same 'still
 // loading' hint used when the frame never loads at all. The expected-load flag lives on the frame element
 // itself (not a shared counter) so it can't outlive a fast unmount/remount.
 onFrameLoad(frame){this.el.querySelector('[data-placeholder]')?.remove();if(frame._expectLoad){frame._expectLoad=false;return}let inFolder=false;try{inFolder=frame.contentWindow.location.pathname.startsWith(OS13K_DIR_PATH)}catch{}if(inFolder)return;const now=Date.now();this._unexpectedLoads=(this._unexpectedLoads||[]).filter(t=>now-t<10000);this._unexpectedLoads.push(now);console.info('[os13k] frame navigated outside the local OS13k folder; resetting to start URL');if(this._unexpectedLoads.length>3){this.unmountFrame();const p=this.el.querySelector('[data-placeholder]');if(p)p.textContent=this.L('slow','Still loading… check your internet connection.');return}frame._expectLoad=true;frame.src=OS13K_URL}
 // Blanks src (and drops the load handler first) before removing the node so any audio/JS inside
 // the iframe stops immediately and a stray about:blank load can't reach onFrameLoad.
 unmountFrame(){if(!this.frameMounted)return;this._guardStop();if(this._loadHintTimer){clearTimeout(this._loadHintTimer);this._loadHintTimer=null}const wrap=this.el.querySelector('[data-frame-wrap]'),frame=wrap?.querySelector('[data-frame]');if(frame){frame._expectLoad=false;frame.onload=null;frame.src='about:blank';frame.remove()}if(wrap)wrap.innerHTML=`<p class="os13k-placeholder" data-placeholder>${esc(this.L('paused','Paused. Press Play to continue.'))}</p>`;this.frameMounted=false}
 // Overlays a brief "time is up" banner over the browser area while the app's own 1500ms return-home delay runs.
 onPause(reason){this.unmountFrame();const r=this.el.querySelector('[data-result]');if(reason==='budget_exhausted'){if(r)r.textContent=this.L('timeUpMsg','Time finished. See you next time!');const wrap=this.el.querySelector('[data-frame-wrap]');if(wrap)wrap.insertAdjacentHTML('beforeend',`<div class="os13k-overlay">${esc(this.L('timeIsUp','Time is up!'))}</div>`)}}
 destroy(){if(this._fsHandler)document.removeEventListener('fullscreenchange',this._fsHandler);super.destroy()}
}
const GAME_OS13K_FALLBACK={title:'🖥️ OS13k Arcade',lockedSite:'Locked site',home:'Start page',reload:'Reload',fullscreenEnter:'Fullscreen'};
export function createGame(container,options){return new Os13kGame(container,options)}
