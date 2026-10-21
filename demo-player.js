'use strict';
let index = 0;
let started = performance.now();
let answered = false;
const titles = ['Eğitime Giriş', 'İçerik Örneği', 'Bölüm Sonu Soruları-1', 'Bölüm Sonu'];
const slide = document.getElementById('slide');
const next = document.getElementById('next');
const submit = document.getElementById('submit');
const range = document.querySelector('input[type=range]');
const ariaMode = new URLSearchParams(location.search).get('timeline') === 'aria';
let ariaSlider;
if (ariaMode) {
  range.style.display = 'none';
  ariaSlider = document.createElement('div'); ariaSlider.setAttribute('role', 'slider');
  ariaSlider.setAttribute('aria-label', 'Slayt zamanı'); ariaSlider.setAttribute('aria-valuemin', '0');
  ariaSlider.setAttribute('aria-valuemax', '1.2'); ariaSlider.setAttribute('aria-valuenow', '0');
  ariaSlider.style.cssText = 'padding:12px;background:#e5edf2;border-radius:5px';
  document.getElementById('playback-controls').append(ariaSlider);
}
function render() {
  started = performance.now(); answered = false; next.disabled = true; next.style.display = index === 3 ? 'none' : '';
  range.value = 0; submit.style.display = index === 2 ? '' : 'none';
  slide.replaceChildren();
  const caption = document.createElement('div'); caption.textContent = 'slide: ' + titles[index];
  const heading = document.createElement('h2'); heading.textContent = titles[index];
  slide.append(caption, heading);
  if (index === 2) {
    const label = document.createElement('label'); const input = document.createElement('input');
    input.type = 'radio'; input.name = 'answer'; input.value = 'a'; label.append(input, ' Örnek cevap'); slide.append(label);
  } else {
    const p = document.createElement('p'); p.textContent = index === 3 ? 'Örnek dersini tamamladınız.' : 'Zaman çizgisi tamamlanana kadar İLERİ düğmesi kapalı kalır.'; slide.append(p);
  }
  if (index === 3) sessionStorage.setItem('uses-demo-end', '1');
}
next.addEventListener('click', () => { if (!next.disabled && index < 3) { index++; render(); } });
submit.addEventListener('click', () => {
  if (document.querySelector('input[type=radio]:checked')) { answered = true; submit.style.display = 'none'; }
});
setInterval(() => {
  range.value = Math.min(1200, performance.now() - started);
  if (ariaSlider) { ariaSlider.setAttribute('aria-valuenow', String(Number(range.value) / 1000)); ariaSlider.textContent = 'Süre: ' + (Number(range.value) / 1000).toFixed(2) + ' / 1.20 sn'; }
  next.disabled = Number(range.value) < 1200 || (index === 2 && !answered);
  next.setAttribute('aria-disabled', String(next.disabled));
}, 50);
render();
