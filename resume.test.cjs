'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('./resume.js');

test('Türkçe büyük harf ve ASCII devam istemleri tanınır', () => {
  for (const text of ['Kaldığınız yerden devam etmek istiyor musunuz?',
    'KALDIĞINIZ YERDEN DEVAM ETMEK İSTER MİSİNİZ?',
    'Kaldiginiz yerden\n devam etmek istiyor musunuz?',
    'Kaldığımız yerden devam edelim mi?',
    'Son kaldığınız noktadan devam etmek ister misiniz?']) assert.equal(R.isPrompt(text), true);
});
test('Evet seçeneği sırasından bağımsız ve Devam seçeneğinden önce seçilir', () => {
  assert.equal(R.choiceIndex('Kaldığınız yerden devam etmek istiyor musunuz?', ['Hayır', 'Devam', 'EVET']), 2);
});
test('oynatıcı simgeleri ve noktalama olumlu etiketi bozmaz', () => {
  assert.equal(R.choiceIndex('Kaldığınız yerden devam?', ['Hayır', '\uE000 Evet!']), 1);
});
test('devam et seçeneği de kayıtlı konumu açabilir', () => {
  assert.equal(R.choiceIndex('Kaldığınız yerden devam etmek ister misiniz?', ['Yeniden Başlat', 'Devam et']), 1);
});
test('Devam ve Yeniden Başlat biçimi yalnızca devam penceresinde tanınır', () => {
  assert.equal(R.choiceIndex('Devam Yeniden Başlat', ['Devam', 'Yeniden Başlat'], true), 0);
  assert.equal(R.choiceIndex('Devam Yeniden Başlat', ['Devam', 'Yeniden Başlat']), -1);
});
test('rastgele Evet sorusu devam penceresi sayılmaz', () => {
  assert.equal(R.choiceIndex('Bu işlemi yapmak istiyor musunuz?', ['Evet', 'Hayır'], true), -1);
});
test('yalnızca kaldığınız yerden veya yalnızca devam sözcüğü yeterli değildir', () => {
  for (const text of ['Kaldığınız yerden ayrılmak ister misiniz?', 'Devam etmek istiyor musunuz?', ''])
    assert.equal(R.choiceIndex(text, ['Evet', 'Hayır']), -1);
});
test('Evet ile başlayan açıklama veya olumsuz cevap düğme olarak seçilmez', () => {
  const prompt = 'Kaldığınız yerden devam etmek istiyor musunuz?';
  assert.equal(R.choiceIndex(prompt, ['Hayır', 'Evet seçeneği ne yapar?']), -1);
});
