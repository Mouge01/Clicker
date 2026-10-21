'use strict';
const selected = new URLSearchParams(location.search).get('lesson') === '2' ? '2' : '1';
document.getElementById('li_' + selected).classList.add('itemActiveStyle');
for (const row of document.querySelectorAll('li.egitimvideo'))
  row.addEventListener('click', () => {
    const history = JSON.parse(sessionStorage.getItem('uses-v13-demo-evidence') || '[]');
    history.push({ type: 'ders geçişi', from: selected, to: row.dataset.sirano,
      hidden: document.documentElement.dataset.usesNativeHidden === 'true' });
    sessionStorage.setItem('uses-v13-demo-evidence', JSON.stringify(history));
    location.href = 'demo-background.html?lesson=' + row.dataset.sirano;
  });
document.getElementById('reset-demo').addEventListener('click', () => {
  sessionStorage.removeItem('uses-slide-helper:v1:' + location.pathname);
  sessionStorage.removeItem('uses-helper:v13:background');
  sessionStorage.removeItem('uses-v13-demo-evidence');
  location.href = 'demo-background.html?lesson=1';
});
document.getElementById('start-later').addEventListener('click', () => {
  document.getElementById('start-later').disabled = true;
  document.getElementById('delayed-state').textContent = 'Başlangıç planlandı. Bu sırada başka sekmeye geçebilirsiniz.';
  setTimeout(() => {
    document.getElementById('uses-slide-helper')?.shadowRoot?.getElementById('start')?.click();
    document.getElementById('delayed-state').textContent = 'Başlatıldı.';
  }, 30000);
});
setInterval(() => {
  const history = JSON.parse(sessionStorage.getItem('uses-v13-demo-evidence') || '[]');
  document.getElementById('background-evidence').textContent = history.map(item =>
    item.type + ': ' + (item.slide || item.from + ' → ' + item.to) + ' · gerçek sekme gizli: ' + item.hidden).join('\n');
}, 500);
