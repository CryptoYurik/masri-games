// Общий код мини-игр Masri: Telegram, загрузка слов, сессия и сохранение результата в бота.
window.Masri = (() => {
  const tg = window.Telegram && Telegram.WebApp;
  const inTelegram = !!(tg && tg.initData);
  if (tg) {
    document.documentElement.classList.add("tg");
    tg.ready(); tg.expand();
    try { tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {}
  }

  const $ = (id) => document.getElementById(id);
  const show = (id) => document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === id));
  const haptic = (type) => { try { tg.HapticFeedback.notificationOccurred(type); } catch (e) {} };
  const tap = () => { try { tg.HapticFeedback.impactOccurred("light"); } catch (e) {} };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  // Сравнение арабского без огласовок и русского без регистра
  const normAr = (s) => s.replace(/[\u064B-\u0652\u0670\u0640\s]/g, "");
  const normRu = (s) => s.trim().toLowerCase();
  const level = new URLSearchParams(location.search).get("d") || "все";

  async function loadJSON(name) {
    const r = await fetch(name + "?v=" + Date.now());
    if (!r.ok) throw new Error(name + ": " + r.status);
    return r.json();
  }

  // Строка words.json: [индекс, арабский, транслит, перевод, категория, сложность]
  async function loadWords() {
    const all = await loadJSON("words.json");
    let pool = level === "все" ? all : all.filter(w => w[5] === level);
    if (pool.length < 20) pool = all;
    const byCat = {}, transByArabic = {};
    for (const w of all) (transByArabic[normAr(w[1])] ||= new Set()).add(normRu(w[3]));
    for (const w of pool) (byCat[w[4]] ||= []).push(w);
    return { all, pool, byCat, transByArabic };
  }

  // n неверных переводов для слова w: сначала из той же категории, без переводов этого же арабского слова
  function wrongTranslations(W, w, n) {
    const seen = new Set(W.transByArabic[normAr(w[1])]);
    const out = [];
    const take = (list) => {
      for (const x of shuffle(list)) {
        if (out.length >= n) return;
        const k = normRu(x[3]);
        if (!seen.has(k)) { seen.add(k); out.push(x[3]); }
      }
    };
    take(W.byCat[w[4]] || []);
    if (out.length < n) take(W.pool);
    return out;
  }

  // ---------- Сессия: все раунды до нажатия «Сохранить результат» ----------
  let session = null;
  function newSession(game) {
    session = { g: game, r: 0, c: 0, w: 0, b: 0, m: [] };
    return session;
  }
  function roundStarted() {
    if (tg) { tg.MainButton.hide(); try { tg.enableClosingConfirmation(); } catch (e) {} }
  }
  // round = { score, ok, bad, mistakes: [индексы слов] }
  function roundFinished(round) {
    session.r++; session.c += round.ok; session.w += round.bad;
    session.b = Math.max(session.b, round.score);
    for (const i of round.mistakes || []) if (!session.m.includes(i)) session.m.push(i);

    let best = 0;
    const key = "best_" + session.g;
    try { best = +localStorage.getItem(key) || 0; } catch (e) {}
    const isRecord = round.score > best && round.score > 0;
    if (isRecord) { best = round.score; try { localStorage.setItem(key, best); } catch (e) {} }
    return { best, isRecord };
  }
  function offerSave(noteEl, text) {
    if (inTelegram) {
      noteEl.textContent = text;
      tg.MainButton.setParams({ text: "Сохранить результат", is_visible: true, is_active: true });
    } else {
      noteEl.textContent = "Открой игру из бота, чтобы результат сохранился.";
    }
  }
  if (tg) tg.MainButton.onClick(() => {
    if (!session || !session.r) return;
    try { tg.disableClosingConfirmation(); } catch (e) {}
    tg.sendData(JSON.stringify({ ...session, m: session.m.slice(0, 30) }));
  });

  // Карточки «Работа над ошибками» для слов
  function renderWordMistakes(el, words) {
    el.innerHTML = "";
    if (!words.length) { el.innerHTML = '<p class="empty">Ни одной ошибки — مُمتَاز!</p>'; return; }
    for (const w of words) {
      const d = document.createElement("div");
      d.className = "mistake";
      d.innerHTML = '<div class="ar"></div><div class="tr"></div><div class="ok"></div>';
      d.children[0].textContent = w[1];
      d.children[1].textContent = w[2];
      d.children[2].textContent = w[3];
      el.appendChild(d);
    }
  }

  // Таймер раунда на requestAnimationFrame. onEnd вызывается один раз.
  function timer(seconds, barEl, fillEl, labelEl, onEnd) {
    let endAt = performance.now() + seconds * 1000, id, stopped = false;
    const tick = () => {
      if (stopped) return;
      const left = Math.max(0, endAt - performance.now());
      fillEl.style.transform = `scaleX(${left / (seconds * 1000)})`;
      barEl.classList.toggle("low", left < 10000);
      if (labelEl) labelEl.textContent = Math.ceil(left / 1000) + " с";
      if (left <= 0) { stopped = true; return onEnd(); }
      id = requestAnimationFrame(tick);
    };
    tick();
    return {
      stop() { stopped = true; cancelAnimationFrame(id); },
      add(sec) { endAt += sec * 1000; },
    };
  }

  return {
    tg, inTelegram, level, $, show, haptic, tap, pick, shuffle, normAr, normRu,
    loadJSON, loadWords, wrongTranslations,
    newSession, roundStarted, roundFinished, offerSave, renderWordMistakes, timer,
  };
})();
