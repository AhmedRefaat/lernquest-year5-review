/* LernQuest: dependency-free static app, safe for GitHub Pages.
   Privacy: all learner data stays in this browser unless manually exported. */

const $ = (s) => document.querySelector(s);
const app = $('#app');
const KEY = 'lernquest-v1';
const SUBJECTS = ['German', 'English', 'Math'];
const SUBJECT_FLAGS = { German: '🇩🇪', English: '🇬🇧', Math: '🧮' };
const SUBJECT_NAMES = {
  German: { en: 'German', de: 'Deutsch' },
  English: { en: 'English', de: 'Englisch' },
  Math: { en: 'Math', de: 'Mathe' }
};
// Bank is currently all difficulty 1; kept forward-compatible for future harder items.
const HARD_DIFFICULTY = 3;
const VOCAB_MASTERY_TARGET = 10;
const VOCAB_TEST_LENGTH = 10;

// End-of-round mini-games under src/games/<id>/. Folder name doubles as the persistence/log id.
const GAMES = [
  { id: 'game_balloon_pop', icon: '🎈' },
  { id: 'game_build_world', icon: '🏝️' },
  { id: 'game_falling_stars', icon: '🌟' },
  { id: 'game_happy_pet', icon: '🐉' },
  { id: 'game_treasure_chest', icon: '🏴‍☠️' }
];

function gameName(id) {
  return t(`gameName_${id}`);
}

// Common in-game chrome shared by every game's BudgetGame base class.
const GAME_COMMON_LABELS = {
  en: { play: 'Play / Resume', playing: 'Playing…', pause: 'Pause', timeUp: 'Time finished' },
  de: { play: 'Spielen / Weiter', playing: 'Spielt…', pause: 'Pause', timeUp: 'Zeit vorbei' }
};

// Per-game in-game labels, merged over GAME_COMMON_LABELS and passed to createGame() as `labels`.
// Each game falls back to its own English default if a key is missing here.
const GAME_LABELS = {
  game_balloon_pop: {
    en: { title: '🎈 Balloon Pop Challenge', score: 'Score', bestCombo: 'Best combo', status: 'Pop balloons. Rainbow balloons are worth 5!' },
    de: { title: '🎈 Luftballons zerplatzen', score: 'Punkte', bestCombo: 'Beste Serie', status: 'Zerplatze Luftballons. Regenbogen-Ballons zählen 5 Punkte!' }
  },
  game_build_world: {
    en: { title: '🏝️ Build Your Own World', built: 'Built', status: 'Choose an item, then choose a tile.', chooseTile: 'Now choose a place for {item}', needCoins: 'Earn more coins to build this item.', coinsTooltip: '{n} coins' },
    de: { title: '🏝️ Baue deine eigene Welt', built: 'Gebaut', status: 'Wähle einen Gegenstand, dann ein Feld.', chooseTile: 'Wähle jetzt einen Platz für {item}', needCoins: 'Sammle mehr Münzen, um das zu bauen.', coinsTooltip: '{n} Münzen' }
  },
  game_falling_stars: {
    en: { title: '🌟 Catch the Falling Stars', score: 'Score', caught: 'Caught' },
    de: { title: '🌟 Fange die fallenden Sterne', score: 'Punkte', caught: 'Gefangen' }
  },
  game_happy_pet: {
    en: { title: '🐉 Feed & Grow', level: 'Level', xp: 'XP', fullness: 'Fullness', status: 'Choose healthy or funny food!', levelUp: 'Level up! New accessory {item}', yummy: 'Yummy {food}! +{xp} XP' },
    de: { title: '🐉 Füttern & Wachsen', level: 'Level', xp: 'EP', fullness: 'Sättigung', status: 'Wähle gesundes oder lustiges Futter!', levelUp: 'Level-up! Neues Accessoire {item}', yummy: 'Lecker {food}! +{xp} EP' }
  },
  game_treasure_chest: {
    en: { title: '🏴‍☠️ Treasure Chest Adventure', status: 'Choose a chest while the timer is running.', timeUpMsg: 'Time finished. Your treasure is safe!', pausedMsg: 'Paused. Come back when you earn more play time.', openChest: 'Open chest {n}' },
    de: { title: '🏴‍☠️ Schatztruhen-Abenteuer', status: 'Wähle eine Truhe, solange die Zeit läuft.', timeUpMsg: 'Zeit vorbei. Dein Schatz ist sicher!', pausedMsg: 'Pausiert. Komm zurück, wenn du mehr Spielzeit gesammelt hast.', openChest: 'Truhe {n} öffnen' }
  }
};

function gameLabels(gameId) {
  return { ...GAME_COMMON_LABELS[state.lang], ...GAME_LABELS[gameId]?.[state.lang] };
}

const state = {
  bank: [],
  dict: {},
  lang: 'de',
  learnerKey: null,
  displayName: null,
  session: null,
  pendingCount: 10,
  activeGame: null,
  gameReturnTimer: null,
  gameBudgetSyncTimer: null,
  gamePageHideHandler: null,
  settings: { miniGames: true }
};

const Log = {
  info: (event, data = {}) => console.info(JSON.stringify({ ts: new Date().toISOString(), level: 'info', event, ...data })),
  error: (event, error) => console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', event, message: String(error) }))
};

/* ---------- i18n ---------- */

const I18N = {
  en: {
    appTitle: 'LernQuest',
    tagline: 'Train. Discover. Grow.',
    subtitle: 'Year 5 review for German, English and Math',
    namePlaceholder: 'Your name',
    miniGamesLabel: 'play a game at the end',
    languageLabel: 'Language',
    chooseSubject: 'Choose a subject',
    questionsCount: '{n} questions',
    progressExportBtn: '📈 Progress & Export',
    vocabTestBtn: '📚 Vocabulary test',
    vocabListBtn: '📖 Vocabulary list',
    dashboardHeading: 'Learner progress',
    dashboardEmpty: 'No learners yet — enter a name and start a round!',
    dashboardOverall: 'Overall',
    dashboardBudget: 'Game time saved',
    dashboardMastered: 'words mastered',
    needNameAlert: 'Please enter a name first.',
    questionCounter: 'Question {i}/{n}',
    budgetLabel: 'Collected game time: {s}s',
    checkAnswer: 'Check answer',
    correctTitle: 'Super! Correct!',
    wrongTitle: 'Not yet, but now we learn it!',
    yourAnswer: 'Your answer:',
    noAnswer: 'No answer',
    correctAnswerLabel: 'Correct answer:',
    ruleHeading: 'Focused rule',
    storyHeading: 'Story explanation',
    labelDe: '🇩🇪 Deutsch',
    labelEn: '🇬🇧 English',
    labelAr: '🇸🇦 العربية',
    timeSpent: 'Time: {s} seconds',
    gainedTime: '+{s}s gained 😄',
    lostTime: '{s}s lost 😔',
    nextBtn: 'Next',
    continueBtn: 'Continue',
    gamePickerHeading: '🎮 Choose your end-of-round game',
    gamePickerHint: 'Answer well to collect game time — you can play this at the end, or skip it.',
    skipGameBtn: 'No game this round',
    gameName_game_balloon_pop: 'Balloon Pop',
    gameName_game_build_world: 'Build Your World',
    gameName_game_falling_stars: 'Falling Stars',
    gameName_game_happy_pet: 'Happy Pet',
    gameName_game_treasure_chest: 'Treasure Chest',
    playGamePrompt: 'You collected {s}s of game time! Ready to play {game}?',
    playGameBtn: '🎮 Play now',
    backToAppBtn: '⬅ Back to LernQuest',
    scoreTitle: '{name}, your score is {pct}%',
    correctOf: '{ok} / {total} correct',
    colTopic: 'Topic',
    colResult: 'Result',
    colTime: 'Time',
    againBtn: 'New round',
    progressBtn: 'Progress',
    reportHeading: '📈 Progress{forName}',
    reportForName: ' for {name}',
    reportStats: 'Attempts: {attempts} · Correct: {pct}% · Vocabulary words looked up: {vocab}',
    exportJsonBtn: 'Export progress JSON',
    exportCsvBtn: 'Export CSV',
    backBtn: 'Back',
    staticNote: 'GitHub Pages is static and cannot safely commit to your repository. Export these files and commit them to the progress folder, or use a secure backend later.',
    vocabEmpty: "You haven't looked up any words yet. Double-click a word while studying to add it here!",
    vocabPromptDe: 'What does this German word mean in Arabic?',
    vocabPromptAr: 'Which German word matches this Arabic meaning?',
    vocabTitle: '📚 Vocabulary test',
    dialogGerman: 'German:',
    dialogArabic: 'Arabic:',
    dialogExamplesDe: 'German examples:',
    dialogExamplesAr: 'Arabic examples:',
    dialogUnknown: "We'll remember this word for your vocabulary test. 🌟",
    closeBtn: 'Close',
    vocabListHeading: '📖 Vocabulary list{forName}',
    vocabListEmpty: 'No words looked up yet. Double-click a word while studying to add it here!',
    colWord: 'Word',
    colMeaningDe: 'Meaning (DE)',
    colMeaningAr: 'Meaning (AR)',
    colLookups: 'Looked up',
    colMastery: 'Mastery',
    colMastered: 'Mastered',
    vocabMissingHeading: 'No explanation yet',
    vocabMissingNote: 'These words still need an entry in data/dictionary.json.',
    unitSeconds: 's',
    notEnoughQuestions: 'Not enough questions available for a {n}-question {subject} round yet. Try a smaller round size.',
    loadError: 'Could not load data. Run through a local web server, not file://.'
  },
  de: {
    appTitle: 'LernQuest',
    tagline: 'Üben. Entdecken. Wachsen.',
    subtitle: 'Wiederholung der 5. Klasse in Deutsch, Englisch und Mathe',
    namePlaceholder: 'Dein Name',
    miniGamesLabel: 'Spiel am Ende spielen',
    languageLabel: 'Sprache',
    chooseSubject: 'Wähle ein Fach',
    questionsCount: '{n} Fragen',
    progressExportBtn: '📈 Fortschritt & Export',
    vocabTestBtn: '📚 Vokabeltest',
    vocabListBtn: '📖 Vokabelliste',
    dashboardHeading: 'Fortschritt der Lernenden',
    dashboardEmpty: 'Noch keine Lernenden — gib einen Namen ein und starte eine Runde!',
    dashboardOverall: 'Gesamt',
    dashboardBudget: 'Gesammelte Spielzeit',
    dashboardMastered: 'gemeisterte Wörter',
    needNameAlert: 'Bitte zuerst einen Namen eingeben.',
    questionCounter: 'Frage {i}/{n}',
    budgetLabel: 'Gesammelte Spielzeit: {s}s',
    checkAnswer: 'Antwort prüfen',
    correctTitle: 'Super! Richtig!',
    wrongTitle: 'Gib nicht auf, denn wir lernen es jetzt gemeinsam!',
    yourAnswer: 'Deine Antwort:',
    noAnswer: 'Keine Antwort',
    correctAnswerLabel: 'Richtige Antwort:',
    ruleHeading: 'Merksatz',
    storyHeading: 'Geschichte zur Erklärung',
    labelDe: '🇩🇪 Deutsch',
    labelEn: '🇬🇧 English',
    labelAr: '🇸🇦 العربية',
    timeSpent: 'Zeit: {s} Sekunden',
    gainedTime: '+{s}s gewonnen 😄',
    lostTime: '{s}s verloren 😔',
    nextBtn: 'Weiter',
    continueBtn: 'Weiter',
    gamePickerHeading: '🎮 Wähle dein Spiel für das Rundenende',
    gamePickerHint: 'Antworte gut, um Spielzeit zu sammeln — du kannst am Ende spielen oder überspringen.',
    skipGameBtn: 'Diesmal kein Spiel',
    gameName_game_balloon_pop: 'Luftballons zerplatzen',
    gameName_game_build_world: 'Baue deine Welt',
    gameName_game_falling_stars: 'Fallende Sterne',
    gameName_game_happy_pet: 'Glückliches Haustier',
    gameName_game_treasure_chest: 'Schatztruhe',
    playGamePrompt: 'Du hast {s}s Spielzeit gesammelt! Bereit, {game} zu spielen?',
    playGameBtn: '🎮 Jetzt spielen',
    backToAppBtn: '⬅ Zurück zu LernQuest',
    scoreTitle: '{name}, dein Ergebnis ist {pct}%',
    correctOf: '{ok} / {total} richtig',
    colTopic: 'Thema',
    colResult: 'Ergebnis',
    colTime: 'Zeit',
    againBtn: 'Neue Runde',
    progressBtn: 'Fortschritt',
    reportHeading: '📈 Fortschritt{forName}',
    reportForName: ' für {name}',
    reportStats: 'Versuche: {attempts} · Richtig: {pct}% · Nachgeschlagene Vokabeln: {vocab}',
    exportJsonBtn: 'Fortschritt als JSON exportieren',
    exportCsvBtn: 'Als CSV exportieren',
    backBtn: 'Zurück',
    staticNote: 'GitHub Pages ist statisch und kann nicht sicher in dein Repository schreiben. Exportiere diese Dateien und committe sie in den progress-Ordner, oder nutze später ein sicheres Backend.',
    vocabEmpty: 'Du hast noch keine Wörter nachgeschlagen. Doppelklicke beim Lernen auf ein Wort, um es hier zu sammeln!',
    vocabPromptDe: 'Was bedeutet dieses deutsche Wort auf Arabisch?',
    vocabPromptAr: 'Welches deutsche Wort passt zu dieser arabischen Bedeutung?',
    vocabTitle: '📚 Vokabeltest',
    dialogGerman: 'Deutsch:',
    dialogArabic: 'Arabisch:',
    dialogExamplesDe: 'Beispiele auf Deutsch:',
    dialogExamplesAr: 'Beispiele auf Arabisch:',
    dialogUnknown: 'Dieses Wort merken wir uns für deinen Vokabeltest. 🌟',
    closeBtn: 'Schließen',
    vocabListHeading: '📖 Vokabelliste{forName}',
    vocabListEmpty: 'Noch keine Wörter nachgeschlagen. Doppelklicke beim Lernen auf ein Wort, um es hier zu sammeln!',
    colWord: 'Wort',
    colMeaningDe: 'Bedeutung (DE)',
    colMeaningAr: 'Bedeutung (AR)',
    colLookups: 'Nachgeschlagen',
    colMastery: 'Beherrschung',
    colMastered: 'Gemeistert',
    vocabMissingHeading: 'Noch ohne Erklärung',
    vocabMissingNote: 'Diese Wörter brauchen noch einen Eintrag in data/dictionary.json.',
    unitSeconds: 's',
    notEnoughQuestions: 'Für eine {subject}-Runde mit {n} Fragen sind noch nicht genug Fragen vorhanden. Wähle eine kleinere Rundengröße.',
    loadError: 'Daten konnten nicht geladen werden. Nutze einen lokalen Webserver, nicht file://.'
  }
};

function t(key, vars) {
  let s = I18N[state.lang]?.[key] ?? I18N.en[key] ?? key;
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
  return s;
}

function subjectName(subject) {
  return SUBJECT_NAMES[subject]?.[state.lang] || subject;
}

// Presentation-only labels for the raw `topic` storage keys used in data/*.md and exports.
// Never rename the keys themselves — only what's shown to the child.
const TOPIC_LABELS = {
  Addition: { en: 'Addition', de: 'Addition' },
  Subtraction: { en: 'Subtraction', de: 'Subtraktion' },
  Multiplication: { en: 'Multiplication', de: 'Multiplikation' },
  Division: { en: 'Division', de: 'Division' },
  Fractions: { en: 'Fractions', de: 'Brüche' },
  'Place value': { en: 'Place value', de: 'Stellenwert' },
  'Number comparison': { en: 'Number comparison', de: 'Zahlenvergleich' },
  Patterns: { en: 'Patterns', de: 'Muster' },
  Perimeter: { en: 'Perimeter', de: 'Umfang' },
  Time: { en: 'Time', de: 'Uhrzeit' },
  Articles: { en: 'Articles', de: 'Artikel (Englisch)' },
  Plural: { en: 'Plural', de: 'Plural' },
  Prepositions: { en: 'Prepositions', de: 'Präpositionen' },
  'Present simple': { en: 'Present simple', de: 'Simple Present' },
  'Simple past': { en: 'Simple past', de: 'Simple Past' },
  Comparatives: { en: 'Comparatives', de: 'Steigerung' },
  Contractions: { en: 'Contractions', de: 'Kurzformen' },
  'Question words': { en: 'Question words', de: 'Fragewörter' },
  Subject: { en: 'Subject', de: 'Subjekt (Englisch)' },
  'There is/are': { en: 'There is/are', de: 'Es gibt' },
  'to be': { en: 'To be', de: 'Verb „to be“' },
  Artikel: { en: 'Articles', de: 'Artikel' },
  Adjektive: { en: 'Adjectives', de: 'Adjektive' },
  Akkusativobjekt: { en: 'Accusative object', de: 'Akkusativobjekt' },
  Kommasetzung: { en: 'Comma placement', de: 'Kommasetzung' },
  Prädikat: { en: 'Predicate', de: 'Prädikat' },
  Präteritum: { en: 'Simple past (Präteritum)', de: 'Präteritum' },
  Rechtschreibung: { en: 'Spelling', de: 'Rechtschreibung' },
  Satzzeichen: { en: 'Punctuation', de: 'Satzzeichen' },
  Subjekt: { en: 'Subject', de: 'Subjekt' }
};

function topicLabel(topic) {
  return TOPIC_LABELS[topic]?.[state.lang] ?? TOPIC_LABELS[topic]?.en ?? topic;
}

/* ---------- storage ---------- */

function emptyDb() {
  return { schemaVersion: 2, learners: {}, attempts: [], rounds: [], vocab: {}, settings: { lang: 'de', miniGames: true } };
}

// Coerces a stored budget to a finite whole-second value >= 0; corrupt/negative data never survives this.
function normalizeBudget(v) {
  return Math.round(safeNum(v, 0, 0));
}

// Never rounds up: a game exiting with fractional seconds left must not refund play time.
function floorGameBudget(v) {
  return Math.max(0, Math.floor(safeNum(v, 0, 0)));
}

// v1 stored a flat {profiles,attempts:[{name,...}],vocab:[{name,word,...}]} shape.
function migrateIfNeeded(raw) {
  if (raw.schemaVersion === 2) {
    raw.learners ??= {};
    raw.attempts ??= [];
    raw.rounds ??= [];
    raw.vocab ??= {};
    raw.settings ??= { lang: 'de', miniGames: true };
    for (const l of Object.values(raw.learners)) {
      l.gameTimeBudget = normalizeBudget(l.gameTimeBudget);
      l.games ??= {};
      l.lastGameId ??= null;
    }
    return raw;
  }
  const db = emptyDb();
  try {
    // Legacy profiles carried the budget/creation date before attempts existed; import first so
    // later loops only need `??=` and never clobber the original spelling of a name.
    const oldProfiles = Array.isArray(raw.profiles) ? raw.profiles
      : (raw.profiles && typeof raw.profiles === 'object' ? Object.values(raw.profiles) : []);
    for (const p of oldProfiles) {
      if (!p || !p.name) continue;
      const key = normalizeKey(p.name);
      db.learners[key] ??= { key, displayName: displayNameFrom(p.name), gameTimeBudget: 0, games: {}, lastGameId: null, createdAt: p.at || new Date().toISOString() };
      if (p.gameTimeBudget !== undefined) db.learners[key].gameTimeBudget = normalizeBudget(p.gameTimeBudget);
    }
    const oldAttempts = Array.isArray(raw.attempts) ? raw.attempts : [];
    for (const a of oldAttempts) {
      if (!a || !a.name) continue;
      const key = normalizeKey(a.name);
      db.learners[key] ??= { key, displayName: displayNameFrom(a.name), gameTimeBudget: 0, games: {}, lastGameId: null, createdAt: a.at || new Date().toISOString() };
      db.attempts.push({ learnerKey: key, displayName: db.learners[key].displayName, questionId: a.questionId, subject: a.subject, topic: a.topic, answer: a.answer, correct: a.correct, durationMs: a.durationMs, at: a.at });
    }
    const oldVocab = Array.isArray(raw.vocab) ? raw.vocab : [];
    for (const v of oldVocab) {
      if (!v || !v.name || !v.word) continue;
      const key = normalizeKey(v.name);
      db.learners[key] ??= { key, displayName: displayNameFrom(v.name), gameTimeBudget: 0, games: {}, lastGameId: null, createdAt: v.at || new Date().toISOString() };
      const bucket = db.vocab[key] ??= {};
      bucket[v.word] ??= { correctCount: 0, lookups: 0, mastered: false, lastAt: v.at || null };
      bucket[v.word].lookups++;
    }
    if (oldProfiles.length || oldAttempts.length || oldVocab.length) {
      Log.info('storage.migrated', { profiles: oldProfiles.length, attempts: oldAttempts.length, vocab: oldVocab.length, learners: Object.keys(db.learners).length });
    }
    // Historical attempts carry over (so the selection algorithm still avoids solved questions),
    // but old data has no round boundaries, so per-round grades start fresh from here.
  } catch (e) {
    Log.error('storage.migrate', e);
  }
  return db;
}

function loadDb() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw) return emptyDb();
    const db = migrateIfNeeded(raw);
    saveDb(db); // persists normalized budgets (and any migration) so storage itself never holds a bad value
    return db;
  } catch (e) {
    Log.error('storage.read', e);
    return emptyDb();
  }
}

function saveDb(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    Log.error('storage.write', e);
  }
}

// Creates the learner record on first sight only, so a normalized key's ORIGINAL
// spelling/casing sticks even if the same person types it differently later.
function ensureLearner(db, key, typedName) {
  return db.learners[key] ??= { key, displayName: displayNameFrom(typedName), gameTimeBudget: 0, games: {}, lastGameId: null, createdAt: new Date().toISOString() };
}

/* ---------- utils ---------- */

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Coerces a possibly-corrupt persisted/user-controlled number before it hits innerHTML.
function safeNum(v, fallback, min = -Infinity, max = Infinity) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

// exclude: lowercased tokens to skip decorating (see wrongOptionTokens). Defaults to none,
// for render sites with no question context.
function decorate(text, exclude = null) {
  return esc(text).replace(/\b([A-Za-zÄÖÜäöüß]{5,})\b/g,
    w => (exclude && exclude.has(w.toLowerCase())) ? w : `<span class="word" data-word="${w}">${w}</span>`);
}

// Tokens (5+ letters) that appear ONLY in this question's wrong (non-answer) options and
// nowhere else in the question. A pure typo distractor (e.g. "machente") must never be
// decorated/looked-up as vocabulary, but a real word reused elsewhere (prompt, rule, answer,
// explanation.de/en) must stay clickable even if it also shows up in a wrong option.
function wrongOptionTokens(q) {
  const collect = (text, into) => {
    for (const m of String(text || '').matchAll(/\b([A-Za-zÄÖÜäöüß]{5,})\b/g)) into.add(m[1].toLowerCase());
  };
  const wrongTokens = new Set();
  const protectedTokens = new Set();
  for (const o of q.options || []) {
    collect(o, o === q.answer ? protectedTokens : wrongTokens);
  }
  collect(q.prompt, protectedTokens);
  collect(q.rule, protectedTokens);
  collect(q.answer, protectedTokens);
  collect(q.explanation?.de, protectedTokens);
  collect(q.explanation?.en, protectedTokens);
  for (const w of protectedTokens) wrongTokens.delete(w);
  return wrongTokens;
}

// Normalizes a raw dictionary.json entry to { de, ar, examplesDe:[], examplesAr:[] }.
// Accepts both the current schema (examplesDe/examplesAr arrays) and the legacy singular
// exampleDe/exampleAr strings, so every caller can just read the array form. Returns null
// for a missing word instead of throwing, so callers can `if (entry)` directly.
function normalizeDictEntry(raw) {
  if (!raw) return null;
  const examplesDe = Array.isArray(raw.examplesDe) ? raw.examplesDe.filter(Boolean)
    : (raw.exampleDe ? [raw.exampleDe] : []);
  const examplesAr = Array.isArray(raw.examplesAr) ? raw.examplesAr.filter(Boolean)
    : (raw.exampleAr ? [raw.exampleAr] : []);
  return { de: raw.de, ar: raw.ar, examplesDe, examplesAr };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeKey(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function displayNameFrom(name) {
  return name.trim().replace(/\s+/g, ' ');
}

function safe(s) { return s.replace(/[^a-z0-9_-]/gi, '_'); }
function csv(x) {
  let s = String(x);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // neutralize CSV formula injection
  return '"' + s.replace(/"/g, '""') + '"';
}
function download(n, c, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([c], { type: mime }));
  a.download = n;
  a.click();
  URL.revokeObjectURL(a.href);
}

// De-dup rule (see docs/ARCHITECTURE.md #5): a v2 round lists the attempt ids it covers in
// `round.attemptIds`. Any attempt whose id shows up there is skipped here and counted via the
// round's own correct/total instead; attempts NOT covered by any round (all migrated legacy
// attempts, since rounds didn't exist yet) are counted directly. This lets legacy attempts AND
// v2 rounds both contribute to home-screen grades without adding the same result twice.
function learnerSummary(db, key) {
  const attempts = db.attempts.filter(a => a.learnerKey === key);
  const rounds = db.rounds.filter(r => r.learnerKey === key);
  const coveredIds = new Set();
  for (const r of rounds) for (const id of r.attemptIds || []) coveredIds.add(id);

  const bySubject = {};
  for (const a of attempts) {
    if (a.id && coveredIds.has(a.id)) continue;
    const b = bySubject[a.subject] ??= { correct: 0, total: 0 };
    b.total++;
    if (a.correct) b.correct++;
  }
  for (const r of rounds) {
    const b = bySubject[r.subject] ??= { correct: 0, total: 0 };
    b.correct += r.correct;
    b.total += r.total;
  }

  const overall = Object.values(bySubject).reduce((a, b) => ({ correct: a.correct + b.correct, total: a.total + b.total }), { correct: 0, total: 0 });
  const vocabMap = db.vocab[key] || {};
  const masteredCount = Object.values(vocabMap).filter(v => v.mastered).length;
  return { bySubject, overall, masteredCount };
}

/* ---------- round composition (topic + difficulty caps) ---------- */

function selectQuestions(fullPool, count, solvedIds) {
  const unsolved = fullPool.filter(q => !solvedIds.has(q.id));
  const solved = fullPool.filter(q => solvedIds.has(q.id));
  return pickWithCaps(unsolved, solved, count);
}

// Builds a round of exactly `count` questions (or as many as the bank truly has).
// Unsolved questions are always tried before solved ones. Caps are applied through a
// documented, logged relaxation ladder so a thin bank still fills the round instead of
// silently returning short:
//   stage 1: topic cap + hard-difficulty cap both enforced
//   stage 2: hard-difficulty cap relaxed (topic cap still enforced)
//   stage 3: topic cap relaxed too (any topic/difficulty mix)
//   stage 4: pool is exhausted — whatever stage 3 collected is the true limit
function pickWithCaps(unsolved, solved, count) {
  const topicCap = Math.max(1, Math.ceil(count * 0.10));
  const hardCap = Math.floor(count * 0.15);
  const unsolvedShuffled = shuffle(unsolved.slice());
  const solvedShuffled = shuffle(solved.slice());

  const chosen = [];
  const chosenIds = new Set();
  const topicCount = {};
  let hardCount = 0;

  const tryAdd = (q, opts) => {
    if (chosen.length >= count || chosenIds.has(q.id)) return;
    const tc = topicCount[q.topic] || 0;
    if (!opts.ignoreTopicCap && tc >= topicCap) return;
    const isHard = q.difficulty >= HARD_DIFFICULTY;
    if (!opts.ignoreHardCap && isHard && hardCount >= hardCap) return;
    chosen.push(q);
    chosenIds.add(q.id);
    topicCount[q.topic] = tc + 1;
    if (isHard) hardCount++;
  };

  // Exhausts the unsolved pool before the solved pool is even tried, in every stage — otherwise
  // a solved question can fill a slot while an unsolved one is still waiting on a relaxed cap.
  const runStage = (opts) => {
    for (const q of unsolvedShuffled) { if (chosen.length >= count) return; tryAdd(q, opts); }
    for (const q of solvedShuffled) { if (chosen.length >= count) return; tryAdd(q, opts); }
  };

  let stage = 1;
  runStage({});

  if (chosen.length < count) { stage = 2; runStage({ ignoreHardCap: true }); }
  if (chosen.length < count) { stage = 3; runStage({ ignoreTopicCap: true, ignoreHardCap: true }); }
  if (chosen.length < count) stage = 4;

  Log.info('selection.stage', { stage, have: chosen.length, need: count, unsolved: unsolved.length, solved: solved.length });
  return chosen;
}

/* ---------- vocabulary test ---------- */

function buildVocabQuestion(word, dictWords) {
  const entry = normalizeDictEntry(state.dict[word]);
  const direction = Math.random() < 0.5 ? 'de2ar' : 'ar2de';
  const distractorWords = shuffle(dictWords.filter(w => w !== word)).slice(0, 3);

  if (direction === 'de2ar') {
    const options = shuffle([entry.ar, ...distractorWords.map(w => normalizeDictEntry(state.dict[w]).ar)]);
    return {
      id: `vocab-${word}-${direction}`, isVocab: true, word, direction, subject: 'Vocabulary', topic: word,
      caption: t('vocabPromptDe'), prompt: entry.de, promptDir: 'ltr', options, optionsDir: 'rtl', answer: entry.ar,
      rule: entry.examplesDe[0] || '', timeLimitSec: 30, difficulty: 1
    };
  }
  const options = shuffle([entry.de, ...distractorWords.map(w => normalizeDictEntry(state.dict[w]).de)]);
  return {
    id: `vocab-${word}-${direction}`, isVocab: true, word, direction, subject: 'Vocabulary', topic: word,
    caption: t('vocabPromptAr'), prompt: entry.ar, promptDir: 'rtl', options, optionsDir: 'ltr', answer: entry.de,
    rule: entry.examplesAr[0] || '', timeLimitSec: 30, difficulty: 1
  };
}

function startVocabTest() {
  clearTimers();
  const nameInput = $('#name').value;
  if (!nameInput.trim()) { alert(t('needNameAlert')); return; }
  state.learnerKey = normalizeKey(nameInput);

  const db = loadDb();
  const learner = ensureLearner(db, state.learnerKey, nameInput);
  state.displayName = learner.displayName;
  saveDb(db);

  const vocabMap = db.vocab[state.learnerKey] || {};
  const eligible = Object.keys(vocabMap).filter(w => !vocabMap[w].mastered && state.dict[w]);
  if (!eligible.length) { renderVocabEmpty(); return; }

  const dictWords = Object.keys(state.dict);
  const chosenWords = shuffle(eligible.slice()).slice(0, Math.min(VOCAB_TEST_LENGTH, eligible.length));
  const questions = chosenWords.map(w => buildVocabQuestion(w, dictWords));
  state.session = { mode: 'vocab', subject: null, questions, index: 0, answers: [], startedAt: Date.now(), questionStartedAt: 0, timer: null };
  Log.info('session.start', { learnerKey: state.learnerKey, mode: 'vocab', count: questions.length });
  showQuestion();
}

function renderVocabEmpty() {
  clearTimers();
  app.innerHTML = `<main class="shell"><section class="card"><h1>${t('vocabTitle')}</h1><p>${esc(t('vocabEmpty'))}</p><button id="back">${t('backBtn')}</button></section></main>`;
  $('#back').onclick = home;
}

// Parent-facing view: every looked-up word per learner, its mastery progress, and whether
// a dictionary entry exists. Words with NO entry are surfaced separately here (never to the
// child) so a parent knows what still needs adding to data/dictionary.json.
function vocabList() {
  clearTimers();
  const db = loadDb();
  const key = state.learnerKey;
  const heading = t('vocabListHeading', { forName: key ? t('reportForName', { name: esc(state.displayName) }) : '' });

  const learnerKeys = key ? [key] : Object.keys(db.vocab);
  const sections = learnerKeys
    .map(k => ({ learner: db.learners[k], vocabMap: db.vocab[k] || {} }))
    .filter(x => x.learner && Object.keys(x.vocabMap).length)
    .sort((a, b) => a.learner.displayName.localeCompare(b.learner.displayName));

  const byMasteryThenWord = (a, b) => (a.mastered !== b.mastered ? (a.mastered ? 1 : -1) : a.word.localeCompare(b.word));

  const sectionsHtml = sections.map(({ learner, vocabMap }) => {
    const words = Object.entries(vocabMap).map(([word, v]) => ({ word, ...v, dictEntry: normalizeDictEntry(state.dict[word]) }));
    const known = words.filter(w => w.dictEntry).sort(byMasteryThenWord);
    const missing = words.filter(w => !w.dictEntry).sort(byMasteryThenWord);

    const knownTable = known.length ? `<table><tr>
        <th>${t('colWord')}</th><th>${t('colMeaningDe')}</th><th>${t('colMeaningAr')}</th>
        <th>${t('colLookups')}</th><th>${t('colMastery')}</th><th>${t('colMastered')}</th>
      </tr>${known.map(w => `<tr>
        <td>${esc(w.word)}</td>
        <td>${esc(w.dictEntry.de)}</td>
        <td dir="rtl">${esc(w.dictEntry.ar)}</td>
        <td>${safeNum(w.lookups, 0, 0)}</td>
        <td>${Math.min(w.correctCount, VOCAB_MASTERY_TARGET)}/${VOCAB_MASTERY_TARGET}</td>
        <td>${w.mastered ? '✅' : '—'}</td>
      </tr>`).join('')}</table>` : '';

    const missingBlock = missing.length ? `<h4>${t('vocabMissingHeading')}</h4>
      <table><tr><th>${t('colWord')}</th><th>${t('colLookups')}</th><th>${t('colMastery')}</th></tr>
        ${missing.map(w => `<tr><td>${esc(w.word)}</td><td>${safeNum(w.lookups, 0, 0)}</td><td>${Math.min(w.correctCount, VOCAB_MASTERY_TARGET)}/${VOCAB_MASTERY_TARGET}</td></tr>`).join('')}
      </table>
      <p><small>${esc(t('vocabMissingNote'))}</small></p>` : '';

    return `<div class="vocab-learner">
      <h3>${esc(learner.displayName)}</h3>
      ${knownTable}
      ${missingBlock}
    </div>`;
  }).join('');

  const body = sections.length ? sectionsHtml : `<p class="dashboard-empty">${esc(t('vocabListEmpty'))}</p>`;

  app.innerHTML = `<main class="shell"><section class="card">
    <h1>${heading}</h1>
    ${body}
    <p><button id="back" class="secondary">${t('backBtn')}</button></p>
  </section></main>`;
  $('#back').onclick = home;
}

/* ---------- session flow ---------- */

// Clears any running countdowns before switching screens so a leftover interval never
// fires submit()/showQuestion() against a session/screen that's no longer active. Also tears
// down any mounted mini-game (saving its state via game:paused) and its scoped stylesheet.
function clearTimers() {
  if (state.session?.timer) clearInterval(state.session.timer);
  if (state.session) state.session.timer = null;
  if (state.gameReturnTimer) { clearTimeout(state.gameReturnTimer); state.gameReturnTimer = null; }
  if (state.gameBudgetSyncTimer) { clearInterval(state.gameBudgetSyncTimer); state.gameBudgetSyncTimer = null; }
  if (state.gamePageHideHandler) { window.removeEventListener('pagehide', state.gamePageHideHandler); state.gamePageHideHandler = null; }
  if (state.activeGame) {
    state.activeGame.pause('host_navigation');
    state.activeGame.destroy();
    state.activeGame = null;
  }
  document.getElementById('game-style')?.remove();
}

function home() {
  clearTimers();
  const db = loadDb();
  document.documentElement.lang = state.lang;
  const learners = Object.values(db.learners).sort((a, b) => a.displayName.localeCompare(b.displayName));

  const dashboard = learners.length ? `<div class="grid learners">${learners.map(l => {
    const sum = learnerSummary(db, l.key);
    const subjectsHtml = SUBJECTS.map(subj => {
      const b = sum.bySubject[subj];
      const pct = b && b.total ? Math.round((b.correct / b.total) * 100) : null;
      return `<div class="subj-grade"><span>${esc(subjectName(subj))}</span><b>${pct === null ? '—' : pct + '%'}</b></div>`;
    }).join('');
    const overallPct = sum.overall.total ? Math.round((sum.overall.correct / sum.overall.total) * 100) : null;
    return `<div class="card learner-card">
      <h3>${esc(l.displayName)}</h3>
      <p class="overall">${t('dashboardOverall')}: <b>${overallPct === null ? '—' : overallPct + '%'}</b></p>
      <div class="subj-grades">${subjectsHtml}</div>
      <p class="budget-line">⏱ ${t('dashboardBudget')}: <b>${safeNum(l.gameTimeBudget, 0, 0)}${t('unitSeconds')}</b></p>
      <p class="vocab-line">📚 ${sum.masteredCount} ${t('dashboardMastered')}</p>
    </div>`;
  }).join('')}</div>` : `<p class="dashboard-empty">${esc(t('dashboardEmpty'))}</p>`;

  app.innerHTML = `<main class="shell"><section class="hero">
    <div class="row lang-switch"><label>${t('languageLabel')}
      <!-- Native language names in the switcher itself intentionally stay untranslated. -->
      <select id="lang"><option value="de" ${state.lang === 'de' ? 'selected' : ''}>Deutsch</option><option value="en" ${state.lang === 'en' ? 'selected' : ''}>English</option></select>
    </label></div>
    <div class="logo">🚀 ${t('appTitle')}</div>
    <h1>${t('tagline')}</h1>
    <p>${t('subtitle')}</p>
    <div class="row" style="justify-content:center">
      <input id="name" maxlength="40" placeholder="${esc(t('namePlaceholder'))}" value="${esc(state.displayName || '')}">
      <select id="count"><option>5</option><option selected>10</option><option>20</option><option>30</option></select>
      <label><input id="games" type="checkbox" ${state.settings.miniGames ? 'checked' : ''}> ${t('miniGamesLabel')}</label>
    </div>
    <h3>${t('chooseSubject')}</h3>
    <div class="grid">${SUBJECTS.map(subj => `<div class="card subject" data-subject="${subj}"><h2>${SUBJECT_FLAGS[subj]} ${esc(subjectName(subj))}</h2><p>${t('questionsCount', { n: 300 })}</p></div>`).join('')}</div>
    <p><button id="vocabBtn" class="secondary">${t('vocabTestBtn')}</button> <button id="vocabListBtn" class="secondary">${t('vocabListBtn')}</button> <button id="progressBtn" class="secondary">${t('progressExportBtn')}</button></p>
    <h3>${t('dashboardHeading')}</h3>
    ${dashboard}
  </section></main>`;

  document.querySelectorAll('.subject').forEach(x => x.onclick = () => chooseSubject(x.dataset.subject));
  $('#vocabBtn').onclick = startVocabTest;
  $('#vocabListBtn').onclick = () => {
    const val = $('#name').value.trim();
    const key = val ? normalizeKey(val) : null;
    const db2 = loadDb();
    state.learnerKey = key;
    state.displayName = key ? (db2.learners[key]?.displayName || displayNameFrom(val)) : null;
    vocabList();
  };
  $('#progressBtn').onclick = () => {
    const val = $('#name').value.trim();
    const key = val ? normalizeKey(val) : null;
    const db2 = loadDb();
    state.learnerKey = key;
    state.displayName = key ? (db2.learners[key]?.displayName || displayNameFrom(val)) : null;
    report();
  };
  $('#lang').onchange = (e) => {
    state.lang = e.target.value;
    const db2 = loadDb();
    db2.settings.lang = state.lang;
    saveDb(db2);
    home();
  };
}

// Resolves the learner and round settings from the home form, then either shows the
// end-of-round game picker (kid chooses up front) or starts the round directly.
function chooseSubject(subject) {
  const nameInput = $('#name').value;
  if (!nameInput.trim()) { alert(t('needNameAlert')); return; }
  state.learnerKey = normalizeKey(nameInput);
  state.settings.miniGames = $('#games').checked;
  state.pendingCount = +$('#count').value;

  const db = loadDb();
  const learner = ensureLearner(db, state.learnerKey, nameInput);
  state.displayName = learner.displayName;
  db.settings.miniGames = state.settings.miniGames;
  saveDb(db);

  if (state.settings.miniGames) gamePicker(subject);
  else start(subject, null);
}

// Lets the kid pick which game to play at the end of THIS round (or skip). The choice rides
// along on the session and is only acted on later, in finish(), once budget has been earned.
function gamePicker(subject) {
  clearTimers();
  const db = loadDb();
  const lastGameId = db.learners[state.learnerKey]?.lastGameId || null;

  app.innerHTML = `<main class="shell"><section class="card">
    <h1>${t('gamePickerHeading')}</h1>
    <p>${esc(t('gamePickerHint'))}</p>
    <div class="grid">${GAMES.map(g => `<div class="card subject${g.id === lastGameId ? ' selected' : ''}" data-game="${g.id}"><h2>${g.icon} ${esc(gameName(g.id))}</h2></div>`).join('')}</div>
    <p><button id="skipGame" class="secondary">${t('skipGameBtn')}</button></p>
  </section></main>`;

  document.querySelectorAll('[data-game]').forEach(x => x.onclick = () => start(subject, x.dataset.game));
  $('#skipGame').onclick = () => start(subject, null);
}

function start(subject, chosenGameId) {
  clearTimers();
  const count = state.pendingCount;

  const db = loadDb();
  const solvedIds = new Set(db.attempts.filter(a => a.learnerKey === state.learnerKey && a.subject === subject && a.correct).map(a => a.questionId));
  const subjectPool = state.bank.filter(q => q.subject === subject);
  const questions = selectQuestions(subjectPool, count, solvedIds);

  if (questions.length < count) {
    Log.info('selection.insufficient', { subject, have: questions.length, need: count });
    alert(t('notEnoughQuestions', { n: count, subject: subjectName(subject) }));
    return;
  }

  state.session = { mode: 'subject', subject, questions, index: 0, answers: [], startedAt: Date.now(), questionStartedAt: 0, timer: null, chosenGameId };
  Log.info('session.start', { learnerKey: state.learnerKey, subject, count: questions.length, chosenGameId });
  showQuestion();
}

function showQuestion() {
  clearTimers();
  const s = state.session;
  const q = s.questions[s.index];
  s.questionStartedAt = Date.now();
  const timeLimitSec = safeNum(q.timeLimitSec, 30, 1, 600);

  const db = loadDb();
  const budget = safeNum(db.learners[state.learnerKey]?.gameTimeBudget, 0, 0);
  const subjectLabel = q.isVocab ? t('vocabTitle') : subjectName(q.subject);
  const promptAttr = q.promptDir === 'rtl' ? ' dir="rtl"' : '';
  const optionsAttr = q.optionsDir === 'rtl' ? ' dir="rtl"' : '';
  const captionHtml = q.isVocab ? `<p class="vocab-caption">${esc(q.caption)}</p>` : '';
  const exclude = wrongOptionTokens(q);
  const promptHtml = q.isVocab ? `<b>${esc(q.prompt)}</b>` : decorate(q.prompt, exclude);

  app.innerHTML = `<main class="shell"><section class="card">
    <div class="topbar">
      <b>${esc(state.displayName)} · ${esc(subjectLabel)}</b>
      <span>${t('questionCounter', { i: s.index + 1, n: s.questions.length })}</span>
      <span id="timer" class="timer">${timeLimitSec}${t('unitSeconds')}</span>
    </div>
    <div class="progress"><div style="width:${(s.index / s.questions.length) * 100}%"></div></div>
    <div class="budget">⏱ ${t('budgetLabel', { s: budget })}</div>
    ${captionHtml}
    <h2${promptAttr}>${promptHtml}</h2>
    <div id="options"${optionsAttr}>${q.options.map(o => `<button class="option" data-answer="${esc(o)}">${q.isVocab ? esc(o) : decorate(o, exclude)}</button>`).join('')}</div>
    <button id="submit" disabled>${t('checkAnswer')}</button>
  </section></main>`;

  let left = timeLimitSec;
  s.timer = setInterval(() => {
    left--;
    $('#timer').textContent = left + t('unitSeconds');
    if (left <= 0) { clearInterval(s.timer); submit(''); }
  }, 1000);

  document.querySelectorAll('.option').forEach(b => b.onclick = () => {
    document.querySelectorAll('.option').forEach(x => x.classList.remove('chosen'));
    b.classList.add('chosen');
    $('#submit').disabled = false;
  });
  $('#submit').onclick = () => submit($('.option.chosen')?.dataset.answer || '');
}

function submit(answer) {
  const s = state.session;
  const q = s.questions[s.index];
  clearInterval(s.timer);
  const timeLimitSec = safeNum(q.timeLimitSec, 30, 1, 600);
  const elapsedMs = Date.now() - s.questionStartedAt;
  const correct = String(answer).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
  // Elapsed + remaining always sum to the time limit, so a real timeout (elapsed >= limit)
  // naturally loses the full question time instead of the old "-0 gained" bug.
  const elapsedSec = Math.min(timeLimitSec, Math.ceil(elapsedMs / 1000));
  const remainingSec = timeLimitSec - elapsedSec;

  const db = loadDb();
  const learner = ensureLearner(db, state.learnerKey, state.displayName);
  // A corrupted/absent stored budget must not hit arithmetic as a string or NaN.
  const before = safeNum(learner.gameTimeBudget, 0, 0);
  if (correct) {
    learner.gameTimeBudget = before + remainingSec;
  } else {
    learner.gameTimeBudget = Math.max(0, before - elapsedSec);
  }
  // Displayed gain/loss reflects the real elapsed time, independent of the stored balance,
  // which is clamped to >= 0 and so can under-report a loss once it hits zero.
  const timeGain = correct ? remainingSec : 0;
  const timeLoss = correct ? 0 : elapsedSec;

  const item = { id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, learnerKey: state.learnerKey, displayName: state.displayName, questionId: q.id, subject: q.subject, topic: q.topic, answer, correct, durationMs: elapsedMs, at: new Date().toISOString() };

  if (q.isVocab) {
    const bucket = db.vocab[state.learnerKey] ??= {};
    const entry = bucket[q.word] ??= { correctCount: 0, lookups: 0, mastered: false, lastAt: null };
    if (correct && !entry.mastered) {
      entry.correctCount++;
      if (entry.correctCount >= VOCAB_MASTERY_TARGET) entry.mastered = true;
    }
    entry.lastAt = new Date().toISOString();
  } else {
    db.attempts.push(item);
  }
  saveDb(db);

  const answerRecord = { ...item, timeGain, timeLoss };
  s.answers.push(answerRecord);
  Log.info('answer.checked', { questionId: q.id, correct, durationMs: elapsedMs, timeGain, timeLoss });
  feedback(q, answerRecord);
}

function feedback(q, a) {
  const timeNote = a.correct
    ? `<p class="time-gain">${t('gainedTime', { s: a.timeGain })}</p>`
    : `<p class="time-loss">${t('lostTime', { s: a.timeLoss })}</p>`;

  const exclude = wrongOptionTokens(q);
  const story = (!a.correct && !q.isVocab) ? `
    <h3>${t('storyHeading')}</h3>
    <div class="story">
      <div><b>${t('labelDe')}</b><p>${decorate(q.explanation.de, exclude)}</p></div>
      <div><b>${t('labelEn')}</b><p>${decorate(q.explanation.en, exclude)}</p></div>
      <div dir="rtl"><b>${t('labelAr')}</b><p>${decorate(q.explanation.ar, exclude)}</p></div>
    </div>` : '';

  const ruleDirAttr = q.isVocab && q.promptDir === 'rtl' ? ' dir="rtl"' : '';
  const ruleHtml = q.isVocab
    ? (q.rule ? `<p${ruleDirAttr}>${esc(q.rule)}</p>` : '')
    : `<p>${decorate(q.rule, exclude)}</p>`;

  app.innerHTML = `<main class="shell"><section class="card feedback ${a.correct ? 'ok' : 'bad'}">
    <div class="balloon">${a.correct ? '🎈🎉🎈' : '😔🌱'}</div>
    <h1>${a.correct ? t('correctTitle') : t('wrongTitle')}</h1>
    <p><b>${t('yourAnswer')}</b> ${esc(a.answer || t('noAnswer'))}</p>
    <p><b>${t('correctAnswerLabel')}</b> ${esc(q.answer)}</p>
    <h3>${t('ruleHeading')}</h3>
    ${ruleHtml}
    ${story}
    ${timeNote}
    <p><small>${t('timeSpent', { s: (a.durationMs / 1000).toFixed(1) })}</small></p>
    <button id="next">${t('nextBtn')}</button>
  </section></main>`;

  $('#next').onclick = () => {
    const s = state.session;
    s.index++;
    if (s.index >= s.questions.length) return finish();
    showQuestion();
  };
}

function finish() {
  clearTimers();
  const s = state.session;
  const ok = s.answers.filter(x => x.correct).length;
  const total = s.answers.length;
  const pct = total ? Math.round((ok / total) * 100) : 0;

  const db = loadDb();
  if (s.mode === 'subject') {
    db.rounds.push({
      id: `${state.learnerKey}-${Date.now()}`,
      learnerKey: state.learnerKey,
      displayName: state.displayName,
      subject: s.subject,
      correct: ok,
      total,
      scorePct: pct,
      startedAt: new Date(s.startedAt).toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - s.startedAt,
      // Ties this round to the attempt records it already covers, so learnerSummary can add
      // this round's totals without re-counting those same attempts (see docs/ARCHITECTURE.md #5).
      attemptIds: s.answers.map(a => a.id)
    });
    saveDb(db);
  }

  // The game chosen up front (gamePicker) is only offered now, once the round's budget is in,
  // and only if the kid actually picked one — declining stays available either way.
  const budget = normalizeBudget(db.learners[state.learnerKey]?.gameTimeBudget);
  const offerGame = s.chosenGameId && budget > 0;
  const gameOfferHtml = offerGame ? `
    <p class="game-offer">${t('playGamePrompt', { s: budget, game: esc(gameName(s.chosenGameId)) })}</p>
    <p><button id="playGame">${t('playGameBtn')}</button></p>` : '';

  app.innerHTML = `<main class="shell"><section class="hero">
    <div class="logo">🏆</div>
    <h1>${t('scoreTitle', { name: esc(state.displayName), pct })}</h1>
    <h2>${t('correctOf', { ok, total })}</h2>
    <table><tr><th>${t('colTopic')}</th><th>${t('colResult')}</th><th>${t('colTime')}</th></tr>
      ${s.answers.map(a => `<tr><td>${esc(topicLabel(a.topic))}</td><td>${a.correct ? '✅' : '❌'}</td><td>${(a.durationMs / 1000).toFixed(1)}${t('unitSeconds')}</td></tr>`).join('')}
    </table>
    ${gameOfferHtml}
    <p><button id="again">${t('againBtn')}</button> <button id="rep" class="secondary">${t('progressBtn')}</button></p>
  </section></main>`;
  $('#again').onclick = home;
  $('#rep').onclick = report;
  if (offerGame) $('#playGame').onclick = () => playGame(s.chosenGameId);
  Log.info('session.finish', { learnerKey: state.learnerKey, mode: s.mode, score: pct, budget });
}

/* ---------- end-of-round mini-games ---------- */

// Adapts a game's storage.load/save calls onto this learner's slot in the main DB, so durable
// per-game progress (score, level, etc.) lives inside the existing lernquest-v1 store instead
// of the game's own default localStorage key.
function gameStorageAdapter(learnerKey, gameId) {
  return {
    load: () => loadDb().learners[learnerKey]?.games?.[gameId] || null,
    save: (_key, value) => {
      const db = loadDb();
      const learner = ensureLearner(db, learnerKey, state.displayName);
      learner.games ??= {};
      learner.games[gameId] = value;
      saveDb(db);
    }
  };
}

// Mounts the chosen game module into the screen and wires its events back into LernQuest:
// budget syncs on every pause, and a budget-exhausted pause returns home after a short beat.
function playGame(gameId) {
  clearTimers();
  const db = loadDb();
  const learner = ensureLearner(db, state.learnerKey, state.displayName);
  const budget = normalizeBudget(learner.gameTimeBudget);
  if (budget <= 0) return home();
  learner.lastGameId = gameId;
  saveDb(db);

  const link = document.createElement('link');
  link.id = 'game-style';
  link.rel = 'stylesheet';
  link.href = `src/games/${gameId}/styles.css`;
  document.head.appendChild(link);

  app.innerHTML = `<main class="shell"><section class="card">
    <div class="row" style="justify-content:space-between">
      <b>${esc(state.displayName)} · ${esc(gameName(gameId))}</b>
      <button id="backToApp" class="secondary">${t('backToAppBtn')}</button>
    </div>
    <div id="game-mount"></div>
  </section></main>`;
  $('#backToApp').onclick = home;

  import(`./games/${gameId}/game.js`).then(({ createGame }) => {
    const game = createGame($('#game-mount'), {
      playerId: state.learnerKey,
      sessionId: crypto.randomUUID?.() || String(Date.now()),
      timeBudgetSec: budget,
      storage: gameStorageAdapter(state.learnerKey, gameId),
      logger: (event, data = {}) => Log.info(`game.${event}`, { gameId, learnerKey: state.learnerKey, ...data }),
      labels: gameLabels(gameId),
      onEvent(name, detail) {
        if (name !== 'game:paused') return;
        syncGameBudget(detail.remainingSec);
        if (detail.reason === 'budget_exhausted') {
          state.gameReturnTimer = setTimeout(() => { state.gameReturnTimer = null; home(); }, 1500);
        }
      }
    });
    state.activeGame = game;
    game.start();
    // Ticks the stored budget down live so a mid-game reload can't refund elapsed time.
    state.gameBudgetSyncTimer = setInterval(() => {
      if (state.activeGame) syncGameBudget(state.activeGame.remaining);
    }, 1000);
    state.gamePageHideHandler = () => { if (state.activeGame) syncGameBudget(state.activeGame.remaining); };
    window.addEventListener('pagehide', state.gamePageHideHandler);
  }).catch(e => {
    Log.error('game.load', e);
    home();
  });
}

// Keeps the stored budget matching the game's own live remaining time as it plays.
function syncGameBudget(remainingSec) {
  const db = loadDb();
  const learner = ensureLearner(db, state.learnerKey, state.displayName);
  learner.gameTimeBudget = floorGameBudget(remainingSec);
  saveDb(db);
}

function report() {
  clearTimers();
  const db = loadDb();
  const key = state.learnerKey;
  const rows = db.attempts.filter(a => !key || a.learnerKey === key);
  const rounds = db.rounds.filter(r => !key || r.learnerKey === key);
  const ok = rows.filter(x => x.correct).length;
  const vocabMap = (key && db.vocab[key]) || {};
  const budgets = key
    ? { [key]: safeNum(db.learners[key]?.gameTimeBudget, 0, 0) }
    : Object.fromEntries(Object.values(db.learners).map(l => [l.key, safeNum(l.gameTimeBudget, 0, 0)]));
  const heading = t('reportHeading', { forName: key ? t('reportForName', { name: esc(state.displayName) }) : '' });

  app.innerHTML = `<main class="shell"><section class="card">
    <h1>${heading}</h1>
    <p>${t('reportStats', { attempts: rows.length, pct: rows.length ? Math.round((ok / rows.length) * 100) : 0, vocab: Object.keys(vocabMap).length })}</p>
    <div class="row">
      <button id="export">${t('exportJsonBtn')}</button>
      <button id="csv" class="secondary">${t('exportCsvBtn')}</button>
      <button id="back" class="secondary">${t('backBtn')}</button>
    </div>
    <p><small>${t('staticNote')}</small></p>
  </section></main>`;

  $('#back').onclick = home;
  $('#export').onclick = () => download(
    `${safe(state.displayName || 'all')}-progress.json`,
    JSON.stringify({
      exportedAt: new Date().toISOString(),
      learnerKey: key,
      rounds,
      attempts: rows,
      vocab: vocabMap,
      gameTimeBudgets: budgets
    }, null, 2),
    'application/json'
  );
  $('#csv').onclick = () => download(
    `${safe(state.displayName || 'all')}-progress.csv`,
    buildCsv(rows, rounds, vocabMap, budgets),
    'text/csv'
  );
}

// One CSV file, sectioned with a comment + header row per record type, so a spreadsheet
// import still carries attempts, rounds, vocab mastery, and game-time budgets together.
function buildCsv(rows, rounds, vocabMap, budgets) {
  const section = (title, header, dataRows) =>
    [`# ${title}`, header.map(csv).join(','), ...dataRows.map(r => r.map(csv).join(','))].join('\n');

  return [
    section('attempts', ['learnerKey', 'displayName', 'questionId', 'subject', 'topic', 'correct', 'durationMs', 'at'],
      rows.map(x => [x.learnerKey, x.displayName, x.questionId, x.subject, x.topic, x.correct, x.durationMs, x.at])),
    section('rounds', ['learnerKey', 'displayName', 'subject', 'correct', 'total', 'scorePct', 'startedAt', 'finishedAt', 'durationMs'],
      rounds.map(r => [r.learnerKey, r.displayName, r.subject, r.correct, r.total, r.scorePct, r.startedAt, r.finishedAt, r.durationMs])),
    section('vocab', ['word', 'lookups', 'correctCount', 'mastered', 'lastAt'],
      Object.entries(vocabMap).map(([word, v]) => [word, v.lookups, v.correctCount, v.mastered, v.lastAt])),
    section('gameTimeBudgets', ['learnerKey', 'gameTimeBudget'],
      Object.entries(budgets).map(([k, v]) => [k, v]))
  ].join('\n\n');
}

function wordLookup(e) {
  const el = e.target.closest('.word');
  if (!el) return;
  const raw = el.dataset.word.toLowerCase();
  const dictEntry = normalizeDictEntry(state.dict[raw]);
  const learnerKey = state.learnerKey || 'anonymous';

  const db = loadDb();
  const bucket = db.vocab[learnerKey] ??= {};
  const vocabEntry = bucket[raw] ??= { correctCount: 0, lookups: 0, mastered: false, lastAt: null };
  vocabEntry.lookups++;
  vocabEntry.lastAt = new Date().toISOString();
  saveDb(db);

  const examplesBlock = (label, items, dir) => items.length
    ? `<p class="dialog-ex-label"><b>${esc(label)}</b></p><ul${dir ? ` dir="${dir}"` : ''}>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
    : '';

  const dlg = document.createElement('dialog');
  dlg.innerHTML = dictEntry
    ? `<h2>📚 ${esc(raw)}</h2>
       <p><b>${t('dialogGerman')}</b> ${esc(dictEntry.de)}</p>
       <p dir="rtl"><b>${t('dialogArabic')}</b> ${esc(dictEntry.ar)}</p>
       ${examplesBlock(t('dialogExamplesDe'), dictEntry.examplesDe)}
       ${examplesBlock(t('dialogExamplesAr'), dictEntry.examplesAr, 'rtl')}
       <button>${t('closeBtn')}</button>`
    : `<h2>📚 ${esc(raw)}</h2><p>${esc(t('dialogUnknown'))}</p><button>${t('closeBtn')}</button>`;
  document.body.appendChild(dlg);
  dlg.querySelector('button').onclick = () => dlg.close();
  dlg.onclose = () => dlg.remove();
  dlg.showModal();
  Log.info('vocab.lookup', { word: raw, found: !!dictEntry });
}


async function boot() {
  try {
    const db = loadDb();
    state.lang = db.settings?.lang || 'de';
    state.settings.miniGames = db.settings?.miniGames ?? true;
    saveDb(db); // persist migration/defaults immediately

    [state.bank, state.dict] = await Promise.all([
      fetch('data/questions.json').then(r => r.json()),
      fetch('data/dictionary.json').then(r => r.json())
    ]);
    document.documentElement.lang = state.lang;
    home();
    document.addEventListener('dblclick', wordLookup);
    Log.info('app.ready', { questions: state.bank.length });
  } catch (e) {
    app.innerHTML = `<div class="shell"><div class="card">${esc(t('loadError'))}</div></div>`;
    Log.error('app.boot', e);
  }
}

boot();

// Node-only export hook for throwaway test scripts (logs/Agent_working_txt/); a <script src>
// load in the browser has no `module`, so this branch never runs there.
if (typeof module !== 'undefined') {
  module.exports = { migrateIfNeeded, ensureLearner, learnerSummary, buildCsv, selectQuestions, pickWithCaps, state };
}
