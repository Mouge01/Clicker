/* Ağ erişimi yapmaz. Çalışan eğitim sekmelerine düzenli denetim mesajı gönderir. */
'use strict';
function createBackground(api, timers = globalThis) {
  const KEY = 'uses-helper:v13:tabs';
  const ALARM = 'uses-helper-v13-watchdog';
  const clients = new Map();
  let timer = null;
  let pumping = false;
  const ready = api.storage.session.get(KEY).then(data => {
    for (const item of data[KEY] || []) {
      if (Number.isInteger(item.tabId) && item.tabId >= 0 && typeof item.documentId === 'string')
        clients.set(item.tabId, { documentId: item.documentId });
    }
  }).catch(() => {});
  let queue = ready;
  function serial(task) {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  }
  const save = () => api.storage.session.set({ [KEY]: [...clients].map(([tabId, item]) => ({ tabId, documentId: item.documentId })) });
  async function schedule() {
    if (clients.size) {
      if (timer == null) timer = timers.setInterval(() => { void pulse().catch(() => {}); }, 1000);
      if (!await api.alarms.get(ALARM)) await api.alarms.create(ALARM, { periodInMinutes: 0.5 });
    } else {
      if (timer != null) timers.clearInterval(timer);
      timer = null;
      await api.alarms.clear(ALARM);
    }
  }
  function permitted(sender) {
    if (sender.id !== api.runtime.id || sender.frameId !== 0 ||
        !Number.isInteger(sender.tab?.id) || typeof sender.documentId !== 'string') return false;
    try {
      const url = new URL(sender.url);
      if (url.origin === 'https://egitim.saglik.gov.tr' && url.pathname.startsWith('/EgitimIzle/')) return true;
      return api.runtime.getManifest().name.endsWith('(Yerel test)') &&
        url.origin === 'http://127.0.0.1:8765' && url.pathname === '/demo-background.html';
    } catch { return false; }
  }
  async function pulse() {
    await ready;
    if (pumping) return;
    pumping = true;
    try {
      const expired = [];
      await Promise.all([...clients].map(async ([tabId, item]) => {
        let timeout;
        try {
          const reply = await Promise.race([
            api.tabs.sendMessage(tabId, { type: 'USES_BACKGROUND_TICK' }, { documentId: item.documentId }),
            new Promise((_, reject) => { timeout = timers.setTimeout(() => reject(new Error('Yanıt yok')), 4000); })
          ]);
          if (reply?.active !== true) expired.push([tabId, item]);
        } catch { expired.push([tabId, item]); }
        finally { if (timeout != null) timers.clearTimeout(timeout); }
      }));
      if (expired.length) await serial(async () => {
        for (const [tabId, item] of expired) if (clients.get(tabId) === item) clients.delete(tabId);
        await save(); await schedule();
      });
    } finally { pumping = false; }
  }
  api.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== 'USES_RUN_STATE') return;
    if (!permitted(sender) || typeof message.active !== 'boolean') { respond({ ok: false }); return; }
    void serial(async () => {
      if (message.active) clients.set(sender.tab.id, { documentId: sender.documentId });
      else if (clients.get(sender.tab.id)?.documentId === sender.documentId) clients.delete(sender.tab.id);
      await save(); await schedule();
      respond({ ok: true });
    }).catch(() => respond({ ok: false }));
    return true;
  });
  api.tabs.onRemoved.addListener(tabId => { void serial(async () => {
    clients.delete(tabId); await save(); await schedule();
  }).catch(() => {}); });
  api.tabs.onUpdated.addListener((tabId, change) => {
    if (change.status !== 'loading') return;
    void serial(async () => { clients.delete(tabId); await save(); await schedule(); }).catch(() => {});
  });
  api.alarms.onAlarm.addListener(alarm => {
    if (alarm.name !== ALARM) return;
    void serial(schedule).then(pulse).catch(() => {});
  });
  void serial(schedule).catch(() => {});
  return { ready, pulse, settled: () => queue };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { createBackground };
else createBackground(chrome);
