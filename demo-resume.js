'use strict';
(() => {
  const R = globalThis.UsesResume;
  const fixture = document.getElementById('fixtures');
  const prompt = 'Kaldığınız yerden devam etmek istiyor musunuz?';
  const visible = el => !!el?.isConnected && getComputedStyle(el).display !== 'none' &&
    getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length > 0;
  const enabled = el => visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true' &&
    !el.classList.contains('disabled') && getComputedStyle(el).pointerEvents !== 'none';
  const cases = [
    ['Standart Evet', `<div id="message-window-slide"><p>${prompt}</p><button>Hayır</button><button id="wanted">Evet</button></div>`, true],
    ['Büyük harf ve input', `<section role="dialog"><p>${prompt.toLocaleUpperCase('tr-TR')}</p><input id="wanted" type="button" value="EVET"></section>`, true],
    ['Kimliksiz pencere ve role button', `<section><p>${prompt}</p><span role="button" id="wanted">Evet</span></section>`, true],
    ['Bağlantı düğmesi', `<div class="modal"><p>${prompt}</p><a id="wanted" href="#">Evet</a></div>`, true],
    ['Devam / Yeniden Başlat', '<div role="dialog"><button>Yeniden Başlat</button><button id="wanted">Devam</button></div>', true],
    ['ARIA etiketi', `<div role="dialog"><p>${prompt}</p><button id="wanted" aria-label="Evet"><span aria-hidden="true">✓</span></button></div>`, true],
    ['Gizli pencere', `<div role="dialog" hidden><p>${prompt}</p><button id="wanted">Evet</button></div>`, false],
    ['Gizli Evet', `<div role="dialog"><p>${prompt}</p><button id="wanted" hidden>Evet</button></div>`, false],
    ['Pasif Evet', `<div role="dialog"><p>${prompt}</p><button id="wanted" disabled>Evet</button></div>`, false],
    ['ARIA pasif Evet', `<div role="dialog"><p>${prompt}</p><button id="wanted" aria-disabled="true">Evet</button></div>`, false],
    ['Başka bir onay penceresi', '<div role="dialog"><p>Çıkmak istiyor musunuz?</p><button id="wanted">Evet</button></div>', false],
    ['Sınav yanıtı', `<div id="slide"><p>${prompt}</p><input type="radio"><button id="wanted">Evet</button></div>`, false],
    ['Aynı sayfadaki ilgisiz Evet', `<div role="dialog"><p>${prompt}</p><button>Hayır</button></div><button id="wanted">Evet</button>`, false],
    ['Gizli metin onay sayılmaz', `<div role="dialog"><p hidden>${prompt}</p><p>Başka işlem?</p><button id="wanted">Evet</button></div>`, false],
    ['İlgisiz Devam düğmeleri', '<section><button>Yeniden Başlat</button><button id="wanted">Devam</button></section>', false],
    ['Fare tıklaması kapalı Evet', `<div role="dialog"><p>${prompt}</p><button id="wanted" style="pointer-events:none">Evet</button></div>`, false]
  ];
  let passed = 0;
  for (const [name, html, expected] of cases) {
    fixture.innerHTML = html;
    const button = R.find(document, visible, enabled);
    const ok = expected ? button === fixture.querySelector('#wanted') : button === null;
    if (ok) passed++;
    const row = document.createElement('li');
    row.textContent = (ok ? 'BAŞARILI: ' : 'HATA: ') + name;
    document.getElementById('results').append(row);
  }
  fixture.replaceChildren(); fixture.hidden = true;
  document.getElementById('test-summary').textContent = `DOM testleri: ${passed} / ${cases.length} başarılı`;
})();
