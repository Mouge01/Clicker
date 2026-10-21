'use strict';
const selected = new URLSearchParams(location.search).get('lesson') === '2' ? '2' : '1';
document.getElementById('li_' + selected).classList.add('itemActiveStyle');
for (const row of document.querySelectorAll('li.egitimvideo'))
  row.addEventListener('click', () => { location.href = 'demo-multi.html?lesson=' + row.dataset.sirano; });
document.getElementById('reset-demo').addEventListener('click', () => {
  sessionStorage.removeItem('uses-slide-helper:v1:' + location.pathname);
  location.href = 'demo-multi.html?lesson=1';
});
