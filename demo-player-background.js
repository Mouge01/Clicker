'use strict';
let index = 0, elapsed = 0, lastFrame = performance.now(), answered = false;
const titles = ['Arka Plan İçerik 1', 'Arka Plan İçerik 2', 'Bölüm Sonu Soruları-1', 'Bölüm Sonu'];
const slide = document.getElementById('slide'), next = document.getElementById('next');
const submit = document.getElementById('submit'), range = document.querySelector('input[type=range]');
function render() {
  elapsed = 0; lastFrame = performance.now(); answered = false; next.disabled = true;
  slide.replaceChildren();
  const caption = document.createElement('p'); caption.textContent = 'slide: ' + titles[index];
  const heading = document.createElement('h2'); heading.textContent = titles[index]; slide.append(caption, heading);
  submit.hidden = index !== 2;
  if (index === 2) {
    const label = document.createElement('label'), input = document.createElement('input');
    input.type = 'radio'; input.name = 'example'; label.append(input, ' Örnek yanıt'); slide.append(label);
  }
}
document.addEventListener('visibilitychange', () => { lastFrame = performance.now(); });
function frame(time) {
  if (!document.hidden && document.hasFocus()) elapsed += Math.max(0, time - lastFrame);
  lastFrame = time;
  range.value = Math.min(1500, elapsed);
  next.disabled = elapsed < 1500 || (index === 2 && !answered) || index === 3;
  document.getElementById('visibility-state').textContent = 'Oynatıcı görünürlüğü: ' + document.visibilityState + ' · Odak: ' + document.hasFocus();
  requestAnimationFrame(frame);
}
next.addEventListener('click', () => { if (!next.disabled && index < 3) {
  const history = JSON.parse(sessionStorage.getItem('uses-v13-demo-evidence') || '[]');
  history.push({ type: 'slayt geçişi', slide: titles[index], hidden: document.documentElement.dataset.usesNativeHidden === 'true' });
  sessionStorage.setItem('uses-v13-demo-evidence', JSON.stringify(history));
  index++; render();
} });
submit.addEventListener('click', () => { if (document.querySelector('input[type=radio]:checked')) { answered = true; submit.hidden = true; } });
render(); requestAnimationFrame(frame);
