/* Masri App — мини-приложение Telegram для изучения египетского арабского.
   Данные и прогресс берутся из API бота (общая база progress.db). */
(() => {
'use strict';

// =========================================================
// Telegram + настройки
// =========================================================
const tg = window.Telegram && window.Telegram.WebApp;
const params = new URLSearchParams(location.search);
const API = (() => {
  let url = params.get('api');
  try {
    if (url) localStorage.setItem('masri_api', url);
    else url = localStorage.getItem('masri_api');
  } catch (e) { /* хранилище может быть недоступно */ }
  return (url || '').replace(/\/+$/, '');
})();
const INIT_DATA = (tg && tg.initData) || '';
const QUIZ_LENGTH = 10;
const TIMED_SECONDS = 60;

const A = 'assets/';
const STICK = {
  otlichno: A + 'otlichno.webp', bravo: A + 'bravo.webp', kruto: A + 'kruto.webp',
  tak: A + 'tak_derzhat.webp', podumai: A + 'podumai.webp', podouchit: A + 'podouchit.webp',
  nepravilno: A + 'nepravilno.webp', spasibo: A + 'spasibo.webp',
};
const GOOD = [['otlichno', 'Отлично!'], ['bravo', 'Браво!'], ['kruto', 'Круто!'], ['tak', 'Так держать!']];

function setupTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor('#173B2C'); } catch (e) {}
  try { tg.setBackgroundColor('#F5EEE2'); } catch (e) {}
  try { tg.setBottomBarColor && tg.setBottomBarColor('#F5EEE2'); } catch (e) {}
  try { tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {}
  if (tg.BackButton) tg.BackButton.onClick(() => back());
}
const haptic = {
  ok() { try { tg.HapticFeedback.notificationOccurred('success'); } catch (e) {} },
  bad() { try { tg.HapticFeedback.notificationOccurred('error'); } catch (e) {} },
  tap() { try { tg.HapticFeedback.impactOccurred('light'); } catch (e) {} },
};

// =========================================================
// Утилиты
// =========================================================
const $app = document.getElementById('app');
const $overlay = document.getElementById('overlay');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hasArabic = (s) => /[\u0600-\u06FF]/.test(s);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const plural = (n, one, few, many) => { const m10 = n % 10, m100 = n % 100; return (m10 === 1 && m100 !== 11) ? one : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) ? few : many; };

const ICON = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
  game: '<rect x="2" y="7" width="20" height="10" rx="5"/><path d="M7 10v4M5 12h4"/><path d="M16 11h.01M18 13h.01"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>',
  flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.5 1 2.5 2 3 .5-3-.5-5.5.5-8z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  q: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  swap: '<path d="M7 4L3 8l4 4"/><path d="M3 8h14"/><path d="M17 20l4-4-4-4"/><path d="M21 16H7"/>',
  shuffle: '<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
  send: '<path d="M4 12l16-8-6 16-2-7z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
};
const ic = (name, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICON[name]}</svg>`;

function toast(text, ms = 2200) {
  const el = document.createElement('div');
  el.className = 'toast m-rise';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
function stickerToast(key, alt, ms = 1100) {
  const el = document.createElement('div');
  el.className = 'sticker-toast';
  el.innerHTML = `<img class="m-pop" src="${STICK[key]}" alt="${esc(alt)}">`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// =========================================================
// API
// =========================================================
class ApiError extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }

async function api(path, body) {
  let res;
  try {
    res = await fetch(API + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Authorization': 'tma ' + INIT_DATA, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError(0, 'network');
  }
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new ApiError(res.status, data.error || 'error');
  if (data.profile) applyProfile(data.profile, data.level_up);
  return data;
}

function apiFail(err) {
  if (err.status === 401) return showFatal('session');
  if (err.status === 0) return toast('Нет связи с сервером. Проверь интернет и попробуй ещё раз.');
  if (err.status === 429) return toast('Слишком много действий подряд. Подожди немного.');
  toast('Что-то пошло не так. Попробуй ещё раз.');
}

// =========================================================
// Состояние
// =========================================================
const S = {
  user: null, profile: null, words: new Map(), wordList: [], categories: [], catDiff: {},
  dialogues: [], materials: [], wod: null, aiEnabled: false, donatePresets: [10, 50, 100, 250],
};

function applyProfile(p, levelUp) {
  const prev = S.profile;
  S.profile = p;
  S.fav = new Set(p.favorites);
  if (levelUp && prev) setTimeout(() => showLevelUp(p.level), 700);
}

function W(i) { return S.words.get(i); }
function difficultyPool() {
  const d = S.profile.difficulty;
  const list = d === 'все' ? S.wordList : S.wordList.filter((w) => w.diff === d);
  return (list.length ? list : S.wordList).map((w) => w.i);
}

let audioEl = null;
function playAudio(idx) {
  const w = W(idx);
  if (!w || !w.audio) { toast('Для этого слова пока нет озвучки'); return; }
  haptic.tap();
  try { if (audioEl) audioEl.pause(); } catch (e) {}
  audioEl = new Audio(`${API}/api/audio/${idx}`);
  audioEl.play().catch(() => toast('Не удалось воспроизвести звук'));
}

// =========================================================
// Навигация
// =========================================================
let stack = [];
let cleanup = null;

function go(name, p = {}, replace = false) {
  if (replace) stack.pop();
  stack.push({ name, p });
  render();
}
function back() {
  if (stack.length > 1) { stack.pop(); render(); }
}
function home() { stack = [{ name: 'home', p: {} }]; render(); }
function tab(name) { stack = [{ name, p: {} }]; render(); }

function render() {
  if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
  const cur = stack[stack.length - 1];
  const view = SCREENS[cur.name];
  $app.innerHTML = view.html(cur.p);
  window.scrollTo(0, 0);
  if (view.mount) cleanup = view.mount(cur.p) || null;
  if (tg && tg.BackButton) {
    if (stack.length > 1) tg.BackButton.show(); else tg.BackButton.hide();
  }
}

const tabbar = (on) => `
  <nav class="tabbar" aria-label="Разделы">
    ${[['home', 'home', 'Главная'], ['learn', 'book', 'Учить'], ['games', 'game', 'Игры'], ['stats', 'chart', 'Прогресс']].map(([id, icon, label]) =>
      `<button class="${on === id ? 'on' : ''}" data-act="tab" data-to="${id}" aria-label="${label}" ${on === id ? 'aria-current="page"' : ''}>${ic(icon)}<span>${label}</span></button>`).join('')}
  </nav>`;

const backBtn = (dark = true) => `<button class="icon-btn ${dark ? '' : 'light'}" data-act="back" aria-label="Назад">${ic('back')}</button>`;

// Обработчик всех кликов: элементы с data-act
const ACTIONS = {};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});
Object.assign(ACTIONS, {
  back: () => back(),
  tab: (d) => tab(d.to),
  go: (d) => go(d.to, d.p ? JSON.parse(d.p) : {}),
  play: (d, el, e) => { e.stopPropagation(); playAudio(Number(d.idx)); },
  donate: () => openDonate(),
  closeOverlay: () => closeOverlay(),
});

// =========================================================
// Экраны
// =========================================================
const SCREENS = {};

// ---------- Приветствие ----------
SCREENS.welcome = {
  html: () => `
  <div class="screen dark pattern welcome">
    <div class="glow m-glow"></div>
    <span class="ar m-rise" lang="ar">أهلاً وسهلاً</span>
    <div class="mascot-wrap"><div class="m-pop" style="animation-delay:.1s"><div class="m-bob"><img class="mascot m-wave" src="${A}mascot.webp" alt="Масри, талисман приложения, машет рукой"></div></div></div>
    <div class="m-rise" style="animation-delay:.35s"><h1>Учим египетский арабский</h1><p>Легко и с удовольствием, на живом диалекте</p></div>
    <div class="stack feats" style="width:100%;gap:8px">
      ${[['sound', 'Слова и выражения с озвучкой'], ['chat', 'Диалоги на живом египетском'], ['game', 'Квизы и повторение для прогресса']].map(([i, t], k) =>
        `<div class="feat m-rise" style="animation-delay:${0.55 + k * 0.1}s"><span class="ico">${ic(i)}</span>${t}</div>`).join('')}
    </div>
    <button class="btn gold cta m-rise" style="animation-delay:.9s" data-act="startApp">Начать ${ic('next')}</button>
  </div>`,
};
ACTIONS.startApp = () => { try { localStorage.setItem('masri_welcomed', '1'); } catch (e) {} haptic.ok(); home(); };

// ---------- Главная ----------
SCREENS.home = {
  html: () => {
    const p = S.profile, w = W(S.wod), due = p.due.length;
    const tile = (to, icon, tint, title, sub, badge, params) =>
      `<button class="tile" data-act="go" data-to="${to}" ${params ? `data-p='${esc(JSON.stringify(params))}'` : ''}>
        <span class="top"><span class="ico ${tint}">${ic(icon)}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</span>
        <span><b>${title}</b><small>${sub}</small></span></button>`;
    return `
    <div class="screen has-tabs">
      <header class="hero tall pattern">
        <div class="home-hero-row">
          <div class="stack" style="gap:6px;padding-bottom:10px">
            <span class="hello">Ахлан, ${esc(S.user.first_name || 'друг')}!</span>
            <span class="brand">Masri</span>
            <span class="ar" lang="ar" style="align-self:flex-start">اتعلّم مصري</span>
            <span class="pill gold" style="align-self:flex-start;margin-top:4px">${ic('flame')}${p.streak} ${plural(p.streak, 'день', 'дня', 'дней')}</span>
          </div>
          <div class="m-bob"><img class="mascot-hero m-wave" src="${A}mascot.webp" alt="Масри"></div>
        </div>
        <button class="level-link" data-act="tab" data-to="stats">
          <span class="row"><b>Уровень ${p.level}</b><span>${p.xp_in} / ${p.xp_need} XP</span></span>
          <span class="bar"><i style="width:${Math.round(p.xp_in / p.xp_need * 100)}%"></i></span>
        </button>
      </header>
      ${w ? `
      <button class="wod m-pop" style="animation-delay:.15s" data-act="go" data-to="cards" data-p='${esc(JSON.stringify({ source: 'single', idx: w.i, title: 'Слово дня' }))}'>
        <span class="label">Слово дня</span>
        <span class="ar" lang="ar">${esc(w.ar)}</span>
        <span class="tr">${esc(w.tr)}</span>
        <span class="ru-row"><span class="ru">${esc(w.ru)}</span>
          ${w.audio ? `<span class="round-play" role="button" aria-label="Послушать" data-act="play" data-idx="${w.i}">${ic('sound')}</span>` : ''}</span>
      </button>` : ''}
      <div class="pad stack">
        <h2 class="section-title">Учиться</h2>
        <div class="tiles">
          ${tile('cards', 'book', 'nile', 'Слово', 'Случайные карточки', '', { source: 'random', title: 'Случайные слова' })}
          ${tile('learn', 'folder', 'sand', 'Категории', `${S.categories.length} ${plural(S.categories.length, 'тема', 'темы', 'тем')}`)}
          ${tile('review', 'repeat', 'terra', 'Повторение', due ? 'Пора повторить' : 'Всё повторено', due || '')}
          ${tile('cards', 'star', 'sand', 'Избранное', `${p.favorites.length} ${plural(p.favorites.length, 'слово', 'слова', 'слов')}`, '', { source: 'favorites', title: 'Избранное' })}
          ${tile('dialogues', 'chat', 'nile', 'Диалоги', 'Живые ситуации')}
          ${tile('materials', 'doc', 'terra', 'Материалы', 'Грамматика')}
        </div>
        <div class="ai-row">
          ${S.aiEnabled ? `<button class="ai-tile pattern" data-act="go" data-to="ai"><img src="${A}mascot.webp" alt=""><span><b>ИИ ассистент</b><small>Спроси Масри что угодно</small></span></button>` : ''}
          <button class="heart-btn" data-act="donate" aria-label="Поддержать проект" ${S.aiEnabled ? '' : 'style="flex-grow:1;width:auto;min-height:60px"'}>${ic('heart')}</button>
        </div>
      </div>
      ${tabbar('home')}
    </div>`;
  },
};

// ---------- Учить: категории ----------
SCREENS.learn = {
  html: () => {
    const groups = ['начальный', 'средний', 'продвинутый'];
    const counts = {};
    S.wordList.forEach((w) => { counts[w.cat] = (counts[w.cat] || 0) + 1; });
    const item = (c) => `
      <button class="list-item" data-act="go" data-to="category" data-p='${esc(JSON.stringify({ cat: c }))}'>
        <span class="txt"><b>${esc(c[0].toUpperCase() + c.slice(1))}</b><small>${counts[c] || 0} ${plural(counts[c] || 0, 'слово', 'слова', 'слов')}</small></span>${ic('chev', 'class="chev"')}
      </button>`;
    return `
    <div class="screen has-tabs">
      <div class="light-top"><h1>Категории</h1><p>Выбери тему: карточки или квиз</p></div>
      <div class="pad stack" style="margin-top:12px">
        ${groups.map((g) => {
          const cats = S.categories.filter((c) => S.catDiff[c] === g);
          return cats.length ? `<h2 class="section-title" style="font-size:19px;margin-top:10px">${g[0].toUpperCase() + g.slice(1)} уровень</h2>${cats.map(item).join('')}` : '';
        }).join('')}
      </div>
      ${tabbar('learn')}
    </div>`;
  },
};

SCREENS.category = {
  html: ({ cat }) => {
    const n = S.wordList.filter((w) => w.cat === cat).length;
    const title = cat[0].toUpperCase() + cat.slice(1);
    return `
    <div class="screen">
      <header class="hero pattern"><div class="topbar">${backBtn()}<div class="title"><h1>${esc(title)}</h1><span class="sub">${n} ${plural(n, 'слово', 'слова', 'слов')} · ${esc(S.catDiff[cat] || '')}</span></div></div></header>
      <div class="pad stack" style="margin-top:18px">
        <button class="list-item" data-act="go" data-to="cards" data-p='${esc(JSON.stringify({ source: 'category', cat, title }))}'>
          <span class="ico nile">${ic('book')}</span><span class="txt"><b>Карточки</b><small>Листай и запоминай, переворачивай для перевода</small></span>${ic('chev', 'class="chev"')}</button>
        <button class="list-item" data-act="go" data-to="quiz" data-p='${esc(JSON.stringify({ source: 'category', cat, direction: 'forward', title }))}'>
          <span class="ico sand">${ic('q')}</span><span class="txt"><b>Квиз: арабский → русский</b><small>${QUIZ_LENGTH} вопросов</small></span>${ic('chev', 'class="chev"')}</button>
        <button class="list-item" data-act="go" data-to="quiz" data-p='${esc(JSON.stringify({ source: 'category', cat, direction: 'reverse', title }))}'>
          <span class="ico terra">${ic('swap')}</span><span class="txt"><b>Квиз: русский → арабский</b><small>${QUIZ_LENGTH} вопросов</small></span>${ic('chev', 'class="chev"')}</button>
      </div>
    </div>`;
  },
};

// ---------- Повторение ----------
SCREENS.review = {
  html: () => {
    const due = S.profile.due.filter((i) => W(i));
    if (!due.length) {
      return `<div class="screen"><header class="hero pattern"><div class="topbar">${backBtn()}<div class="title"><h1>Повторение</h1></div></div></header>
        <div class="center-screen" style="min-height:auto;flex-grow:1">
          <img class="m-pop" src="${STICK.tak}" alt="Масри: «Так держать!»">
          <h2>Всё повторено</h2>
          <p>Слова, в которых ты ошибаешься, появятся здесь, когда придёт время их повторить.</p>
          <button class="btn night" data-act="go" data-to="cards" data-p='${esc(JSON.stringify({ source: 'random', title: 'Случайные слова' }))}'>Учить новые слова</button>
        </div></div>`;
    }
    return `
    <div class="screen">
      <header class="hero pattern"><div class="topbar">${backBtn()}<div class="title"><h1>Повторение</h1><span class="sub">${due.length} ${plural(due.length, 'слово ждёт', 'слова ждут', 'слов ждут')} повторения</span></div></div></header>
      <div class="pad stack" style="margin-top:18px">
        <button class="list-item" data-act="go" data-to="quiz" data-p='${esc(JSON.stringify({ source: 'review', direction: 'forward', title: 'Повторение' }))}'>
          <span class="ico terra">${ic('q')}</span><span class="txt"><b>Повторить квизом</b><small>Лучший способ закрепить слово</small></span>${ic('chev', 'class="chev"')}</button>
        <button class="list-item" data-act="go" data-to="cards" data-p='${esc(JSON.stringify({ source: 'review', title: 'Повторение' }))}'>
          <span class="ico nile">${ic('book')}</span><span class="txt"><b>Повторить карточками</b><small>Знаю — слово уходит на более долгий интервал</small></span>${ic('chev', 'class="chev"')}</button>
      </div>
    </div>`;
  },
};

// ---------- Карточки ----------
function buildCardQueue(p) {
  if (p.source === 'single') return [p.idx];
  if (p.source === 'category') return shuffle(S.wordList.filter((w) => w.cat === p.cat).map((w) => w.i));
  if (p.source === 'favorites') return shuffle(S.profile.favorites.filter((i) => W(i)));
  if (p.source === 'review') return shuffle(S.profile.due.filter((i) => W(i)));
  return null; // random — бесконечно
}

SCREENS.cards = {
  html: (p) => {
    if (!p._q) { p._q = buildCardQueue(p); p._pos = 0; p._known = 0; }
    if (p._q && !p._q.length) {
      const fav = p.source === 'favorites';
      return `<div class="screen dark pattern"><div class="light-top" style="padding-bottom:0"><div class="topbar">${backBtn()}</div></div>
        <div class="center-screen" style="min-height:auto;flex-grow:1;color:#fff">
          <img class="m-pop" src="${STICK.podumai}" alt="Масри: «Подумай!»">
          <h2>${fav ? 'В избранном пока пусто' : 'Здесь пока нет слов'}</h2>
          <p style="color:var(--on-night)">${fav ? 'Нажимай на звёздочку на карточке слова, и оно появится здесь.' : 'Попробуй другой раздел.'}</p>
          <button class="btn gold" data-act="go" data-to="cards" data-p='${esc(JSON.stringify({ source: 'random', title: 'Случайные слова' }))}'>Открыть случайные слова</button>
        </div></div>`;
    }
    const total = p._q ? p._q.length : null;
    return `
    <div class="screen dark pattern" style="padding-bottom:calc(20px + var(--safe-bottom))">
      <div style="padding:calc(18px + var(--safe-top)) 18px 0" class="stack">
        <div class="topbar">${backBtn()}<div class="title"><h1>${esc(p.title || 'Слова')}</h1><span class="sub" id="cardSub"></span></div>
          <span class="pill gold" id="knownPill">Знаю: ${p._known}</span></div>
        ${total ? `<div class="bar"><i id="cardBar" style="width:0%"></i></div>` : ''}
      </div>
      <div class="card-stage" id="stage"></div>
      <div class="pad row-btns">
        <button class="btn again" data-act="cardAgain">${ic('back')}Повторить</button>
        <button class="btn fav-btn" id="favBtn" data-act="cardFav" aria-label="В избранное">${ic('star')}</button>
        <button class="btn gold" data-act="cardKnow">Знаю ${ic('next')}</button>
      </div>
    </div>`;
  },
  mount: (p) => {
    p._busy = false;
    drawCard(p, false);
    const stage = document.getElementById('stage');
    if (!stage) return;
    // Свайп пальцем
    let startX = 0, dx = 0, dragging = false, moved = false;
    const down = (e) => {
      if (p._busy || e.target.closest('button')) return;
      dragging = true; moved = false; startX = e.clientX; dx = 0;
      const sw = stage.querySelector('.card-swipe'); if (sw) sw.classList.add('dragging');
    };
    const move = (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      const sw = stage.querySelector('.card-swipe');
      if (sw) sw.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      const sw = stage.querySelector('.card-swipe');
      if (sw) { sw.classList.remove('dragging'); sw.style.transform = ''; }
      if (Math.abs(dx) > 90) decideCard(p, dx > 0);
      else if (!moved) flipCard();
    };
    stage.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  },
};

function currentCardIdx(p) {
  if (!p._q) { if (p._cur == null) p._cur = pick(difficultyPool()); return p._cur; }
  return p._q[p._pos];
}
function drawCard(p, enter) {
  const stage = document.getElementById('stage');
  if (!stage) return;
  const idx = currentCardIdx(p), w = W(idx);
  if (!w) return;
  stage.innerHTML = `
    <div class="card-swipe ${enter ? 'enter' : ''}">
      <div class="card-flip" id="flip">
        <div class="face">
          <span class="cat">${esc(w.cat)}</span>
          <span class="ar big" lang="ar">${esc(w.ar)}</span>
          <span class="tr">${esc(w.tr)}</span>
          <button class="play-big" data-act="play" data-idx="${w.i}" aria-label="Послушать произношение" ${w.audio ? '' : 'disabled'}>${ic('sound')}</button>
          <span class="hint">${ic('repeat')}Нажми на карточку или смахни</span>
        </div>
        <div class="face back">
          <span class="cat">Перевод</span>
          <span class="ru big">${esc(w.ru)}</span>
          <span class="diamond"><i></i><b></b><i></i></span>
          <span class="ar" lang="ar" style="font-size:30px;font-weight:700;color:var(--night)">${esc(w.ar)}</span>
          <span class="tr" style="font-size:16px">${esc(w.tr)}</span>
          <span class="hint">Смахни вправо — знаю, влево — повторить</span>
        </div>
      </div>
    </div>`;
  if (enter) requestAnimationFrame(() => requestAnimationFrame(() => { const s = stage.querySelector('.card-swipe'); if (s) s.classList.remove('enter'); }));
  const sub = document.getElementById('cardSub');
  if (sub) sub.textContent = p._q ? `${Math.min(p._pos + 1, p._q.length)} из ${p._q.length}` : (S.profile.difficulty === 'все' ? 'Все уровни' : `Уровень: ${S.profile.difficulty}`);
  const bar = document.getElementById('cardBar');
  if (bar && p._q) bar.style.width = `${(p._pos / p._q.length) * 100}%`;
  const fav = document.getElementById('favBtn');
  if (fav) { const on = S.fav.has(idx); fav.classList.toggle('on', on); fav.setAttribute('aria-pressed', on ? 'true' : 'false'); }
}
function flipCard() { const f = document.getElementById('flip'); if (f) { f.classList.toggle('flipped'); haptic.tap(); } }

function decideCard(p, known) {
  if (p._busy) return;
  p._busy = true;
  const idx = currentCardIdx(p);
  const sw = document.querySelector('#stage .card-swipe');
  if (sw) sw.classList.add(known ? 'out-right' : 'out-left');
  if (known) { p._known++; const g = GOOD[p._known % GOOD.length]; stickerToast(g[0], 'Масри: ' + g[1]); haptic.ok(); }
  else { stickerToast('podouchit', 'Масри: Ещё нужно подучить'); haptic.tap(); }
  const pill = document.getElementById('knownPill'); if (pill) pill.textContent = `Знаю: ${p._known}`;
  api('/api/card', { idx, known }).catch(apiFail);
  setTimeout(() => {
    if (p._q) {
      p._pos++;
      if (p._pos >= p._q.length) { p._busy = false; go('cardsDone', { known: p._known, total: p._q.length, from: p }, true); return; }
    } else {
      let next; const pool = difficultyPool();
      do { next = pick(pool); } while (pool.length > 1 && next === p._cur);
      p._cur = next;
    }
    drawCard(p, true);
    p._busy = false;
  }, 400);
}
ACTIONS.cardKnow = () => { const cur = stack[stack.length - 1]; if (cur.name === 'cards') decideCard(cur.p, true); };
ACTIONS.cardAgain = () => { const cur = stack[stack.length - 1]; if (cur.name === 'cards') decideCard(cur.p, false); };
ACTIONS.cardFav = () => {
  const cur = stack[stack.length - 1]; if (cur.name !== 'cards') return;
  const idx = currentCardIdx(cur.p), on = !S.fav.has(idx);
  if (on) S.fav.add(idx); else S.fav.delete(idx);
  const fav = document.getElementById('favBtn');
  if (fav) { fav.classList.toggle('on', on); fav.classList.remove('m-pulse'); void fav.offsetWidth; fav.classList.add('m-pulse'); }
  haptic.tap();
  toast(on ? 'Добавлено в избранное' : 'Убрано из избранного', 1400);
  api('/api/favorite', { idx, on }).catch(apiFail);
};

SCREENS.cardsDone = {
  html: ({ known, total }) => {
    const good = known / total >= 0.7;
    return `<div class="screen"><div class="result">
      <img class="m-pop" src="${good ? STICK.bravo : STICK.podouchit}" alt="Масри: ${good ? '«Браво!»' : '«Ещё нужно подучить»'}">
      <h2>${good ? 'Отличная серия!' : 'Хорошее начало'}</h2>
      <p>Знаешь ${known} из ${total}. ${known < total ? 'Остальные слова ждут тебя в повторении.' : 'Все слова на месте!'}</p>
      <div class="row-btns" style="width:100%;margin-top:14px">
        <button class="btn light" data-act="back">Готово</button>
        <button class="btn night" data-act="cardsAgain">Ещё раз</button>
      </div></div></div>`;
  },
};
ACTIONS.cardsAgain = () => { const cur = stack[stack.length - 1]; const from = cur.p.from; go('cards', { source: from.source, cat: from.cat, idx: from.idx, title: from.title }, true); };

// ---------- Игры ----------
SCREENS.games = {
  html: () => {
    const due = S.profile.due.length;
    const item = (icon, tint, title, sub, params, k) => `
      <button class="list-item m-rise" style="animation-delay:${0.15 + k * 0.07}s" data-act="go" data-to="quiz" data-p='${esc(JSON.stringify(params))}'>
        <span class="ico ${tint}" style="width:52px;height:52px;border-radius:16px">${ic(icon)}</span>
        <span class="txt"><b>${title}</b><small>${sub}</small></span>${ic('chev', 'class="chev"')}</button>`;
    return `
    <div class="screen has-tabs">
      <div class="light-top"><h1>Игры</h1><p>Закрепляй слова в игровом режиме</p></div>
      <div class="pad stack" style="margin-top:14px">
        <button class="list-item pattern m-pop" style="background:var(--night);color:#fff;flex-direction:column;align-items:flex-start;padding:20px;gap:14px;position:relative" data-act="go" data-to="quiz" data-p='${esc(JSON.stringify({ source: 'all', direction: 'forward', title: 'Квиз' }))}'>
          <img class="m-bob" src="${STICK.kruto}" alt="" style="position:absolute;right:4px;top:6px;width:140px;height:140px">
          <span class="ico" style="background:rgba(217,174,91,.18);color:var(--gold);width:52px;height:52px;border-radius:16px">${ic('q')}</span>
          <span class="txt" style="max-width:60%"><b style="font-size:22px">Квиз</b><small style="color:var(--on-night)">${QUIZ_LENGTH} вопросов · выбери перевод</small></span>
          <span class="btn gold" style="min-height:44px;border-radius:14px;padding:0 18px;font-size:15px">Играть ${ic('next')}</span>
        </button>
        ${item('swap', 'terra', 'Обратный квиз', 'Русский → арабский', { source: 'all', direction: 'reverse', title: 'Обратный квиз' }, 0)}
        ${item('bolt', 'sand', 'Квиз на время', `${TIMED_SECONDS} секунд — успей ответить на максимум`, { source: 'all', direction: 'forward', timed: true, title: 'Квиз на время' }, 1)}
        ${due ? item('repeat', 'nile', 'Повторение', `${due} ${plural(due, 'слово ждёт', 'слова ждут', 'слов ждут')} тебя`, { source: 'review', direction: 'forward', title: 'Повторение' }, 2) : ''}
        <p class="muted" style="font-size:13px;margin:6px 4px 0">Спринт, Найди пару, Падающие слова и Собери фразу пока доступны в боте: кнопка «🎮 Игра» → «🕹 Мини-игры».</p>
      </div>
      ${tabbar('games')}
    </div>`;
  },
};

// ---------- Квиз ----------
SCREENS.quiz = {
  html: (p) => `
    <div class="screen">
      <header class="hero pattern" style="border-radius:0 0 32px 32px">
        <div class="topbar">
          <button class="icon-btn" data-act="back" aria-label="Выйти из квиза">${ic('close')}</button>
          <div class="bar grow"><i id="qBar" style="width:0%"></i></div>
          <span id="qStep" style="font-size:14px;font-weight:800;color:var(--gold)"></span>
        </div>
        <div class="quiz-q" id="qPrompt"></div>
        <div class="score-row">
          ${p.timed ? '<span class="s timer" id="qTimer"></span>' : ''}
          <span class="s ok" id="qOk">Верно: 0</span><span class="s bad" id="qBad">Ошибок: 0</span>
          <span class="s xp" id="qXp">+0 XP</span>
        </div>
      </header>
      <div class="pad stack" style="margin-top:20px" id="qOptions"></div>
      <div class="grow"></div>
      <div class="quiz-next" id="qBottom"></div>
    </div>`,
  mount: (p) => {
    p._st = { n: 0, ok: 0, bad: 0, xp: 0, asked: [], q: null, locked: false, done: false, mistakes: 0 };
    let timer = null;
    if (p.timed) {
      p._st.deadline = Date.now() + TIMED_SECONDS * 1000;
      const tick = () => {
        const left = Math.max(0, Math.ceil((p._st.deadline - Date.now()) / 1000));
        const el = document.getElementById('qTimer'); if (el) el.textContent = `⏱ ${left} с`;
        const bar = document.getElementById('qBar'); if (bar) bar.style.width = `${(1 - left / TIMED_SECONDS) * 100}%`;
        if (left <= 0) { clearInterval(timer); finishQuiz(p); }
      };
      tick(); timer = setInterval(tick, 250);
    }
    nextQuestion(p);
    return () => { p._st.done = true; if (timer) clearInterval(timer); };
  },
};

async function nextQuestion(p) {
  const st = p._st;
  if (st.done) return;
  if (!p.timed && st.n >= QUIZ_LENGTH) return finishQuiz(p);
  st.locked = true;
  let q;
  try {
    q = await api('/api/quiz/next', { source: p.source, category: p.cat || '', direction: p.direction, exclude: st.asked.slice(-30) });
  } catch (e) { apiFail(e); return; }
  if (st.done) return;
  if (q.empty) {
    if (st.n === 0) { toast(p.source === 'review' ? 'Сейчас нечего повторять' : 'Для этого раздела нет слов'); back(); }
    else finishQuiz(p);
    return;
  }
  st.q = q; st.n++; st.asked.push(q.idx); st.locked = false;
  const rev = q.direction === 'reverse';
  const pr = document.getElementById('qPrompt');
  if (!pr) return;
  pr.innerHTML = `
    <div class="txt m-rise">
      <span class="k" id="qLabel">${rev ? 'Как сказать по-египетски?' : 'Выбери перевод'}</span>
      ${rev ? `<span class="ru">${esc(q.prompt.ru)}</span>`
            : `<span class="ar" lang="ar">${esc(q.prompt.ar)}</span><span class="tr">${esc(q.prompt.tr)}</span>`}
    </div>
    ${!rev && q.prompt.has_audio ? `<button class="round-play" style="background:rgba(217,174,91,.18)" data-act="play" data-idx="${q.idx}" aria-label="Послушать">${ic('sound')}</button>` : ''}
    <img class="sticker" id="qSticker" src="${STICK.podumai}" alt="Масри: «Подумай!»">`;
  if (!p.timed) {
    document.getElementById('qStep').textContent = `${st.n}/${QUIZ_LENGTH}`;
    document.getElementById('qBar').style.width = `${((st.n - 1) / QUIZ_LENGTH) * 100}%`;
  } else {
    document.getElementById('qStep').textContent = `№${st.n}`;
  }
  document.getElementById('qOptions').innerHTML = q.options.map((o, i) => `
    <button class="opt m-rise" style="animation-delay:${i * 0.05}s" data-act="answer" data-i="${i}">
      <span class="num">${i + 1}</span>
      ${rev ? `<span class="body"><span class="ar" lang="ar">${esc(o.text)}</span>${o.sub ? `<span class="sub">${esc(o.sub)}</span>` : ''}</span>`
            : `<span class="body ru">${esc(o.text)}</span>`}
    </button>`).join('');
  document.getElementById('qBottom').innerHTML = '';
}

ACTIONS.answer = async (d) => {
  const cur = stack[stack.length - 1]; if (cur.name !== 'quiz') return;
  const p = cur.p, st = p._st;
  if (!st || st.locked || !st.q) return;
  st.locked = true;
  const choice = Number(d.i);
  let r;
  try { r = await api('/api/quiz/answer', { qid: st.q.qid, choice }); }
  catch (e) { st.locked = false; apiFail(e); return; }
  if (st.done) return;
  const btns = document.querySelectorAll('#qOptions .opt');
  btns.forEach((b, i) => {
    const num = b.querySelector('.num');
    if (i === r.answer) { b.classList.add('right', 'm-pulse'); num.textContent = 'Верно'; }
    else if (i === choice) { b.classList.add('wrong', 'm-shake'); num.textContent = 'Неверно'; }
  });
  st.xp += r.xp_gained;
  if (r.correct) { st.ok++; haptic.ok(); } else { st.bad++; haptic.bad(); }
  document.getElementById('qOk').textContent = `Верно: ${st.ok}`;
  document.getElementById('qBad').textContent = `Ошибок: ${st.bad}`;
  const xpEl = document.getElementById('qXp');
  xpEl.innerHTML = `+${st.xp} XP${r.correct ? `<span class="xp-float m-xp">+${r.xp_gained}</span>` : ''}`;

  // Реакция Масри — прямо в шапке, на месте «Подумай!», чтобы всё помещалось на экране
  const g = GOOD[(st.ok - 1 + GOOD.length) % GOOD.length];
  const [stick, alt, ar, ru] = r.correct
    ? [g[0], g[1], 'برافو عليك!', 'Браво!']
    : ['nepravilno', 'Неправильно!', 'معلش!', 'Слово уйдёт в повторение'];
  const sticker = document.getElementById('qSticker');
  if (sticker) { sticker.src = STICK[stick]; sticker.alt = 'Масри: ' + alt; sticker.classList.remove('m-pop'); void sticker.offsetWidth; sticker.classList.add('m-pop'); }
  const label = document.getElementById('qLabel');
  if (label) label.innerHTML = `<span class="ar" lang="ar">${ar}</span> ${ru}`;
  if (label) label.classList.toggle('bad', !r.correct);

  if (p.timed) { setTimeout(() => nextQuestion(p), r.correct ? 450 : 900); return; }

  document.getElementById('qBottom').innerHTML = `
    <button class="btn night m-rise" data-act="quizNext">${st.n >= QUIZ_LENGTH ? 'Посмотреть итог' : 'Следующий вопрос'} ${ic('next')}</button>`;
};
ACTIONS.quizNext = () => { const cur = stack[stack.length - 1]; if (cur.name === 'quiz') nextQuestion(cur.p); };

function finishQuiz(p) {
  const st = p._st;
  if (st.finished) return;
  st.finished = true;
  go('quizDone', { ok: st.ok, bad: st.bad, xp: st.xp, timed: !!p.timed, from: { source: p.source, cat: p.cat, direction: p.direction, timed: p.timed, title: p.title } }, true);
}

SCREENS.quizDone = {
  html: ({ ok, bad, xp, timed }) => {
    const total = ok + bad, ratio = total ? ok / total : 0;
    const [stick, title] = ratio >= 0.8 ? ['bravo', 'Браво!'] : ratio >= 0.5 ? ['tak', 'Так держать!'] : ['podouchit', 'Ещё нужно подучить'];
    return `<div class="screen"><div class="result">
      <img class="m-pop" src="${STICK[stick]}" alt="Масри: «${title}»">
      <span class="big-num">${ok}<span style="font-size:28px;color:var(--muted)"> / ${total}</span></span>
      <h2>${timed ? `За ${TIMED_SECONDS} секунд` : 'Квиз пройден'}</h2>
      <p>+${xp} XP${bad ? ` · ${bad} ${plural(bad, 'слово', 'слова', 'слов')} добавлено в повторение` : ''}</p>
      <div class="row-btns" style="width:100%;margin-top:14px">
        <button class="btn light" data-act="back">Готово</button>
        <button class="btn night" data-act="quizAgain">Ещё раз</button>
      </div></div></div>`;
  },
};
ACTIONS.quizAgain = () => { const cur = stack[stack.length - 1]; go('quiz', { ...cur.p.from }, true); };

// ---------- Диалоги ----------
SCREENS.dialogues = {
  html: () => `
    <div class="screen">
      <header class="hero pattern"><div class="topbar">${backBtn()}<div class="title"><h1>Диалоги</h1><span class="sub">Фразы из реальных ситуаций в Египте</span></div></div></header>
      <div class="pad stack" style="margin-top:18px">
        ${S.dialogues.map((d, i) => `
          <button class="list-item" data-act="go" data-to="dialogue" data-p='${esc(JSON.stringify({ t: i }))}'>
            <span class="txt"><b>${esc(d.title)}</b><small>${d.variants.length} ${plural(d.variants.length, 'вариант', 'варианта', 'вариантов')}</small></span>${ic('chev', 'class="chev"')}</button>`).join('')}
      </div>
    </div>`,
};

SCREENS.dialogue = {
  html: (p) => {
    const d = S.dialogues[p.t];
    if (p._v == null) { p._v = Math.floor(Math.random() * d.variants.length); p._shown = 1; }
    return `
    <div class="screen">
      <header class="hero pattern" style="border-radius:0 0 28px 28px;padding-bottom:18px"><div class="topbar">${backBtn()}
        <div class="title"><h1>${esc(d.title)}</h1><span class="sub" id="dlgSub"></span></div>
        ${d.variants.length > 1 ? `<button class="icon-btn" data-act="dlgShuffle" aria-label="Другой вариант диалога">${ic('shuffle')}</button>` : ''}
      </div></header>
      <div class="chat" id="chat"></div>
      <div id="dlgDone"></div>
      <div class="pad row-btns" style="margin-top:10px">
        <button class="btn light" data-act="back">Возврат</button>
        <button class="btn night" data-act="dlgNext" id="dlgNextBtn">Дальше</button>
      </div>
    </div>`;
  },
  mount: (p) => drawDialogue(p, true),
};
function drawDialogue(p, all) {
  const d = S.dialogues[p.t], lines = d.variants[p._v];
  const chat = document.getElementById('chat');
  if (!chat) return;
  const speakers = [...new Set(lines.map((l) => l[0]))];
  const lineHtml = (l, k) => {
    const me = speakers.indexOf(l[0]) === 1;
    return `<div class="line ${me ? 'me' : ''} m-rise" style="animation-delay:${all ? k * 0.05 : 0}s">
      <span class="avatar">${esc(l[0][0] || '?')}</span>
      <div class="msg"><span class="who">${esc(l[0])}</span><span class="ar" lang="ar">${esc(l[1])}</span><span class="tr">${esc(l[2])}</span><span class="ru">${esc(l[3])}</span></div></div>`;
  };
  if (all) chat.innerHTML = lines.slice(0, p._shown).map(lineHtml).join('');
  else chat.insertAdjacentHTML('beforeend', lineHtml(lines[p._shown - 1], 0));
  const last = chat.lastElementChild; if (last && !all) last.scrollIntoView({ behavior: 'smooth', block: 'end' });
  document.getElementById('dlgSub').textContent = `Реплика ${p._shown} из ${lines.length}` + (d.variants.length > 1 ? ` · вариант ${p._v + 1}` : '');
  const done = p._shown >= lines.length;
  document.getElementById('dlgNextBtn').textContent = done ? 'Сначала' : 'Дальше';
  document.getElementById('dlgDone').innerHTML = done ? `
    <div class="done-card m-pop"><img src="${STICK.bravo}" alt="Масри: «Браво!»"><div><b>Диалог пройден!</b><small>${d.variants.length > 1 ? 'Попробуй другой вариант — кнопка вверху справа' : 'Повтори вслух, чтобы запомнить'}</small></div></div>` : '';
  if (done && !all) haptic.ok();
}
ACTIONS.dlgNext = () => {
  const cur = stack[stack.length - 1]; if (cur.name !== 'dialogue') return;
  const p = cur.p, lines = S.dialogues[p.t].variants[p._v];
  if (p._shown >= lines.length) { p._shown = 1; drawDialogue(p, true); return; }
  p._shown++; haptic.tap(); drawDialogue(p, false);
};
ACTIONS.dlgShuffle = () => {
  const cur = stack[stack.length - 1]; if (cur.name !== 'dialogue') return;
  const p = cur.p, n = S.dialogues[p.t].variants.length;
  p._v = (p._v + 1 + Math.floor(Math.random() * (n - 1))) % n; p._shown = 1; haptic.tap(); drawDialogue(p, true);
};

// ---------- Материалы ----------
function materialHtml(page) {
  // Разрешаем только <b> и <i> из исходного текста, всё остальное экранируем.
  // Арабская строка + строка перевода под ней собираются в одну «пару».
  const safe = (line) => esc(line).replace(/&lt;(\/?)(b|i)&gt;/g, '<$1$2>');
  const pureAr = (line) => hasArabic(line) && !/[A-Za-zА-Яа-яЁё]/.test(line);
  const lines = String(page).split('\n'), out = [];
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k];
    if (!line.trim()) { out.push('<div class="gap"></div>'); continue; }
    if (pureAr(line)) {
      const nxt = lines[k + 1];
      if (nxt && nxt.trim() && !pureAr(nxt)) {
        out.push(`<div class="pair"><span class="t" dir="auto">${safe(nxt)}</span><span class="ar" lang="ar">${safe(line)}</span></div>`);
        k++; continue;
      }
      out.push(`<div class="ln ar" lang="ar" dir="rtl">${safe(line)}</div>`);
      continue;
    }
    out.push(`<div class="ln" dir="auto">${safe(line)}</div>`);
  }
  return out.join('');
}
SCREENS.materials = {
  html: () => `
    <div class="screen">
      <header class="hero pattern"><div class="topbar">${backBtn()}<div class="title"><h1>Материалы</h1><span class="sub">Грамматика египетского диалекта простыми словами</span></div></div></header>
      <div class="pad stack" style="margin-top:18px">
        ${S.materials.map((m, i) => `
          <button class="list-item" data-act="go" data-to="material" data-p='${esc(JSON.stringify({ m: i, page: 0 }))}'>
            <span class="txt"><b>${esc(m.title)}</b><small>${m.pages.length} ${plural(m.pages.length, 'страница', 'страницы', 'страниц')}</small></span>${ic('chev', 'class="chev"')}</button>`).join('')}
      </div>
    </div>`,
};
SCREENS.material = {
  html: (p) => {
    const m = S.materials[p.m], n = m.pages.length;
    return `
    <div class="screen">
      <header class="hero pattern" style="padding-bottom:18px"><div class="topbar">${backBtn()}<div class="title"><h1>${esc(m.title)}</h1><span class="sub">Страница ${p.page + 1} из ${n}</span></div></div>
        <div class="bar" style="margin-top:14px"><i style="width:${((p.page + 1) / n) * 100}%"></i></div></header>
      <article class="material m-rise">${materialHtml(m.pages[p.page])}</article>
      <div class="pad row-btns">
        <button class="btn light" data-act="matPage" data-d="-1" ${p.page === 0 ? 'disabled' : ''}>${ic('back')}Назад</button>
        ${p.page < n - 1 ? `<button class="btn night" data-act="matPage" data-d="1">Дальше ${ic('next')}</button>` : `<button class="btn gold" data-act="back">Готово</button>`}
      </div>
    </div>`;
  },
};
ACTIONS.matPage = (d) => { const cur = stack[stack.length - 1]; cur.p.page += Number(d.d); haptic.tap(); render(); };

// ---------- ИИ-ассистент ----------
const aiMessages = [];
function aiText(text) {
  return esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .split('\n').map((l) => `<div class="ln" dir="auto">${l || '&nbsp;'}</div>`).join('');
}
SCREENS.ai = {
  html: () => `
    <div class="screen" style="padding-bottom:0;height:var(--tg-viewport-height,100vh);min-height:0">
      <header class="hero pattern" style="border-radius:0 0 28px 28px;padding-bottom:18px"><div class="topbar">${backBtn()}
        <div class="title"><h1>ИИ ассистент</h1><span class="sub">Переводы, грамматика, примеры</span></div>
        <button class="icon-btn" data-act="aiReset" aria-label="Начать новый разговор">${ic('trash')}</button></div></header>
      <div class="ai-chat" id="aiChat"></div>
      <form class="ai-input" id="aiForm">
        <textarea id="aiText" rows="1" placeholder="Например: как сказать «сколько стоит?»" aria-label="Сообщение"></textarea>
        <button type="submit" aria-label="Отправить">${ic('send')}</button>
      </form>
    </div>`,
  mount: () => {
    drawAi();
    const form = document.getElementById('aiForm'), ta = document.getElementById('aiText');
    form.addEventListener('submit', (e) => { e.preventDefault(); sendAi(ta.value); });
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; });
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); sendAi(ta.value); } });
  },
};
function drawAi(typing) {
  const box = document.getElementById('aiChat'); if (!box) return;
  const intro = `<div class="ai-intro m-rise"><img src="${A}mascot.webp" alt="Масри"><div class="ai-msg">Ахлан! Я Масри. Спроси, как сказать что-нибудь по-египетски, или попроси объяснить правило.</div></div>`;
  const sugg = aiMessages.length ? '' : `<div class="suggest m-rise" style="animation-delay:.2s">${['Как сказать «сколько стоит?»', 'Как спросить «как дела?» у девушки?', 'Как вежливо отказаться?'].map((s) => `<button data-act="aiSuggest" data-t="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
  box.innerHTML = intro + sugg + aiMessages.map((m) => `<div class="ai-msg ${m.me ? 'me' : ''}">${m.me ? esc(m.text).replace(/\n/g, '<br>') : aiText(m.text)}</div>`).join('')
    + (typing ? '<div class="ai-msg"><span class="typing"><i></i><i></i><i></i></span></div>' : '');
  box.scrollTop = box.scrollHeight;
}
let aiBusy = false;
async function sendAi(text) {
  text = String(text || '').trim();
  if (!text || aiBusy) return;
  aiBusy = true;
  const ta = document.getElementById('aiText'); if (ta) { ta.value = ''; ta.style.height = 'auto'; }
  aiMessages.push({ me: true, text });
  drawAi(true);
  try {
    const r = await api('/api/ai', { text });
    aiMessages.push({ me: false, text: r.text });
  } catch (e) {
    const msg = e.code === 'rate_limit' ? 'Лимит сообщений на этот час исчерпан. Попробуй чуть позже.'
      : e.code === 'ai_unavailable' ? 'ИИ сейчас перегружен. Повтори вопрос через минуту.'
      : e.status === 401 ? null : 'Не получилось отправить. Проверь интернет и повтори.';
    if (e.status === 401) { aiBusy = false; return showFatal('session'); }
    aiMessages.push({ me: false, text: msg });
  }
  aiBusy = false;
  drawAi(false);
}
ACTIONS.aiSuggest = (d) => sendAi(d.t);
ACTIONS.aiReset = () => { aiMessages.length = 0; api('/api/ai/reset', {}).catch(() => {}); drawAi(false); toast('Начат новый разговор', 1400); };

// ---------- Прогресс ----------
SCREENS.stats = {
  html: () => {
    const p = S.profile, C = 2 * Math.PI * 42, frac = p.xp_in / p.xp_need;
    const total = p.correct + p.wrong, acc = total ? Math.round(p.correct / total * 100) : 0;
    const levels = [['начальный', 'Начальный'], ['средний', 'Средний'], ['продвинутый', 'Продвинутый'], ['все', 'Все слова']];
    return `
    <div class="screen has-tabs">
      <header class="hero pattern">
        <h1 class="serif" style="margin:0;font-size:32px">Прогресс</h1>
        <div class="ring-row">
          <div class="ring"><svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true">
            <circle cx="52" cy="52" r="42" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="10"/>
            <circle class="fg" id="ringFg" cx="52" cy="52" r="42" fill="none" stroke="#D9AE5B" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${C.toFixed(1)}" data-target="${(C * (1 - frac)).toFixed(1)}" transform="rotate(-90 52 52)"/></svg>
            <div class="num"><b>${p.level}</b><small>уровень</small></div></div>
          <div class="stack" style="gap:6px">
            <span style="font-size:20px;font-weight:800">${p.xp_in} / ${p.xp_need} XP</span>
            <span style="font-size:14px;color:var(--on-night)">Ещё ${p.xp_need - p.xp_in} XP до уровня ${p.level + 1}</span>
            <span class="pill gold" style="align-self:flex-start">${ic('flame')}${p.streak} ${plural(p.streak, 'день', 'дня', 'дней')} подряд</span>
          </div>
        </div>
      </header>
      <div class="pad stack" style="margin-top:18px">
        <div class="stat-grid">
          <div class="stat"><b>${p.words_seen}</b><small>Слов просмотрено</small></div>
          <div class="stat"><b style="color:var(--night)">${acc}%</b><small>Точность в квизах</small></div>
          <div class="stat"><b>${total}</b><small>Ответов в квизах</small></div>
          <div class="stat"><b style="color:var(--terra)">${p.favorites.length}</b><small>В избранном</small></div>
        </div>
        <div class="panel">
          <h3>Уровень сложности</h3>
          <div class="seg">${levels.map(([v, l]) => `<button class="${p.difficulty === v ? 'on' : ''}" data-act="setDiff" data-v="${v}" aria-pressed="${p.difficulty === v}">${l}</button>`).join('')}</div>
          <small class="muted">Влияет на случайные слова и квизы. Общий с ботом.</small>
        </div>
        <div class="panel">
          <h3>Рекорды мини-игр</h3>
          <div class="best"><span>Спринт</span><b>${p.best.sprint}</b><span>Найди пару</span><b>${p.best.match}</b><span>Падающие слова</span><b>${p.best.fall}</b><span>Собери фразу</span><b>${p.best.build}</b></div>
        </div>
        <button class="donate-card" data-act="donate">
          <img src="${STICK.spasibo}" alt="Масри: «Спасибо!»">
          <span class="grow"><b>Нравится Masri?</b><small>Поддержи проект звёздами Telegram, это помогает выпускать новые уроки</small></span>
          <span style="color:var(--terra)">${ic('heart', 'width="22" height="22"')}</span>
        </button>
      </div>
      ${tabbar('stats')}
    </div>`;
  },
  mount: () => {
    const fg = document.getElementById('ringFg');
    if (fg) requestAnimationFrame(() => requestAnimationFrame(() => fg.setAttribute('stroke-dashoffset', fg.dataset.target)));
  },
};
ACTIONS.setDiff = async (d) => {
  haptic.tap();
  try { await api('/api/difficulty', { value: d.v }); render(); toast('Уровень сложности сохранён', 1400); }
  catch (e) { apiFail(e); }
};

// =========================================================
// Модальные окна: донат, новый уровень
// =========================================================
function openOverlay(html) { $overlay.innerHTML = html; $overlay.hidden = false; }
function closeOverlay() { $overlay.hidden = true; $overlay.innerHTML = ''; }
$overlay.addEventListener('click', (e) => { if (e.target === $overlay) closeOverlay(); });

function openDonate() {
  haptic.tap();
  openOverlay(`
    <div class="sheet m-rise" role="dialog" aria-label="Поддержать проект">
      <div style="display:flex;align-items:center;gap:6px"><img src="${STICK.spasibo}" alt="" style="width:84px;height:84px">
        <div><h2>Поддержать Masri</h2><small class="muted">Оплата звёздами Telegram</small></div></div>
      <div class="presets">${S.donatePresets.map((a) => `<button data-act="donateAmount" data-a="${a}">⭐ ${a}</button>`).join('')}</div>
      <button class="btn light" data-act="closeOverlay">Не сейчас</button>
    </div>`);
}
ACTIONS.donateAmount = async (d) => {
  if (!tg || !tg.openInvoice) { toast('Обнови Telegram, чтобы оплачивать звёздами в приложении'); return; }
  try {
    const r = await api('/api/donate', { amount: Number(d.a) });
    closeOverlay();
    tg.openInvoice(r.link, (status) => {
      if (status === 'paid') {
        haptic.ok();
        openOverlay(`<div class="modal-center m-pop"><img src="${STICK.spasibo}" alt="Масри: «Спасибо!»"><h2>Шукран!</h2><p>Спасибо за поддержку — это помогает развивать Masri.</p><button class="btn night" style="width:100%" data-act="closeOverlay">Пожалуйста</button></div>`);
      }
    });
  } catch (e) { apiFail(e); }
};

function showLevelUp(level) {
  haptic.ok();
  openOverlay(`<div class="modal-center m-pop" role="dialog" aria-label="Новый уровень">
    <img class="m-bob" src="${STICK.kruto}" alt="Масри: «Круто!»">
    <h2>Уровень ${level}!</h2><p>Ты растёшь — так держать. Продолжай каждый день, чтобы не терять серию.</p>
    <button class="btn gold" style="width:100%" data-act="closeOverlay">Дальше</button></div>`);
}

// =========================================================
// Ошибки и запуск
// =========================================================
function showFatal(kind) {
  closeOverlay();
  const t = {
    telegram: ['Откройте через Telegram', 'Masri App работает внутри Telegram. Откройте бота и нажмите кнопку «Masri» рядом с полем ввода.'],
    noapi: ['Нет адреса сервера', 'Откройте приложение заново кнопкой «Masri» в боте — она передаёт адрес сервера.'],
    session: ['Сессия устарела', 'Закройте приложение и откройте его снова через кнопку «Masri» в боте.'],
    offline: ['Сервер недоступен', 'Бот сейчас выключен или перезапускается. Попробуйте через минуту — если не поможет, откройте приложение заново через бота.'],
  }[kind];
  stack = [];
  if (tg && tg.BackButton) tg.BackButton.hide();
  $app.innerHTML = `<div class="center-screen"><img class="m-pop" src="${STICK.podumai}" alt="Масри: «Подумай!»"><h2>${t[0]}</h2><p>${t[1]}</p>
    ${kind === 'offline' ? '<button class="btn night" data-act="retry">Попробовать снова</button>' : ''}
    ${kind === 'session' && tg ? '<button class="btn night" data-act="closeApp">Закрыть приложение</button>' : ''}</div>`;
}
ACTIONS.retry = () => { $app.innerHTML = '<div class="splash"><img class="m-bob" src="assets/mascot.webp" alt="" width="200" height="172"><p>Подключаемся…</p></div>'; boot(); };
ACTIONS.closeApp = () => { try { tg.close(); } catch (e) {} };

async function boot() {
  if (!INIT_DATA) return showFatal('telegram');
  if (!API) return showFatal('noapi');
  let data;
  try { data = await api('/api/bootstrap'); }
  catch (e) { return showFatal(e.status === 401 ? 'session' : 'offline'); }
  S.user = data.user;
  S.wordList = data.words.map(([i, ar, tr, ru, cat, diff, audio]) => ({ i, ar, tr, ru, cat, diff, audio: !!audio }));
  S.words = new Map(S.wordList.map((w) => [w.i, w]));
  S.categories = data.categories;
  S.catDiff = data.category_difficulty;
  S.dialogues = data.dialogues;
  S.materials = data.materials;
  S.wod = data.word_of_day;
  S.aiEnabled = data.ai_enabled;
  S.donatePresets = data.donate_presets || S.donatePresets;
  let welcomed = false;
  try { welcomed = localStorage.getItem('masri_welcomed') === '1'; } catch (e) {}
  stack = [{ name: welcomed ? 'home' : 'welcome', p: {} }];
  render();
}

// Обновляем профиль, когда пользователь возвращается в приложение (например, после занятий в боте)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.profile && stack.length) {
    api('/api/profile').then(() => { const cur = stack[stack.length - 1]; if (['home', 'stats'].includes(cur.name)) render(); }).catch(() => {});
  }
});

setupTelegram();
boot();
})();
