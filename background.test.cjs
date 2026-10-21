'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createBackground } = require('./background.js');
function harness(saved = []) {
  const handlers = {}, ticks = [], intervals = new Map(), timeouts = new Map(), alarms = new Map();
  const store = { 'uses-helper:v13:tabs': saved };
  let nextId = 1;
  let reply = { active: true };
  const event = name => ({ addListener: fn => { handlers[name] = fn; } });
  const api = {
    runtime: { id: 'extension-id', getManifest: () => ({ name: 'USES Slayt Yardımcısı' }), onMessage: event('message') },
    storage: { session: { get: async () => structuredClone(store), set: async value => Object.assign(store, structuredClone(value)) } },
    alarms: { get: async name => alarms.get(name), create: async (name, value) => alarms.set(name, value),
      clear: async name => alarms.delete(name), onAlarm: event('alarm') },
    tabs: { sendMessage: async (...args) => { ticks.push(args); if (reply instanceof Error) throw reply; return reply; },
      onRemoved: event('removed'), onUpdated: event('updated') }
  };
  const timers = {
    setInterval: fn => { const id = nextId++; intervals.set(id, fn); return id; }, clearInterval: id => intervals.delete(id),
    setTimeout: fn => { const id = nextId++; timeouts.set(id, fn); return id; }, clearTimeout: id => timeouts.delete(id)
  };
  const worker = createBackground(api, timers);
  const sender = overrides => ({ id: 'extension-id', frameId: 0, tab: { id: 42 }, documentId: 'page-1',
    url: 'https://egitim.saglik.gov.tr/EgitimIzle/test/1', ...overrides });
  const message = (active, overrides) => new Promise(resolve => {
    handlers.message({ type: 'USES_RUN_STATE', active }, sender(overrides), resolve);
  });
  return { worker, handlers, ticks, intervals, alarms, store, message, setReply: value => { reply = value; } };
}
test('yalnızca çalışan sekmeye belge kimliğiyle saat mesajı gider', async () => {
  const h = harness(); assert.deepEqual(await h.message(true), { ok: true });
  await h.worker.pulse();
  assert.deepEqual(h.ticks, [[42, { type: 'USES_BACKGROUND_TICK' }, { documentId: 'page-1' }]]);
  assert.equal(h.intervals.size, 1);
  assert.equal(h.alarms.get('uses-helper-v13-watchdog').periodInMinutes, 0.5);
  assert.deepEqual(h.store['uses-helper:v13:tabs'], [{ tabId: 42, documentId: 'page-1' }]);
});
test('Durdur sonrası saat ve watchdog temizlenir', async () => {
  const h = harness(); await h.message(true); await h.message(false); await h.worker.pulse();
  assert.equal(h.ticks.length, 0); assert.equal(h.intervals.size, 0); assert.equal(h.alarms.size, 0);
});
test('başka köken, alt çerçeve ve başka uzantı kayıt yaptıramaz', async () => {
  const h = harness();
  for (const sender of [{ url: 'https://example.com/EgitimIzle/1' }, { frameId: 2 }, { id: 'other-extension' }, { documentId: null }])
    assert.deepEqual(await h.message(true, sender), { ok: false });
  await h.worker.pulse(); assert.equal(h.ticks.length, 0);
});
test('yanıt vermeyen veya duran sayfa etkinler listesinden çıkarılır', async () => {
  const h = harness(); await h.message(true); h.setReply(new Error('Tab closed'));
  await h.worker.pulse(); assert.deepEqual(h.store['uses-helper:v13:tabs'], []);
  assert.equal(h.intervals.size, 0);
});
test('sayfa artık etkin değilse tekrar denetim gönderilmez', async () => {
  const h = harness(); await h.message(true); h.setReply({ active: false });
  await h.worker.pulse(); await h.worker.pulse(); assert.equal(h.ticks.length, 1);
});
test('worker yeniden başladığında kayıtlı sekme yeniden denetlenir', async () => {
  const h = harness([{ tabId: 42, documentId: 'old-page' }]); await h.worker.ready;
  await h.worker.settled(); await h.worker.pulse();
  assert.equal(h.ticks[0][2].documentId, 'old-page');
});
test('kapanan veya gezinmeye başlayan sekme temizlenir', async () => {
  const h = harness(); await h.message(true); h.handlers.removed(42); await h.worker.settled();
  assert.deepEqual(h.store['uses-helper:v13:tabs'], []);
  await h.message(true); h.handlers.updated(42, { status: 'loading' }); await h.worker.settled();
  assert.deepEqual(h.store['uses-helper:v13:tabs'], []);
});
test('eski belgenin durdurma mesajı yeni belge kaydını silemez', async () => {
  const h = harness(); await h.message(true, { documentId: 'new-page' });
  await h.message(false); await h.worker.pulse();
  assert.equal(h.ticks[0][2].documentId, 'new-page');
});
test('bir sekme kapanırken diğer çalışan sekme etkilenmez', async () => {
  const h = harness(); await h.message(true); await h.message(true, { tab: { id: 43 }, documentId: 'page-2' });
  h.handlers.removed(42); await h.worker.settled(); await h.worker.pulse();
  assert.equal(h.ticks.length, 1); assert.equal(h.ticks[0][0], 43);
});
test('alarm, worker saat döngüsü kesilse de sekmeyi yoklar', async () => {
  const h = harness(); await h.message(true);
  h.handlers.alarm({ name: 'uses-helper-v13-watchdog' });
  await h.worker.settled(); await new Promise(resolve => setImmediate(resolve));
  assert.ok(h.ticks.length > 0);
});
