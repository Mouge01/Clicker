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
  const isPrompt = text => /\bkaldiginiz yerden\b/.test(normalize(text)) && /\bdevam\b/.test(normalize(text));
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
  function find(doc, visible, enabled) {
    const scopes = new Set(doc.querySelectorAll(dialogs));
    // Kimliği olmayan oynatıcılarda düğmenin yakın çevresini incele; bütün slaydı tarama.
    for (const button of doc.querySelectorAll(controls)) {
      const label = normalize(button.getAttribute('aria-label') || button.textContent || button.value);
      if (!['evet', 'devam', 'devam et', 'kaldigim yerden devam et'].includes(label) || !visible(button)) continue;
      for (let el = button.parentElement, depth = 0; el && depth < 8; el = el.parentElement, depth++) {
        if (el === doc.body || el === doc.documentElement || el.id === 'slide') break;
        scopes.add(el);
        if (el.matches(dialogs)) break;
      }
    }
    for (const scope of scopes) {
      if (!visible(scope) || scope.querySelector('#slide') || scope.querySelector(questions)) continue;
      if (!scope.matches(dialogs) && scope.querySelector(dialogs)) continue;
      const text = scope.innerText || scope.textContent || '';
      if (text.length > 1500) continue;
      const buttons = [...scope.querySelectorAll(controls)].filter(el => visible(el) && enabled(el));
      const labels = buttons.map(el => el.getAttribute('aria-label') || el.textContent || el.value || '');
      const index = choiceIndex(text, labels, scope.matches(dialogs));
      if (index !== -1) return buttons[index];
    }
    return null;
  }
  const api = { normalize, isPrompt, choiceIndex, find };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.defineProperty(root, 'UsesResume', { value: api });
})(globalThis);
