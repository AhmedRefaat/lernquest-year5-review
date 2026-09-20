# LernQuest: Year 5 Review

A dependency-free, child-friendly static web app for reviewing German, English, and Mathematics from Year 5. It ships with **550 editable questions**: 200 English, 200 Math, 150 German — each a distinct, higher-quality 5-option question.

## Quick start

```bash
cd lernquest-year5-review
python -m http.server 8080
```

Open `http://localhost:8080`.

## GitHub Pages

1. Create a GitHub repository and copy this project into it.
2. Push to the `main` branch.
3. In **Settings → Pages**, choose **Deploy from a branch**, `main`, `/ (root)`.
4. Open the published URL after deployment finishes.

No build step or secret is required.

GitHub Pages serves assets with `max-age=600` (10 minutes). When deploying a change, bump the `?v=` value on the `src/app.js`/`src/styles.css` tags in `index.html` — `app.js` reads its own version from that query param and reuses it for game modules, stylesheets, and data fetches, so `index.html` is the only place to edit. Anyone still holding the old page needs a hard reload (Ctrl+Shift+R) or has to wait out the 10-minute cache expiry.

## Important progress limitation

GitHub Pages is static. Browser code cannot safely write progress directly back into repository files without exposing a token. Progress is therefore protected in browser `localStorage`, and the parent can export JSON/CSV from the Progress screen. Commit exported files into `progress/` for long-term versioned records. The architecture document describes a safe optional backend upgrade.

## Progress data

- Stored as schema v2 (`learners`, `attempts`, `rounds`, `vocab`, `settings`) under the `lernquest-v1` localStorage key. An older v1 shape is migrated automatically on load.
- A learner is identified by a normalized name; the display name keeps the exact spelling/casing first typed for that learner.
- Round composition takes unsolved questions first, then tops up from solved ones, applying a topic cap and a hard-difficulty cap with a documented, logged relaxation ladder if the subject bank is thin, and excludes recently-served question IDs per subject until the bank has cycled through.
- The on-screen question timer is fixed by a difficulty × subject table (German/English 20/30/45s, Math 30/45/68s for difficulty 1/2/3) that overrides any authored `timeLimitSec` in the bank data; only vocab-test questions keep their own authored value.
- Every question's options are reshuffled on each render (subject questions and vocab-test questions alike); grading is always by answer value, never position.
- Answering correctly adds the remaining question time to a game-time budget (capped at 1200s / 20 minutes, shown as "at maximum" on the dashboard once reached); answering wrong or timing out subtracts the elapsed time (never below zero). Before a round starts, the child can pick one of five bundled games (or skip); after the round, if any budget was earned, that game can be played until the budget runs out. Exiting early keeps the leftover seconds (floored, never rounded up) for next time, and each game's own progress is saved per learner and resumes where it left off.
- The vocabulary test quizzes German↔Arabic in both directions (10 correct answers masters a word) from words looked up while reading.
- JSON and CSV exports both include attempts, rounds, vocabulary mastery, and game-time budgets. CSV cells are escaped against spreadsheet formula injection.
- UI text is available in English and German via an in-app language switcher.

## Vocabulary dictionary

`data/dictionary.json` holds one entry per lowercase word token: `{ de, ar, examplesDe: [2], examplesAr: [2] }`, with a legacy singular `exampleDe`/`exampleAr` shape still accepted (`normalizeDictEntry` in `src/app.js` normalizes either shape to arrays). A word only needs an entry if it can occur as clickable vocabulary: tokens that appear only in a wrong (non-answer) multiple-choice option — e.g. a deliberate misspelling used as a distractor — are excluded from coverage and never decorated as clickable in the app. See `docs/ARCHITECTURE.md` section 6 for the exact rule.

Double-clicking a highlighted word shows a child-facing modal: known words show the German/Arabic meaning plus both example sentences; unknown words get a short encouraging message, never any file/JSON wording. The home page's parent-facing "Vocabulary list" additionally shows, per learner, each looked-up word's lookup count, mastery count out of 10, and mastered flag, with words missing a dictionary entry listed separately under "no entry yet".

## Editing questions

Human-editable sources are in `data/german-questions.md`, `data/english-questions.md`, and `data/math-questions.md`. Each question is an extensible JSON record in a fenced block. After edits, run:

```bash
python scripts/build_questions.py
```

The current package also includes `data/questions.json`, which the browser loads.

## Verification

```bash
python scripts/verify.py
```

Expected: 550 questions (200 English, 200 Math, 150 German), unique IDs, valid answers.
