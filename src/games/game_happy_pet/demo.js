import { createGame } from './game.js';
const game=createGame(document.querySelector('#game'),{playerId:'demo-child',timeBudgetSec:30,onEvent:(n,d)=>console.info(n,d)});
game.start();
window.demoGame=game;
