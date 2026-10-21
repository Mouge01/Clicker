'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const lesson = { id: 'li_one', title: 'Örnek Birinci Ders', minutes: 60, percent: 50, completed: false };
const storageKey = 'uses-slide-helper:v1:/EgitimIzle/demo';
const slide = (title = 'Birinci slayt', now = 5) => `<div id="slide">slide: ${title}</div>
  <div id="playback-controls"><input type="range" min="0" max="5" value="${now}"></div><button id="next">İLERİ</button>`;
const prompt = '<div id="message-window-slide"><p>Kaldığınız yerden devam etmek istiyor musunuz?</p><button id="yes">Evet</button><button>Hayır</button></div>';

function harness({ html = slide(), saved = {}, nested = false } = {}) {
  const dom = new JSDOM('<ul><li class="egitimvideo itemActiveStyle" id="li_one" data-sirano="1">Örnek Birinci Ders (60dk.) % 50</li><li class="egitimvideo" id="li_two" data-sirano="2">Örnek İkinci Ders (60dk.) % 10</li></ul><iframe id="iframe1"></iframe>',
    { url: 'https://egitim.saglik.gov.tr/EgitimIzle/demo/1', runScripts: 'outside-only', pretendToBeVisual: true });
  const win = dom.window;
  let clock = 30000;
  const intervals = [];
  const errors = [];
  // jsdom yerleşim üretmez; yalnızca ölçüm API'si modellenir, seçiciler ve olaylar gerçek DOM'dur.
  function layout(view) {
    view.Element.prototype.getClientRects = function () {
      for (let node = this; node?.nodeType === 1; node = node.parentElement) {
        const style = node.ownerDocument.defaultView.getComputedStyle(node);
        if (node.hidden || style.display === 'none' || style.visibility === 'hidden') return [];
      }
      return [{}];
    };
  }
  layout(win);
  win.Date.now = () => clock;
  win.setInterval = callback => { intervals.push(callback); return intervals.length; };
  win.addEventListener('error', event => { errors.push(event.error); event.preventDefault(); });
  let player = win.document.getElementById('iframe1').contentDocument;
  layout(player.defaultView);
  if (nested) {
    player.body.innerHTML = '<button>Oynatıcı yardımı</button><iframe></iframe>';
    player = player.querySelector('iframe').contentDocument;
    layout(player.defaultView);
  }
  player.body.innerHTML = html;
  win.sessionStorage.setItem(storageKey, JSON.stringify(saved));
  function load() {
    for (const file of ['core.js', 'resume.js', 'content.js']) win.eval(fs.readFileSync(file, 'utf8'));
  }
  return {
    win, player, errors, load,
    get panel() { return win.document.getElementById('uses-slide-helper')?.shadowRoot; },
    get state() { return JSON.parse(win.sessionStorage.getItem(storageKey)); },
    tick(ms = 500) { clock += ms; intervals.at(-1)(); },
    close() { win.close(); }
  };
}

test('üretim denetleyicisi: slayt içindeki devam istemini Evet ile açar', t => {
  const h = harness({ html: '<div id="slide"><p>Kaldığınız yerden devam etmek istiyor musunuz?</p><button id="yes">Evet</button><button>Hayır</button></div>', nested: true });
  t.after(() => h.close());
  let clicks = 0;
  h.player.getElementById('yes').addEventListener('click', () => { clicks++; h.player.body.innerHTML = slide('Kayıtlı slayt', 0); });
  h.load(); h.panel.getElementById('start').click(); h.tick();
  assert.equal(clicks, 1);
  assert.equal(h.state.pending, null);
  assert.equal(h.state.enabled, true);
  assert.match(h.panel.getElementById('slide').textContent, /Kayıtlı slayt/);
  assert.deepEqual(h.errors, []);
});

test('üretim denetleyicisi: yenilemeden kalan eski tıklama devam istemini kilitlemez', t => {
  const h = harness({ html: prompt, saved: { enabled: true, observedInstance: 'old-page', lessonId: lesson.id,
    pending: { kind: 'advance', at: 1000, key: 'old-slide' } } });
  t.after(() => h.close());
  let clicks = 0;
  h.player.getElementById('yes').addEventListener('click', () => { clicks++; h.player.body.innerHTML = slide('Kayıtlı slayt', 0); });
  h.load(); h.tick();
  assert.equal(clicks, 1);
  assert.equal(h.state.enabled, true);
  assert.equal(h.state.pending, null);
});

test('üretim denetleyicisi: zaman dolunca İLERİ bir kez tıklanır ve yeni slayt doğrulanır', t => {
  const h = harness(); t.after(() => h.close());
  let clicks = 0;
  h.player.getElementById('next').addEventListener('click', () => { clicks++; h.player.body.innerHTML = slide('İkinci slayt', 0); });
  h.load(); h.panel.getElementById('start').click();
  h.tick(2001); h.tick();
  assert.equal(clicks, 1);
  assert.equal(h.state.enabled, true);
  assert.equal(h.state.pending, null);
});

test('üretim denetleyicisi: aynı belgede ders değişimi, Evet ve slayt ilerleme birlikte çalışır', t => {
  const h = harness({ html: '<div id="slide">slide: Bölüm Sonu Soruları</div>' });
  t.after(() => h.close());
  let switches = 0, resumes = 0, advances = 0;
  h.win.document.getElementById('li_two').addEventListener('click', () => {
    switches++;
    h.win.document.getElementById('li_one').classList.remove('itemActiveStyle');
    h.win.document.getElementById('li_two').classList.add('itemActiveStyle');
    h.player.body.innerHTML = prompt;
    h.player.getElementById('yes').addEventListener('click', () => {
      resumes++; h.player.body.innerHTML = slide('İkinci dersin kayıtlı slaydı');
      h.player.getElementById('next').addEventListener('click', () => { advances++; h.player.body.innerHTML = slide('Sonraki içerik', 0); });
    });
  });
  h.load(); h.panel.getElementById('start').click();
  h.tick(); h.tick(); h.tick(2001); h.tick();
  assert.equal(switches, 1); assert.equal(resumes, 1); assert.equal(advances, 1);
  assert.equal(h.state.enabled, true); assert.equal(h.state.pending, null);
  assert.equal(h.state.deferredLessons.li_one.title, lesson.title);
  assert.equal(h.state.deferredLessons.li_two, undefined);
});

test('üretim denetleyicisi: pasif devam penceresinin arkasındaki İLERİ tıklanmaz', t => {
  const h = harness({ html: slide() + prompt.replace('id="yes"', 'id="yes" disabled') });
  t.after(() => h.close());
  let advances = 0;
  h.player.getElementById('next').addEventListener('click', () => advances++);
  h.load(); h.panel.getElementById('start').click(); h.tick(3000);
  assert.equal(advances, 0);
  assert.match(h.state.message, /devam|Devam/);
});

test('üretim denetleyicisi: devam açıldıktan sonra soruyu yanıtlamadan sonraki derse geçer', t => {
  const h = harness({ html: prompt }); t.after(() => h.close());
  let switches = 0;
  h.player.getElementById('yes').addEventListener('click', () => { h.player.body.innerHTML = '<div id="slide">slide: Soru 1<input type="radio"><button id="quiz-yes">Evet</button></div>'; });
  h.win.document.getElementById('li_two').addEventListener('click', () => switches++);
  h.load(); h.panel.getElementById('start').click(); h.tick(); h.tick();
  assert.equal(switches, 1);
  assert.equal(h.player.querySelector('input').checked, false);
});

test('DOM devam eşleştirmesi: görünmeyen eski soru alanı Evet seçimini engellemez', t => {
  const h = harness({ html: `<div id="message-window-slide"><p>Kaldığınız yerden devam etmek ister misiniz?</p><input type="radio" hidden><button id="yes">Evet</button></div>` });
  t.after(() => h.close()); h.load();
  const match = h.win.UsesResume.find(h.player, el => el.getClientRects().length > 0, el => !el.disabled);
  assert.equal(match, h.player.getElementById('yes'));
});

test('önceki 16 DOM penceresi senaryosu Chrome gerektirmeden yeniden doğrulanır', t => {
  const h = harness(); t.after(() => h.close()); h.load();
  h.win.document.body.insertAdjacentHTML('beforeend', '<p id="test-summary"></p><ul id="results"></ul><div id="fixtures"></div>');
  h.win.eval(fs.readFileSync('demo-resume.js', 'utf8'));
  assert.equal(h.win.document.getElementById('test-summary').textContent, 'DOM testleri: 16 / 16 başarılı');
  assert.deepEqual(h.errors, []);
});

test('üretim denetleyicisi: pasif Evet etkinleşince bir kez seçilir', t => {
  const h = harness({ html: prompt.replace('id="yes"', 'id="yes" disabled') });
  t.after(() => h.close());
  let clicks = 0;
  const yes = h.player.getElementById('yes');
  yes.addEventListener('click', () => { clicks++; h.player.body.innerHTML = slide('Kayıtlı içerik', 0); });
  h.load(); h.panel.getElementById('start').click(); h.tick();
  assert.equal(clicks, 0); assert.equal(h.state.pending, null);
  yes.disabled = false; h.tick(); h.tick();
  assert.equal(clicks, 1); assert.equal(h.state.pending, null);
});

test('üretim denetleyicisi: yavaş ders yüklenirken eski soru hedef derse yazılmaz', t => {
  const h = harness({ html: '<div id="slide">slide: Bölüm Sonu Soruları</div>' });
  t.after(() => h.close());
  h.win.document.getElementById('li_two').addEventListener('click', () => {
    h.win.document.getElementById('li_one').classList.remove('itemActiveStyle');
    h.win.document.getElementById('li_two').classList.add('itemActiveStyle');
  });
  h.load(); h.panel.getElementById('start').click(); h.tick();
  assert.equal(h.state.pending.kind, 'switch');
  assert.equal(h.state.deferredLessons.li_two, undefined);
  h.player.body.innerHTML = slide('Yeni ders', 0); h.tick();
  assert.equal(h.state.pending, null); assert.equal(h.state.enabled, true);
  assert.equal(h.state.deferredLessons.li_two, undefined);
});
