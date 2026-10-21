/* Yalnızca kayıtlı ders konumuna dönüş penceresindeki olumlu seçeneği bulur. */
(function (root) {
  'use strict';
  const controls = 'button, input[type="button"], input[type="submit"], [role="button"], a';
  const dialogs = '#message-window-slide, [role="dialog"], [role="alertdialog"], dialog, .modal, .swal2-popup, .sweet-alert';
  const questions = 'input[type="radio"], [role="radio"], [role="radiogroup"]';
  function normalize(value) {
    return String(value || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i')
      .normalize('NFD').replace(/[\u0300-\u036f\uE000-\uF8FF]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  const isPrompt = text => /\bkaldigi(?:niz|miz|n|m) (?:yerden|noktadan)\b/.test(normalize(text)) && /\bdevam\b/.test(normalize(text));
  function choiceIndex(text, labels, legacyDialog = false) {
    const names = labels.map(normalize);
    const legacy = legacyDialog && names.includes('yeniden baslat') && names.includes('devam');
    if (!isPrompt(text) && !legacy) return -1;
    for (const name of ['evet', 'devam', 'devam et', 'kaldigim yerden devam et']) {
      const index = names.indexOf(name);
      if (index !== -1) return index;
    }
    return -1;
  }
  function renderedText(scope, visible) {
    if (typeof scope.innerText === 'string') return scope.innerText;
    // Yerleşim API'si olmayan test DOM'larında da gizli içerik isteme dahil edilmez.
    const read = node => node.nodeType === 3 ? node.textContent : node.nodeType !== 1 ||
      /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT)$/.test(node.tagName) || !visible(node) ? '' :
      [...node.childNodes].map(read).join(' ');
    return read(scope);
  }
  function inspect(doc, visible) {
    const scopes = new Set(doc.querySelectorAll(dialogs));
    // Kimliği olmayan oynatıcılarda düğmenin yakın çevresini incele; bütün slaydı tarama.
    for (const button of doc.querySelectorAll(controls)) {
      const label = normalize(button.getAttribute('aria-label') || button.textContent || button.value);
      if (!['evet', 'devam', 'devam et', 'kaldigim yerden devam et'].includes(label) || !visible(button)) continue;
      for (let el = button.parentElement, depth = 0; el && depth < 8; el = el.parentElement, depth++) {
        if (el === doc.body || el === doc.documentElement) break;
        scopes.add(el);
        if (el.matches(dialogs) || el.id === 'slide') break;
      }
    }
    for (const scope of scopes) {
      if (!visible(scope) || [...scope.querySelectorAll(questions)].some(visible)) continue;
      if (!scope.matches(dialogs) && [...scope.querySelectorAll('#slide')].some(visible)) continue;
      if (!scope.matches(dialogs) && scope.querySelector(dialogs)) continue;
      const text = renderedText(scope, visible);
      if (text.length > 1500) continue;
      const buttons = [...scope.querySelectorAll(controls)].filter(visible);
      const labels = buttons.map(el => el.getAttribute('aria-label') || el.textContent || el.value || '');
      const index = choiceIndex(text, labels, scope.matches(dialogs));
      if (index !== -1) return { button: buttons[index] };
    }
    return null;
  }
  function find(doc, visible, enabled) {
    const match = inspect(doc, visible);
    return match && enabled(match.button) ? match.button : null;
  }
  const api = { normalize, isPrompt, choiceIndex, inspect, find };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.defineProperty(root, 'UsesResume', { value: api });
})(globalThis);
