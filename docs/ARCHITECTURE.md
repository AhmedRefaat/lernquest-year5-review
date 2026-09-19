# LernQuest Design and Architecture

## 1. Purpose
LernQuest is a static, privacy-friendly study app for a child newly entering Year 6 and reviewing Year 5 topics. The supplied bank broadly reflects Bavarian Year 5 competencies, but it is not a replacement for the school’s exact worksheets or the teacher’s curriculum sequence.

## 2. Architecture

- `index.html`: tiny application shell.
- `src/app.js`: state machine, random selection, grading, timer, vocabulary lookup, progress export, and mini-game.
- `src/styles.css`: responsive child-friendly design.
- `data/*-questions.md`: editable source-of-truth records.
- `data/questions.json`: browser-ready compiled question bank.
- `data/dictionary.json`: vocabulary definitions and German/Arabic examples (see section 6 for schema and coverage rule).
- `progress/`: destination for manually exported, versioned progress files.
- `scripts/build_questions.py`: compiles JSON blocks from Markdown.
- `scripts/verify.py`: validates IDs, counts, answer membership, and required fields.

## 3. Question schema

Every question supports:

- `id`: stable unique key, e.g. `DE-001`.
- `subject`: `German`, `English`, or `Math`.
- `topic`: curriculum topic.
- `type`: currently `multiple-choice`; future renderers can support `text`, `number`, `sorting`, or `matching`.
- `prompt`, `options`, `answer`.
- `rule`: concise learning rule shown after grading.
- `explanation.de`, `.en`, `.ar`: story-like remediation.
- `difficulty`, `timeLimitSec`, `tags`.

Unknown extra fields are ignored, making the schema forward-compatible.

## 4. Selection algorithm
For the active learner and subject, the round is built by `selectQuestions`/`pickWithCaps` in `src/app.js`. Unsolved questions (never answered correctly by this learner) are always tried before solved ones. A topic cap (`max(1, ceil(count*0.10))` per topic) and a hard-difficulty cap (`floor(count*0.15)`) are applied through a documented, logged relaxation ladder so a thin bank still fills the round instead of returning short:

1. Stage 1: both caps enforced.
2. Stage 2: hard-difficulty cap relaxed.
3. Stage 3: topic cap relaxed too (any topic/difficulty mix).
4. Stage 4: pool genuinely exhausted — whatever stage 3 collected is the true limit.

Each round logs `selection.stage` with the stage reached. If the bank still cannot supply the requested count, `start()` shows a "not enough questions" message instead of starting a short/broken session.

## 4a. Learner identity
A learner is identified by a normalized key (`trim + collapse whitespace + lowercase`). The **display name is the original spelling/casing first typed for that key** — it is stored once on creation and never overwritten by later logins, even if the name is typed differently afterward.

## 4b. Vocabulary mastery test
Double-clicking a highlighted word (English dictionary key) records a lookup. `startVocabTest()` builds up to 10 multiple-choice questions from words the learner has looked up but not yet mastered. Each question randomly picks a direction:

- `de2ar`: prompt is the German word (`entry.de`), options/answer are Arabic (`entry.ar`).
- `ar2de`: prompt is the Arabic word (`entry.ar`, rendered `dir="rtl"`), options/answer are German (`entry.de`).

Distractors are drawn from other dictionary entries' matching field. A word is `mastered` after 10 correct answers across either direction; mastered words drop out of future vocab tests.

## 4c. Game-time budget rules
Every learner's `gameTimeBudget` is normalized (`normalizeBudget`: coerced to a finite whole number, clamped to a minimum of 0) at load/migration time and persisted back immediately, so a corrupted stored value (negative, string, `null`, non-numeric) can never reach a consumer. On submit, the stored budget is also re-read through `safeNum` as a defensive backstop before arithmetic runs. Elapsed time is clamped to the limit (`elapsedSec`), and `remainingSec = timeLimitSec - elapsedSec`:

- Correct answer: budget gains `remainingSec`.
- Wrong answer or timeout: budget loses `elapsedSec` (a real timeout has `elapsedSec === timeLimitSec`, i.e. the full question time is lost), clamped so the stored budget never drops below 0.

The feedback screen's displayed gain/loss (`timeGain`/`timeLoss`) is computed directly from `remainingSec`/`elapsedSec`, independent of the clamped stored balance. This matters once the stored budget is already 0: the clamped delta would be 0 (nothing left to subtract), but the learner still lost the full elapsed time, and the message must say so.

At round start (if enabled in settings), the learner picks one of the five games under `src/games/<id>/` to play at the end, or skips it (`gamePicker()`); the choice rides on the session and is only offered once the round's budget lands, in `finish()`. While a game plays, its own live countdown is synced back to the learner's stored budget on every pause (`syncGameBudget`), using a floor (never round) so exiting with fractional seconds left cannot refund play time.

## 4d. End-of-round games
Each bundled game lives at `src/games/<id>/game.js` and exports `createGame(container, options)`, returning an object with `start()`/`pause()`/`destroy()` and emitting a `game:paused` DOM event with the remaining seconds on every pause. `playGame()` mounts the chosen game's module and scoped stylesheet, adapts its `storage.load/save` calls onto that learner's `games[gameId]` slot in the main record (`gameStorageAdapter`), and passes a localized `labels` map (`gameLabels()` in `src/app.js`) so in-game text follows the current language; each game falls back to its own English defaults if a label is missing. `learners[key].lastGameId` remembers the last game played and is highlighted first in the next picker. Because a game's saved state lives in the same `lernquest-v1` record as everything else, progress resumes automatically next time that game is opened, even across reloads.

## 5. Persistence and privacy
All attempts and vocabulary clicks are stored under `lernquest-v1` in browser localStorage, as schema v2: `{ schemaVersion, learners, attempts, rounds, vocab, settings }`. Each learner record also carries `gameTimeBudget` (see 4c), `games` (per-game-id saved state written by that game's own storage adapter), and `lastGameId` (the most recently played game) — all persisted like everything else in this store. No child data leaves the device automatically. Structured logs go only to the browser console and never contain secrets. Names and answers do appear in local progress because they are essential learning records.

A legacy v1 shape (`{profiles, attempts:[{name,...}], vocab:[{name,word,...}]}`) is migrated on load: `profiles` entries import each learner's original name and game-time budget, `attempts` import per-question history, and `vocab` entries import lookup counts. Migration only ever creates a learner record with `??=`, so an existing (already-imported) display name is never overwritten. Legacy attempts have no round boundaries, so per-round history starts fresh after migration.

**Home-screen grade de-duplication rule:** `learnerSummary` (`src/app.js`) must count every graded attempt exactly once, whether it came from legacy migration or a v2 round. Each attempt pushed to `db.attempts` during a subject round carries a generated `id`; when that round finishes, `db.rounds` stores the round's own `correct`/`total` aggregate together with the list of covered attempt ids (`round.attemptIds`). `learnerSummary` then: (1) sums `db.attempts` entries whose `id` is **not** referenced by any round's `attemptIds` — this is exactly the migrated legacy attempts, which predate rounds and so are never referenced — and (2) adds every round's own `correct`/`total` on top. A round's covered attempts are skipped in step 1 so they are not counted twice.

A static GitHub Pages site cannot append to repository files. Doing that from the browser would require exposing a GitHub token, which is unsafe. The present design exports JSON/CSV for a parent to commit. A future safe online sync should use an authenticated API, such as an Azure Function or GitHub App backend, with credentials held server-side.

## 5a. Progress exports
Both the JSON and CSV exports (from the Progress screen) include: attempts, rounds, vocabulary mastery counts, and game-time budgets (per learner, or all learners when no name is entered). The CSV is a single file with one `# section` + header row per record type (`attempts`, `rounds`, `vocab`, `gameTimeBudgets`). Any cell whose value starts with `=`, `+`, `-`, or `@` is prefixed with a single quote to neutralize spreadsheet formula injection, in addition to standard double-quote escaping.

## 6. Vocabulary behavior
Words longer than four letters are visually marked (`decorate()` in `src/app.js`) as clickable `.word` spans. A double-click opens a modal via `dictionary.json` lookup; every lookup is recorded. Unknown words are also recorded and can be added to the dictionary and reused for a future vocabulary test generator.

**Wrong-option exclusion:** a deliberate misspelling in a distractor option must never become a clickable/lookupable vocabulary word — but a real word that also appears elsewhere in the same question must stay clickable, even if it's reused in a wrong option (e.g. "happy" in a comparative-forms question with "more happy" as a distractor). `wrongOptionTokens(q)` computes, per question, the lowercased 5+ letter tokens from wrong (non-answer) options minus the tokens that also appear in that question's `prompt`, `rule`, `answer`, any option equal to `answer`, and `explanation.de`/`explanation.en` (the Arabic explanation isn't part of this protected set, since its script never matches the Latin-letter token regex anyway). `showQuestion()` and `feedback()` pass this exclusion set to every `decorate()` call for that question (prompt, options, rule, explanation) so those tokens are still escaped as plain text but skip the `.word` span. Render sites with no question context (e.g. the vocabulary list) call `decorate()`/`esc()` with no exclusion set, since there is no per-question distractor to exclude.

### 6a. Dictionary schema
Each `dictionary.json` entry is keyed by the lowercase literal word token (no lemmatizing) and shaped `{ de, ar, examplesDe: [2 strings], examplesAr: [2 strings] }`: `de`/`ar` are the German/Arabic gloss (a short definition for German headwords, e.g. "3. Person Singular von „lernen“"; the direct translation for English headwords), and `examplesDe`/`examplesAr` are two example sentences per language, index-matched as real semantic counterparts of each other. A legacy singular form (`exampleDe`/`exampleAr`, one string each) is still read: `normalizeDictEntry()` in `src/app.js` accepts either shape and always returns the array form, so every caller only ever reads `examplesDe`/`examplesAr`. The original 17 legacy entries have since been migrated to the two-example schema (one-time `migrate_legacy.py` script); the singular fallback in `normalizeDictEntry` remains for forward compatibility with any future untouched entry.

### 6b. Coverage rule
A word only needs a dictionary entry if the app can actually decorate it as clickable. Per question: `required` = lowercase tokens (`/[A-Za-zÄÖÜäöüß]{5,}/`) from `prompt`, `rule`, `explanation.de`, `explanation.en`, `answer`, and any option equal to `answer`; `wrong` = tokens from options not equal to `answer`. A token already justified by a good field is required regardless of also appearing in a wrong option elsewhere — only tokens that occur **exclusively** in wrong options across the whole bank are excluded (and dropped from the dictionary as "junk" if present, since teaching a misspelled distractor as vocabulary would be wrong).

### 6c. Child-facing lookup modal
Double-clicking a decorated word opens a modal: a known word shows its German meaning, Arabic meaning, and both German/Arabic example sentences; an unknown word shows a short encouraging message ("we'll remember this word for your vocabulary test") — never any file, JSON, or dictionary-editing wording, since that modal is child-facing.

### 6d. Parent vocabulary list
The home page's "Vocabulary list" view (`vocabList()`) is parent-facing. For the selected (or all) learners it lists every looked-up word with lookup count, mastery count out of `VOCAB_MASTERY_TARGET` (10), and a mastered flag, split into two groups: words with a dictionary entry (shown with their German/Arabic meaning) and a separate "no entry yet" group for words the child looked up that still need a `dictionary.json` entry — this is the one screen allowed to mention the file, since it targets the parent, not the child.

## 6a. Internationalization
All rendered UI labels and units (including the seconds unit) live in the `I18N` table (`en`/`de`) in `src/app.js` and are looked up through `t(key, vars)`. The one deliberate exception is the language switcher itself, which shows "Deutsch"/"English" as native names rather than translated labels.

## 7. Session state machine
`home → (optional gamePicker) → question ⇄ feedback → finish → (optional playGame) → home`.
The game picker, if enabled, runs once before the first question: the learner chooses which bundled game to play at the end of the round, or skips it; the round itself always runs question→feedback until every question is answered. `finish()` only offers the chosen game if the round's earned budget is above 0. Each question records elapsed milliseconds, correctness, topic, timestamp, and selected answer. `clearTimers()` runs at the start of every screen transition (home, gamePicker, start, showQuestion, playGame, finish, report) so no stale question countdown or running game timer can fire against an inactive screen — it also tears down any mounted game (saving its state via `game:paused`) and its scoped stylesheet.

## 8. Extension points
- Add renderer functions keyed by `type`.
- Add `grade`, `curriculumRef`, `hint`, `image`, or `workedSteps` fields.
- Replace localStorage adapter with a secure API adapter.
- Add parent PIN, multiple learner dashboards, spaced repetition, charts, or pronunciation audio.
- Add SVG diagrams through a sanitized, trusted asset folder.

## 9. Logging
`Log.info` emits structured JSON for lifecycle events: app ready, session start/finish, answer grading, and vocabulary lookup. `Log.error` captures startup/storage failures without credentials or tokens.

## 10. Accessibility
The app uses semantic headings, large controls, responsive layout, textual correctness indicators in addition to color, and reduced interface complexity. A future release should add keyboard-controlled mini-games and full WCAG testing.
