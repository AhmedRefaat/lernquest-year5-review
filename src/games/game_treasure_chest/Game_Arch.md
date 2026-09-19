# Treasure Chest Adventure Architecture

## Purpose
`treasure_chest` is a self-contained LernQuest mini-game. It consumes a parent-provided play-time budget, pauses automatically when that budget reaches zero, persists all durable progress, and resumes from the saved state when the learner later earns more time.

## Directory

- `index.html`: standalone demonstration page.
- `game.js`: dependency-free ES module and public integration API.
- `styles.css`: scoped visual presentation.
- `demo.js`: local demonstration bootstrap.
- `README.md`: run and integration instructions.
- `LLM_INTEGRATION_PROMPT.md`: copy-ready context for another LLM.
- `Game_Arch.md`: this architecture document.

## Public API

Import `createGame(container, options)` from `game.js`.

Required or supported options:

- `playerId`: stable learner identifier used in the persistence key.
- `sessionId`: optional host-session identifier.
- `timeBudgetSec`: number of playable seconds granted by LernQuest.
- `storage`: optional adapter exposing `load(key)` and `save(key, value)`.
- `logger`: optional structured logger.
- `onEvent(name, detail)`: optional host callback.

Returned instance methods:

- `start()`: starts or resumes budget consumption.
- `pause(reason)`: pauses and persists state.
- `addBudget(seconds)`: grants additional time without losing progress.
- `publicState()`: returns a defensive copy of durable state.
- `destroy()`: stops timers and removes the game UI.

## Time-budget lifecycle
The budget is held by the current game instance and decreases with `performance.now()` while the game is running. The game automatically pauses at zero and emits `game:paused` with `reason: budget_exhausted`. Durable game progress is saved, but remaining budget should remain host-authoritative. When LernQuest grants a future budget, it may recreate the game with a new `timeBudgetSec` or call `addBudget(seconds)` and then `start()`.

The game never creates play time by itself. The host must calculate collected seconds from learning performance.

## Persistence
Default persistence uses browser `localStorage` with key:

`lernquest-game:treasure_chest:<playerId>`

Persisted records are versioned. The host may provide a storage adapter to integrate with LernQuest's existing learner database. Saves occur on important actions, pause, milestone, completion, and destruction. No secret or credential is logged or stored.

## Events
All events bubble from the container as `CustomEvent` and are also forwarded to `onEvent`:

- `game:start`
- `game:paused`
- `game:budget-added`
- `game:reward`
- `game:milestone` when applicable
- `game:complete`

Every detail includes `gameId`, `playerId`, and `sessionId`.

## Durable state
Coins, diamonds, puzzle pieces, number of opened chests, last loot, total play time, rounds, and last-played timestamp.

## Host integration rules
1. The host owns reward-tier selection and time-budget calculation.
2. The game owns only its game-specific durable state.
3. Save before removing or replacing the game.
4. Do not expose repository tokens or backend secrets in this static module.
5. Update the root `docs/ARCHITECTURE.md` when integrating the module into LernQuest.
6. Avoid showing the same game consecutively by keeping recent game history in the host.

## Accessibility and child safety
The interface uses large controls, text plus visual indicators, no monetary purchases, no penalties that remove earned items, and encouraging messages. Motion is brief and gameplay stops when the budget expires.
