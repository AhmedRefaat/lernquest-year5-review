# Catch the Falling Stars

Standalone, dependency-free LernQuest game module suitable for GitHub Pages.

## Run the demo

From the repository root:

```bash
python -m http.server 8080
```

Open:

`http://localhost:8080/src/games/game_falling_stars/`

## Integrate

```javascript
import { createGame } from './games/game_falling_stars/game.js';
const game = createGame(document.querySelector('#game'), {
  playerId: learner.id,
  timeBudgetSec: earnedSeconds,
  onEvent: (name, detail) => console.log(name, detail)
});
game.start();
```

The host owns the earned-seconds calculation. Game progress is restored by `playerId`. Read `Game_Arch.md` and `LLM_INTEGRATION_PROMPT.md` before integration.
