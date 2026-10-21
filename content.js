/* Yalnızca görünür sayfa kontrollerini okur ve normal düğme tıklamaları yapar. */
(() => {
  'use strict';
  if (window.top !== window || document.getElementById('uses-slide-helper')) return;
  const C = globalThis.UsesSlideCore;
  if (!C) return;
  const course = location.pathname.replace(/\/\d+\/?$/, '').replace(/\/$/, '');
  const storageKey = 'uses-slide-helper:v1:' + course;
  const instance = crypto.randomUUID();
  const END_BUFFER_MS = 60000;
  let state = C.initial();
  let storageAvailable = true;
  try { state = { ...state, ...JSON.parse(sessionStorage.getItem(storageKey) || '{}') }; }
  catch { storageAvailable = false; state.enabled = false; }
  let lastSnapshot = null;
  let logLines = [];
  function save() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(state)); }
    catch { storageAvailable = false; state.enabled = false; state.message = 'Tarayıcı oturum kaydı kullanılamıyor. Otomatik ilerletme durdu.'; }
  }
  function visible(el) {
    if (!el || !el.isConnected) return false;
    const style = el.ownerDocument.defaultView.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
  }
  function enabled(el) {
    return visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true' &&
      !el.classList.contains('disabled') && el.ownerDocument.defaultView.getComputedStyle(el).pointerEvents !== 'none';
  }
  function playerDocument() {
    try {
      const doc = document.getElementById('iframe1')?.contentDocument;
      if (!doc?.body) return null;
      if (doc.querySelector('#slide, #message-window-slide, button')) return doc;
      for (const f of doc.querySelectorAll('iframe')) {
        try { if (f.contentDocument?.querySelector('#slide')) return f.contentDocument; } catch {}
      }
      return doc;
    } catch { return null; }
  }
  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return (h >>> 0).toString(16);
  }
  function collect() {
    const rows = [...document.querySelectorAll('li.egitimvideo[id^="li_"]')];
    const lessons = rows.map(el => ({ ...C.parseLesson(el.id, el.textContent), el }));
    const active = rows.find(el => el.classList.contains('itemActiveStyle'));
    const routeNumber = Number(location.pathname.match(/\/(\d+)\/?$/)?.[1]);
    const lesson = lessons.find(l => l.id === active?.id) || lessons.find(l => Number(l.el.dataset.sirano) === routeNumber);
    const s = { instance, lesson, lessons, hidden: document.hidden, key: null, resume: false,
      question: false, end: false, nextVisible: false, nextEnabled: false, timeline: null };
    const doc = playerDocument();
    if (!doc) return s;
    const prompt = doc.getElementById('message-window-slide');
    const buttons = [...doc.querySelectorAll('button')].filter(visible);
    if (prompt && visible(prompt) && /kaldığınız yerden/i.test(prompt.textContent))
      s.resumeEl = [...prompt.querySelectorAll('button')].find(el => C.clean(el.textContent) === 'Evet');
    if (!s.resumeEl && buttons.some(el => C.clean(el.textContent) === 'Yeniden Başlat'))
      s.resumeEl = buttons.find(el => C.clean(el.textContent) === 'Devam');
    s.resume = !!s.resumeEl;
    const slide = doc.getElementById('slide');
    if (slide && visible(slide)) {
      const text = slide.innerText || slide.textContent;
      const lines = text.split(/\n/).map(C.clean).filter(Boolean);
      const titleLine = lines.find(line => /^slide:/i.test(line)) || lines[0] || '';
      s.title = titleLine.replace(/^slide:\s*/i, '');
      const selected = doc.querySelector('[role="treeitem"][aria-selected="true"]');
      s.key = hash(C.clean(text) + '|' + (selected?.id || ''));
      const submit = doc.getElementById('submit');
      const inputs = [...slide.querySelectorAll('input[type="radio"], [role="radio"], [role="radiogroup"]')].some(visible);
      Object.assign(s, C.classify(s.title, text, inputs || visible(submit)));
    }
    s.nextEl = doc.getElementById('next');
    s.nextVisible = visible(s.nextEl);
    s.nextEnabled = enabled(s.nextEl);
    const slider = [...doc.querySelectorAll('#playback-controls input[type="range"], #playback-controls [role="slider"]')].find(visible);
    if (slider) {
      const range = slider.tagName === 'INPUT';
      const rawMax = slider.getAttribute(range ? 'max' : 'aria-valuemax');
      const rawNow = range ? slider.value : slider.getAttribute('aria-valuenow');
      if (rawMax != null && rawNow != null)
        s.timeline = { min: Number(slider.getAttribute(range ? 'min' : 'aria-valuemin') || 0), max: Number(rawMax), now: Number(rawNow) };
    }
    return s;
  }
  const host = document.createElement('div');
  host.id = 'uses-slide-helper';
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(340px,calc(100vw - 32px));color-scheme:light';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host{font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#172b3a}
      *{box-sizing:border-box}section{background:#fff;border:1px solid #cbd5df;border-radius:14px;box-shadow:0 8px 32px #0f172a26;overflow:hidden}
      header{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;background:#edf5fa;font-weight:700}
      #minimize{background:transparent;color:#355065;padding:2px 8px;font-size:20px;border:0}
      .body{padding:15px}.body[hidden]{display:none}p{margin:0 0 9px}#lesson{font-weight:650}#status{min-height:42px}
      .muted{font-size:12px;color:#607487}progress{width:100%;height:8px;accent-color:#167b83;margin:1px 0 12px}
      .actions{display:flex;gap:8px;margin:12px 0}button{cursor:pointer;font:inherit;border:1px solid #bac9d5;border-radius:8px;padding:8px 14px;background:#fff;color:#243d50}
      #start{background:#086f79;color:#fff;border-color:#086f79;flex:1}button:disabled{opacity:.5;cursor:default}
      label{display:flex;align-items:center;gap:7px;margin:10px 0;font-size:12px}input[type=number]{width:55px;padding:4px;border:1px solid #bac9d5;border-radius:5px}
      details{font-size:11px;color:#607487;border-top:1px solid #e1e8ee;padding-top:9px;margin-top:8px}#log,#deferred-list{white-space:pre-wrap;max-height:90px;overflow:auto;margin:7px 0 0}
      section[data-running=true]{border-color:#16838a}#badge{font-size:11px;font-weight:500;color:#506878}
    </style>
    <section aria-label="USES Slayt Yardımcısı">
      <header><span>USES Slayt Yardımcısı <span id="badge">Hazır</span></span><button id="minimize" aria-label="Paneli küçült" title="Paneli küçült">−</button></header>
      <div class="body"><p id="lesson">Ders okunuyor…</p><p id="slide" class="muted"></p>
      <progress id="progress" max="100" value="0" aria-label="Slayt zaman çizgisi"></progress>
      <p id="status" role="status" aria-live="polite"></p><p id="duration" class="muted"></p><p id="read-at" class="muted"></p><p id="summary" class="muted"></p>
      <div class="actions"><button id="start">Başlat</button><button id="stop">Durdur</button></div>
      <label><input id="auto" type="checkbox">Tamamlanınca sonraki eksik dersi aç</label>
      <label><input id="skip-questions" type="checkbox">Katılımsız mod: soruda diğer derse geç</label>
      <label>Slayt sonu ek bekleme <input id="delay" type="number" min="0" max="60" step="1" aria-label="Ek bekleme saniyesi"> sn</label>
      <p class="muted">Sorulu dersler tamamlandı sayılmaz; sonraya bırakılır. Ders sekmesini görünür tutun.</p>
      <details><summary id="deferred-summary">Soru bekleyen dersler (0)</summary><p id="deferred-list"></p><button id="return-questions">İlk sorulu derse dön</button></details>
      <details><summary>Son işlemler</summary><p id="log"></p></details></div>
    </section>`;
  document.documentElement.append(host);
  const $ = id => shadow.getElementById(id);
  $('auto').checked = state.autoNext;
  $('skip-questions').checked = state.skipQuestions;
  $('delay').value = String(state.extraMs / 1000);
  function log(message) {
    logLines = [new Date().toLocaleTimeString('tr-TR') + ' ' + message, ...logLines].slice(0, 8);
    $('log').textContent = logLines.join('\n');
  }
  function paint(s) {
    shadow.querySelector('section').dataset.running = String(state.enabled);
    $('badge').textContent = state.enabled ? 'Çalışıyor' : 'Durdu';
    $('lesson').textContent = s?.lesson?.title || 'Ders yükleniyor…';
    $('slide').textContent = s?.title || '';
    $('status').textContent = state.message;
    const t = s?.timeline;
    $('progress').value = t && t.max > t.min ? Math.min(100, Math.max(0, 100 * (t.now - t.min) / (t.max - t.min))) : 0;
    const deferred = Object.entries(state.deferredLessons || {});
    $('summary').textContent = s?.lessons?.length ? s.lessons.filter(l => l.completed).length + ' / ' + s.lessons.length +
      ' ders tamamlandı' + (deferred.length ? ' · ' + deferred.length + ' ders soru bekliyor' : '') : '';
    $('deferred-summary').textContent = 'Soru bekleyen dersler (' + deferred.length + ')';
    $('deferred-list').textContent = deferred.length ? deferred.map(([, info]) => info.title).join('\n') : 'Soru bekleyen ders yok.';
    $('return-questions').disabled = !deferred.length;
    const duration = C.durationStatus(s || {}, state, Date.now());
    const percentText = duration.percent == null ? 'okunamadı' : '%' + String(duration.percent).replace('.', ',');
    $('duration').textContent = duration.timeComplete ? 'Süre koşulu: tamam. ' +
      (duration.contentComplete ? 'İçerik de tamamlandı.' : 'İçerik tamamlanması ayrıca bekleniyor.') :
      'Süre koşulu: sitede ' + percentText + (duration.remainingMs == null ? '' :
        duration.remainingMs <= 0 ? ' · Tahmini süre doldu; yenileme ile doğrulanacak.' :
        ' · Tahmini kalan ' + Math.ceil(duration.remainingMs / 60000) + ' dk.');
    $('read-at').textContent = duration.readAt == null ? '' : 'Son sayfa okuması: ' +
      new Date(duration.readAt).toLocaleTimeString('tr-TR') + ' · Kesin sonuç yenilemeden sonra kontrol edilir.';
    $('start').disabled = state.enabled;
    $('stop').disabled = !state.enabled;
  }
  $('start').addEventListener('click', () => {
    if (!storageAvailable) { state.message = 'Tarayıcı oturum kaydı kullanılamıyor. Sayfayı yenileyip tekrar deneyin.'; paint(lastSnapshot); return; }
    state.enabled = true;
    state.pending = null;
    state.readySince = null;
    state.lastTick = Date.now();
    state.wasHidden = document.hidden;
    state.unavailableSince = null;
    // Kullanıcı tarafından yeniden başlatma, başarısız son kontrol sayacını sıfırlar.
    if (state.verification?.count >= 3) state.verification = null;
    log('Başlatıldı.');
    save();
    tick();
  });
  $('stop').addEventListener('click', () => {
    state.enabled = false; state.pending = null; state.message = 'Kullanıcı durdurdu.'; log(state.message); save(); paint(lastSnapshot);
  });
  $('auto').addEventListener('change', () => { state.autoNext = $('auto').checked; save(); });
  $('skip-questions').addEventListener('change', () => { state.skipQuestions = $('skip-questions').checked; save(); });
  $('return-questions').addEventListener('click', () => {
    const id = Object.keys(state.deferredLessons || {})[0];
    const target = id && document.getElementById(id);
    if (!target || !target.matches('li.egitimvideo')) return;
    state.enabled = false;
    state.pending = null;
    state.skipQuestions = false;
    $('skip-questions').checked = false;
    state.message = 'Sorulu ders açılıyor. Soruları kendiniz yanıtlayabilirsiniz.';
    log(state.message);
    save();
    target.click();
  });
  $('delay').addEventListener('change', () => {
    state.extraMs = Math.max(0, Math.min(60, Number($('delay').value) || 0)) * 1000;
    $('delay').value = String(state.extraMs / 1000); save();
  });
  $('minimize').addEventListener('click', () => {
    const body = shadow.querySelector('.body'); body.hidden = !body.hidden;
    $('minimize').textContent = body.hidden ? '+' : '−';
    $('minimize').setAttribute('aria-label', body.hidden ? 'Paneli aç' : 'Paneli küçült');
  });
  let busy = false;
  function tick() {
    if (busy) return;
    busy = true;
    try {
      const s = collect(); lastSnapshot = s;
      const { state: nextState, action } = C.step(s, state, Date.now(), END_BUFFER_MS);
      state = nextState;
      save();
      paint(s);
      if (action.kind === 'advance') {
        const latest = collect();
        if (latest.key !== action.fromKey || latest.question || !latest.nextEnabled || !C.timelineDone(latest.timeline)) {
          state.pending = null; state.readySince = null; save(); return;
        }
        log('İLERİ: ' + s.title);
        latest.nextEl.click();
      } else if (action.kind === 'resume') {
        const latest = collect();
        if (latest.resumeEl && enabled(latest.resumeEl)) { log('Kayıtlı konum açıldı.'); latest.resumeEl.click(); }
        else { state.pending = null; save(); }
      } else if (action.kind === 'verify') {
        log(action.message);
        // Kullanıcının F5 ile yaptığı kontrolün aynısı; durum yenilemeden önce kaydedildi.
        location.reload();
      } else if (action.kind === 'switch') {
        const target = document.getElementById(action.targetId);
        if (!target || !target.matches('li.egitimvideo')) throw new Error('Ders satırı bulunamadı.');
        log(action.message);
        target.click();
      } else if (action.kind === 'pause') log(action.message);
    } catch (error) {
      state.enabled = false; state.pending = null;
      state.message = 'İlerletme durdu: ' + error.message;
      log(state.message); save(); paint(lastSnapshot);
    } finally { busy = false; }
  }
  tick();
  setInterval(tick, 500);
})();
