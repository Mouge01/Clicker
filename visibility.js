/* Sayfa dünyasında, yalnızca kullanıcı arka plan modunu çalıştırdığında etkinleşir. */
(() => {
  'use strict';
  const EVENT = 'uses-helper-v13-pulse';
  const KEY = 'uses-helper:v13:background';
  const LEASE_MS = 15000;
  const nativeFocus = document.hasFocus.bind(document);
  function nativeGetter(name, fallback) {
    for (let p = document; p; p = Object.getPrototypeOf(p)) {
      const descriptor = Object.getOwnPropertyDescriptor(p, name);
      if (descriptor?.get) return () => descriptor.get.call(document);
    }
    return fallback;
  }
  const nativeHidden = nativeGetter('hidden', () => false);
  const nativeVisibility = nativeGetter('visibilityState', () => nativeHidden() ? 'hidden' : 'visible');
  let requested = false;
  try { requested = sessionStorage.getItem(KEY) === '1'; } catch {}
  let until = requested ? Date.now() + LEASE_MS : 0;
  const active = () => requested && Date.now() < until;
  for (const [name, getter] of [
    ['hidden', () => active() ? false : nativeHidden()],
    ['visibilityState', () => active() ? 'visible' : nativeVisibility()],
    ['webkitHidden', () => active() ? false : nativeHidden()],
    ['webkitVisibilityState', () => active() ? 'visible' : nativeVisibility()]
  ]) {
    try { Object.defineProperty(document, name, { configurable: true, get: getter }); } catch {}
  }
  try { Object.defineProperty(document, 'hasFocus', { configurable: true,
    value: () => active() || nativeFocus() }); } catch {}
  function guard(event) {
    if (!active() || !event.isTrusted) return;
    if (event.type.includes('visibilitychange') ||
        (event.type === 'blur' && (event.target === window || event.target === document)))
      event.stopImmediatePropagation();
  }
  for (const name of ['visibilitychange', 'webkitvisibilitychange', 'blur'])
    window.addEventListener(name, guard, true);

  // Gizli sayfalarda Chrome rAF çağrılarını askıya alabilir. Uzantının saat
  // mesajı, sıradaki geri çağrıları gerçek performance.now() zamanı ile çalıştırır.
  const requestFrame = window.requestAnimationFrame.bind(window);
  const cancelFrame = window.cancelAnimationFrame.bind(window);
  const frames = new Map();
  let nextId = 1000000000;
  window.requestAnimationFrame = callback => {
    if (typeof callback !== 'function') return requestFrame(callback);
    const id = nextId++;
    const entry = { callback, nativeId: null };
    frames.set(id, entry);
    entry.nativeId = requestFrame(time => {
      if (!frames.delete(id)) return;
      Reflect.apply(callback, window, [time]);
    });
    return id;
  };
  window.cancelAnimationFrame = id => {
    const entry = frames.get(id);
    if (entry) { frames.delete(id); cancelFrame(entry.nativeId); }
    else cancelFrame(id);
  };
  function pumpFrames() {
    if (!active() || !nativeHidden()) return;
    const time = performance.now();
    // Geri çağrı içinde kaydedilen yeni kareler bir sonraki saat mesajını bekler.
    for (const [id, entry] of [...frames]) {
      if (!frames.delete(id)) continue;
      cancelFrame(entry.nativeId);
      try { Reflect.apply(entry.callback, window, [time]); }
      catch (error) { setTimeout(() => { throw error; }, 0); }
    }
  }
  function report() {
    const root = document.documentElement;
    if (!root) return;
    root.dataset.usesNativeHidden = String(nativeHidden());
    root.dataset.usesBackgroundActive = String(active());
  }
  window.addEventListener(EVENT, event => {
    if (typeof event.detail !== 'string' || event.detail.length > 200) return;
    let command;
    try { command = JSON.parse(event.detail); } catch { return; }
    if (typeof command.enabled !== 'boolean') return;
    const wasActive = active();
    requested = command.enabled;
    until = requested ? Date.now() + LEASE_MS : 0;
    try { sessionStorage.setItem(KEY, requested ? '1' : '0'); } catch {}
    report();
    if (wasActive !== active()) {
      document.dispatchEvent(new Event('visibilitychange'));
      if (!nativeFocus()) window.dispatchEvent(new Event(active() ? 'focus' : 'blur'));
    }
    pumpFrames();
  });
  document.addEventListener('DOMContentLoaded', report, { once: true });
  report();
})();
