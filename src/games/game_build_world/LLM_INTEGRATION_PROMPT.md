# LLM Integration Prompt: Build Your Own World

You are integrating the self-contained `build_world` ES module into the existing LernQuest application.

First read the project-level `docs/ARCHITECTURE.md`, then read this game's `Game_Arch.md` and `README.md`. Preserve GitHub Pages compatibility and the existing learner progress model.

## Game intent
The learner spends earned in-game coins to place decorations and buildings on a persistent 24-tile world.

## Required integration behavior

1. Place this directory at `src/games/game_build_world`.
2. Import `createGame` from `./games/game_build_world/game.js` from the host game manager.
3. LernQuest calculates the earned play seconds from completed question difficulty and performance. Pass the final value as `timeBudgetSec`.
4. Pass a stable `playerId`, not only a display name if a stable profile ID exists.
5. Mount the game into a dedicated container.
6. Listen to `game:reward`, `game:milestone`, `game:paused`, and `game:complete`.
7. When `game:paused` reports `budget_exhausted`, return to the LernQuest question flow. Do not erase saved game state.
8. When the learner earns more time later, recreate the game with the same `playerId` and the newly earned budget, or keep the instance and call `addBudget(seconds)` followed by `start()`.
9. Call `pause('host_navigation')` before navigation and `destroy()` before removing the container.
10. If rewards are transferred to the shared LernQuest inventory, make the transfer idempotent using `sessionId` plus an event/reward identifier.
11. Keep logs structured and never log tokens, passwords, or secrets.
12. Update the root architecture documentation with the host-level GameManager, RewardEngine, budget ownership, event contract, and persistence adapter.

## Integration example

```javascript
import { createGame } from './games/game_build_world/game.js';

const game = createGame(document.querySelector('#mini-game'), {
  playerId: learner.id,
  sessionId: crypto.randomUUID(),
  timeBudgetSec: earnedGameSeconds,
  storage: lernQuestGameStorageAdapter,
  logger: structuredLogger,
  onEvent(name, detail) {
    if (name === 'game:reward') rewardEngine.accept(detail);
    if (name === 'game:paused' && detail.reason === 'budget_exhausted') {
      game.destroy();
      continueQuestionRound();
    }
  }
});

game.start();
```

## Acceptance criteria

- The game starts only with a positive host-provided budget.
- The visible timer reaches zero without becoming negative.
- The game pauses automatically at zero.
- Refreshing or reopening with the same `playerId` restores durable game progress.
- A later budget resumes from the saved point.
- Navigation saves state and cancels animation/timer work.
- Existing questions, grading, vocabulary, and reports continue to work.
- The module runs from GitHub Pages with no build tool and no server-side secret.
