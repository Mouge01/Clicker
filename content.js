/* Sayfa kontrollerini okur; arka plan modu kullanıcı tarafından kapatılabilir. */
(() => {
  'use strict';
  if (window.top !== window || document.getElementById('uses-slide-helper')) return;
  const C = globalThis.UsesSlideCore;
  const R = globalThis.UsesResume;
  if (!C || !R) return;
  const course = location.pathname.replace(/\/\d+\/?$/, '').replace(/\/$/, '');
  const storageKey = 'uses-slide-helper:v1:' + course;
  const instance = crypto.randomUUID();
  const playerInstances = new WeakMap();
  const END_BUFFER_MS = 60000;
  let state = C.initial();
  let storageAvailable = true;
  try { state = { ...state, ...JSON.parse(sessionStorage.getItem(storageKey) || '{}') }; }
  catch { storageAvailable = false; state.enabled = false; }
  let lastSnapshot = null;
  let logLines = [];
  const runtime = typeof chrome !== 'undefined' && chrome.runtime?.id ? chrome.runtime : null;
  let runtimePending = false;
  let registeredActive = null;
  let requestedActive = null;
  let registeredAt = 0;
  let workerAvailable = false;
  let lastWorkerTick = null;
  let runtimeError = '';
  let lastControlAt = Date.now();
  let lastGapSeconds = 0;
  const realHidden = () => document.documentElement.dataset.usesNativeHidden == null ? document.hidden :
    document.documentElement.dataset.usesNativeHidden === 'true';
  function syncPage() {
    const detail = JSON.stringify({ enabled: state.enabled && state.backgroundMode });
    const queue = [window];
    for (let i = 0; i < queue.length && i < 64; i++) {
      try {
        const win = queue[i];
        // Aynı kökendeki oynatıcı çerçevelerine yalnızca mod ve saat sinyali iletilir.
        void win.document;
        win.dispatchEvent(new win.CustomEvent('uses-helper-v13-pulse', { detail }));
        for (let j = 0; j < win.frames.length; j++) queue.push(win.frames[j]);
      } catch {}
    }
  }
  function syncRuntime() {
    if (!runtime?.sendMessage || runtimePending) return;
    const active = state.enabled && state.backgroundMode;
    if (requestedActive === active && Date.now() - registeredAt < 15000) return;
    requestedActive = active;
    registeredAt = Date.now();
    runtimePending = true;
    try {
      Promise.resolve(runtime.sendMessage({ type: 'USES_RUN_STATE', active })).then(reply => {
        workerAvailable = reply?.ok === true;
        registeredActive = workerAvailable ? active : null;
        runtimeError = workerAvailable ? '' : 'Arka plan denetimi kaydedilemedi.';
      }).catch(() => {
        workerAvailable = false; registeredActive = null;
        runtimeError = 'Uzantı bağlantısı kesildi; uzantıyı ve eğitim sekmesini yenileyin.';
        if (state.enabled && state.backgroundMode) {
          state.enabled = false; state.pending = null; state.message = runtimeError; save();
        }
      }).finally(() => { runtimePending = false; paint(lastSnapshot); });
    } catch {
      workerAvailable = false;
      runtimeError = 'Uzantı bağlantısı kesildi; uzantıyı ve eğitim sekmesini yenileyin.';
      if (state.enabled && state.backgroundMode) {
        state.enabled = false; state.pending = null; state.message = runtimeError; save();
      }
      runtimePending = false;
    }
  }
  function save() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(state)); }
    catch { storageAvailable = false; state.enabled = false; state.message = 'Tarayıcı oturum kaydı kullanılamıyor. Otomatik ilerletme durdu.'; }
    syncPage();
    syncRuntime();
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
  function playerDocuments() {
    const docs = [];
    try {
      const doc = document.getElementById('iframe1')?.contentDocument;
      if (!doc?.body) return docs;
      docs.push(doc);
      for (let i = 0; i < docs.length && i < 32; i++) {
        for (const frame of docs[i].querySelectorAll('iframe')) {
          try {
            const child = visible(frame) && frame.contentDocument;
            if (child?.body && !docs.includes(child) && docs.length < 32) docs.push(child);
          } catch {}
        }
      }
    } catch {}
    return docs;
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
    const s = { instance, lesson, lessons, hidden: realHidden(), key: null, resume: false,
      question: false, end: false, nextVisible: false, nextEnabled: false, timeline: null };
    const docs = playerDocuments();
    const resume = [document, ...docs].map(doc => R.inspect(doc, visible)).find(Boolean);
    s.resumeEl = resume?.button;
    s.resume = !!resume;
    s.resumeEnabled = enabled(s.resumeEl);
    const doc = s.resumeEl?.ownerDocument || docs.find(doc => visible(doc.getElementById('slide'))) || docs[0];
    if (!doc) return s;
    if (!playerInstances.has(doc)) playerInstances.set(doc, crypto.randomUUID());
    s.playerInstance = playerInstances.get(doc);
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
      *{box-sizing:border-box}section{background:#fff;border:1px solid #cbd5df;border-radius:14px;box-shadow:0 8px 32px #0f172a26;max-height:calc(100vh - 32px);overflow:auto}
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
      <header><span>USES Slayt Yardımcısı V1.3.1 <span id="badge">Hazır</span></span><button id="minimize" aria-label="Paneli küçült" title="Paneli küçült">−</button></header>
      <div class="body"><p id="lesson">Ders okunuyor…</p><p id="slide" class="muted"></p>
      <progress id="progress" max="100" value="0" aria-label="Slayt zaman çizgisi"></progress>
      <p id="status" role="status" aria-live="polite"></p><p id="duration" class="muted"></p><p id="read-at" class="muted"></p><p id="summary" class="muted"></p><p id="background-status" class="muted"></p>
      <div class="actions"><button id="start">Başlat</button><button id="stop">Durdur</button></div>
      <label><input id="auto" type="checkbox">Tamamlanınca sonraki eksik dersi aç</label>
      <label><input id="skip-questions" type="checkbox">Katılımsız mod: soruda diğer derse geç</label>
      <label><input id="background-mode" type="checkbox">Arka planda ilerlemeye devam et</label>
      <label>Slayt sonu ek bekleme <input id="delay" type="number" min="0" max="60" step="1" aria-label="Ek bekleme saniyesi"> sn</label>
      <p class="muted">Sorulu dersler sonraya bırakılır. Bilgisayar uyanık kalmalıdır; Windows güç ayarları değiştirilmez.</p>
      <details><summary id="deferred-summary">Soru bekleyen dersler (0)</summary><p id="deferred-list"></p><button id="return-questions">İlk sorulu derse dön</button></details>
      <details><summary>Son işlemler</summary><p id="log"></p></details></div>
    </section>`;
  document.documentElement.append(host);
  const $ = id => shadow.getElementById(id);
  $('auto').checked = state.autoNext;
  $('skip-questions').checked = state.skipQuestions;
  $('background-mode').checked = state.backgroundMode;
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
    if (!state.backgroundMode) $('background-status').textContent = 'Arka plan modu kapalı · Gizli sekmede bekler.';
    else if (!state.enabled) $('background-status').textContent = 'Arka plan modu hazır · Başlat ile etkinleşir.';
    else {
      const bridge = document.documentElement.dataset.usesBackgroundActive === 'true';
      const worker = !runtime?.sendMessage ? 'yerel test' : workerAvailable ? 'arka plan denetimi bağlı' : 'arka plan denetimi bekleniyor';
      $('background-status').textContent = (s?.hidden ? 'Sekme arka planda' : 'Sekme önde') + ' · ' + worker +
        (bridge ? ' · oynatıcı uyumu açık' : ' · oynatıcı katmanı yok; sayfayı yenileyin') +
        (runtimeError ? ' · ' + runtimeError : '') +
        (lastGapSeconds ? ' · Son kontrolde ' + lastGapSeconds + ' sn ara gözlendi; uyku veya tarayıcı duraklaması olabilir.' : '') +
        (lastWorkerTick ? ' · Son arka plan sinyali: ' + new Date(lastWorkerTick).toLocaleTimeString('tr-TR') : '');
    }
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
    state.wasHidden = realHidden() && !state.backgroundMode;
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
  $('background-mode').addEventListener('change', () => {
    state.backgroundMode = $('background-mode').checked;
    state.readySince = null;
    state.wasHidden = realHidden() && !state.backgroundMode;
    log(state.backgroundMode ? 'Arka plan modu açıldı.' : 'Arka plan modu kapatıldı.');
    save(); tick();
  });
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
      const now = Date.now();
      if (now - lastControlAt > 15000) lastGapSeconds = Math.round((now - lastControlAt) / 1000);
      lastControlAt = now;
      syncPage();
      const s = collect(); lastSnapshot = s;
      const { state: nextState, action } = C.step(s, state, Date.now(), END_BUFFER_MS);
      state = nextState;
      save();
      paint(s);
      if (action.kind === 'advance') {
        const latest = collect();
        if (latest.key !== action.fromKey || latest.resume || latest.question || !latest.nextEnabled || !C.timelineDone(latest.timeline)) {
          state.pending = null; state.readySince = null; save(); return;
        }
        log('İLERİ: ' + s.title);
        latest.nextEl.click();
      } else if (action.kind === 'resume') {
        const latest = collect();
        if (latest.resumeEl && enabled(latest.resumeEl)) { log('Devam penceresi: kayıtlı konum seçildi.'); latest.resumeEl.click(); }
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
  if (runtime?.onMessage) runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== runtime.id || message?.type !== 'USES_BACKGROUND_TICK') return;
    lastWorkerTick = Date.now(); tick();
    respond({ active: state.enabled && state.backgroundMode });
  });
  tick();
  setInterval(tick, 500);
})();
