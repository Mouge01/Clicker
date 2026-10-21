'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, 'visibility.js'), 'utf8');
function harness() {
  let now = 1000, hidden = true, focused = false, nextId = 1;
  const callbacks = new Map(), events = new Map(), dispatched = [];
  const document = {
    documentElement: { dataset: {} }, hasFocus: () => focused,
    addEventListener: (type, fn) => events.set('document:' + type, fn),
    dispatchEvent: event => dispatched.push(event.type)
  };
  Object.setPrototypeOf(document, Object.create(Object.prototype, {
    hidden: { get: () => hidden }, visibilityState: { get: () => hidden ? 'hidden' : 'visible' }
  }));
  const window = {
    requestAnimationFrame: fn => { const id = nextId++; callbacks.set(id, fn); return id; },
    cancelAnimationFrame: id => callbacks.delete(id),
    addEventListener: (type, fn) => events.set(type, fn), dispatchEvent: event => dispatched.push(event.type)
  };
  class Event { constructor(type) { this.type = type; } }
  const storage = new Map();
  vm.runInNewContext(source, { document, window, sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    Date: { now: () => now }, performance: { now: () => now }, Event, setTimeout });
  const pulse = enabled => events.get('uses-helper-v13-pulse')({ detail: JSON.stringify({ enabled }) });
  return { document, window, callbacks, dispatched, events, pulse, advance: ms => { now += ms; },
    show: () => { hidden = false; focused = true; } };
}
test('başlatılmadan gerçek görünürlük ve odak korunur', () => {
  const h = harness(); assert.equal(h.document.hidden, true); assert.equal(h.document.visibilityState, 'hidden');
  assert.equal(h.document.hasFocus(), false);
});
test('arka plan modu açıkken sayfa uyumlu görünürlük ve odak görür', () => {
  const h = harness(); h.pulse(true);
  assert.equal(h.document.hidden, false); assert.equal(h.document.visibilityState, 'visible'); assert.equal(h.document.hasFocus(), true);
  assert.equal(h.document.documentElement.dataset.usesNativeHidden, 'true');
});
test('Durdur, gerçek görünürlüğü hemen geri getirir', () => {
  const h = harness(); h.pulse(true); h.pulse(false);
  assert.equal(h.document.hidden, true); assert.equal(h.document.hasFocus(), false);
  assert.ok(h.dispatched.includes('visibilitychange')); assert.ok(h.dispatched.includes('blur'));
});
test('kontrol sinyali kesilirse görünürlük taklidi kalıcı kalmaz', () => {
  const h = harness(); h.pulse(true); h.advance(15001);
  assert.equal(h.document.hidden, true); assert.equal(h.document.hasFocus(), false);
});
test('yerel saat sinyali gizli sayfada rAF geri çağrısını gerçek zamanla bir kez çalıştırır', () => {
  const h = harness(); let calls = 0, timestamp, context;
  h.window.requestAnimationFrame(function (time) { calls++; timestamp = time; context = this; });
  h.advance(2000); h.pulse(true); h.pulse(true);
  assert.equal(calls, 1); assert.equal(timestamp, 3000); assert.equal(context, h.window); assert.equal(h.callbacks.size, 0);
});
test('iptal edilen kare arka plan saatiyle çalıştırılmaz', () => {
  const h = harness(); let calls = 0;
  const id = h.window.requestAnimationFrame(() => calls++); h.window.cancelAnimationFrame(id); h.pulse(true);
  assert.equal(calls, 0);
});
test('geri çağrıda kaydedilen kare sonsuz döngü oluşturmaz', () => {
  const h = harness(); let calls = 0;
  function frame() { calls++; h.window.requestAnimationFrame(frame); }
  h.window.requestAnimationFrame(frame); h.pulse(true); assert.equal(calls, 1);
  h.pulse(true); assert.equal(calls, 2);
});
test('öndeki sekmede yerel saat native rAF döngüsüne karışmaz', () => {
  const h = harness(); h.show(); let calls = 0;
  h.window.requestAnimationFrame(() => calls++); h.pulse(true); assert.equal(calls, 0);
  [...h.callbacks.values()][0](1010); assert.equal(calls, 1);
});
test('yalnızca etkin moddaki pencere odak/görünürlük olayları bastırılır', () => {
  const h = harness(); let stopped = 0;
  const visibility = { type: 'visibilitychange', isTrusted: true, target: h.document, stopImmediatePropagation: () => stopped++ };
  h.events.get('visibilitychange')(visibility); assert.equal(stopped, 0);
  h.pulse(true); h.events.get('visibilitychange')(visibility); assert.equal(stopped, 1);
  h.events.get('blur')({ ...visibility, type: 'blur', target: {} }); assert.equal(stopped, 1);
});
test('bozuk veya eksik denetim mesajı modu açamaz', () => {
  const h = harness(); const listener = h.events.get('uses-helper-v13-pulse');
  listener({ detail: '{' }); listener({ detail: '{}' }); listener({ detail: { enabled: true } });
  assert.equal(h.document.hidden, true);
});
