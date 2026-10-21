'use strict';
if (!location.search) {
  document.body.innerHTML = '<button>Oynatıcı yardımı</button><iframe src="demo-resume-player.html?inner=1" title="İç içe kayıtlı ders"></iframe>';
} else {
  document.body.innerHTML = '<section role="dialog" aria-label="Kayıtlı konum"><p>KALDIĞINIZ YERDEN DEVAM ETMEK İSTİYOR MUSUNUZ?</p><button id="no">Hayır</button><input type="button" id="yes" value="EVET"></section>';
  document.getElementById('yes').addEventListener('click', () => {
    document.body.innerHTML = '<div id="slide">slide: Kayıtlı slayt açıldı\nÖnceki ders konumundan devam ediliyor.</div><p>Evet bir kez seçildi.</p><div id="playback-controls"><input type="range" min="0" max="300000" value="0" aria-label="Slayt süresi"></div><button id="next" disabled>İLERİ</button>';
  });
  document.getElementById('no').addEventListener('click', () => { document.body.innerHTML = '<p>HATA: kayıtlı konum yerine yeniden başlatıldı.</p>'; });
}
