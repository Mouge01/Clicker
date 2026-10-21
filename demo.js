'use strict';
if (new URLSearchParams(location.search).get('timeline') === 'aria')
  document.getElementById('iframe1').src = 'demo-player.html?timeline=aria';
if (sessionStorage.getItem('uses-demo-end')) sessionStorage.setItem('uses-demo-done', '1');
if (sessionStorage.getItem('uses-demo-done')) document.getElementById('course-state').textContent = 'Tamamlandı';
document.getElementById('li_1').addEventListener('click', () => {
  if (sessionStorage.getItem('uses-demo-end')) sessionStorage.setItem('uses-demo-done', '1');
  location.reload();
});
document.getElementById('reset-demo').addEventListener('click', () => {
  sessionStorage.removeItem('uses-demo-done'); sessionStorage.removeItem('uses-demo-end');
  sessionStorage.removeItem('uses-slide-helper:v1:' + location.pathname); location.reload();
});
