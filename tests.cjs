'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('./core.js');
const lesson = { id: 'li_886', title: 'Milli Güvenlik Bilgileri', minutes: 60, percent: 75, completed: false };
const other = { ...lesson, id: 'li_887', title: 'Haberleşme' };
const snapshot = overrides => ({ instance: 'page1', lesson, lessons: [lesson, other], hidden: false,
  key: 'slide-a', title: 'İçerik', question: false, end: false, resume: false,
  nextVisible: true, nextEnabled: true, timeline: { min: 0, now: 10, max: 10 }, ...overrides });
const running = overrides => ({ ...C.initial(), enabled: true, ...overrides });
function ready(s = snapshot(), overrides = {}) {
  const first = C.step(s, running(overrides), 1000);
  return C.step(s, first.state, 3001);
}
test('Türkçe ders süresi ve virgüllü yüzde okunur', () => {
  assert.deepEqual(C.parseLesson('li_880', '657 Sayılı Devlet Memuru Kanunu (45dk.) % 84,44'),
    { id: 'li_880', title: '657 Sayılı Devlet Memuru Kanunu', minutes: 45, percent: 84.44, completed: false });
});
test('yüzde 100, Tamamlandı anlamına gelmez', () => {
  const l = C.parseLesson('x', 'Devlet Teşkilatı (45dk.) Süre olarak tamamlanmış, ancak eğitim tam izlenmemiş! % 100');
  assert.equal(l.completed, false); assert.equal(l.percent, 100);
});
test('yalnızca gerçek Tamamlandı etiketi tamamlanma sayılır', () => {
  assert.equal(C.parseLesson('x', 'Halkla İlişkiler (60dk.) Tamamlandı').completed, true);
});
test('eksik süre/yüzde uydurulmaz', () => {
  assert.equal(C.parseLesson('x', 'Ders').minutes, null);
  assert.equal(C.parseLesson('x', 'Ders (30dk.)').percent, null);
});
test('soru başlığı bölüm sonu ile karıştırılmaz', () => {
  assert.deepEqual(C.classify('Bölüm Sonu Soruları-1', '', false), { question: true, end: false });
  assert.deepEqual(C.classify('Bölüm Sonu', '', false), { question: false, end: true });
});
test('soru kontrolü bulunan sıradan başlıkta da durulur', () => {
  assert.equal(C.classify('Bilgilerinizi kontrol edin', '', true).question, true);
});
test('metin içinde soru sözcüğü geçmesi tek başına durdurmaz', () => {
  assert.equal(C.classify('Ders İçeriği', 'Bölüm Sonu Soruları', false).question, false);
});
test('sorumluluk başlığı soru olarak değerlendirilmez', () => {
  assert.equal(C.classify('Devlet Memurlarının Sorumlulukları', '', false).question, false);
  assert.equal(C.classify('DEĞERLENDİRME', '', false).question, true);
});
test('hem saniyeli hem milisaniyeli çizgi desteklenir', () => {
  assert.equal(C.timelineDone({ now: 6.75, max: 6.75 }), true);
  assert.equal(C.timelineDone({ now: 5000, max: 5000 }), true);
  assert.equal(C.timelineDone({ now: 4900, max: 5000 }), false);
  assert.equal(C.timelineDone({ now: 4995, max: 5000 }), false);
});
test('eksik/bozuk zaman çizgisi tamamlanmış sayılmaz', () => {
  for (const t of [null, { now: 0, max: 0 }, { now: NaN, max: 10 }, { now: 10, max: Infinity }])
    assert.equal(C.timelineDone(t), false);
});
test('kullanıcı Başlat demeden işlem yapılmaz', () => {
  assert.equal(C.step(snapshot(), C.initial(), 1000).action.kind, 'idle');
});
test('etkin İLERİ ve tamamlanan çizgiden sonra ek süre beklenir', () => {
  const a = C.step(snapshot(), running(), 1000);
  assert.equal(a.action.kind, 'wait');
  assert.equal(C.step(snapshot(), a.state, 2999).action.kind, 'wait');
  assert.equal(C.step(snapshot(), a.state, 3001).action.kind, 'advance');
});
test('İLERİ açık olsa da tamamlanmayan slayt atlanmaz', () => {
  assert.equal(ready(snapshot({ timeline: { now: 1, max: 10 } })).action.kind, 'wait');
});
test('zaman dolsa da pasif İLERİ tıklanmaz', () => {
  assert.equal(ready(snapshot({ nextEnabled: false })).action.kind, 'wait');
});
test('gizli İLERİ tıklanmaz', () => {
  assert.equal(ready(snapshot({ nextVisible: false })).action.kind, 'wait');
});
test('katılımsız mod kapalıysa soru, hazır İLERİ olsa da durdurur', () => {
  const a = ready(snapshot({ question: true }), { skipQuestions: false });
  assert.equal(a.state.enabled, false); assert.equal(a.action.kind, 'idle');
  const first = C.step(snapshot({ question: true }), running({ skipQuestions: false }), 1000);
  assert.equal(first.action.kind, 'pause');
});
test('aynı slayta ikinci tıklama yapılmaz', () => {
  const a = ready(); assert.equal(a.action.kind, 'advance');
  assert.equal(C.step(snapshot(), a.state, 6000).action.kind, 'wait');
});
test('geçiş gerçekleşmezse tekrar tıklamak yerine durur', () => {
  const a = ready();
  const b = C.step(snapshot(), a.state, 24000);
  assert.equal(b.action.kind, 'pause'); assert.equal(b.state.enabled, false);
});
test('yeni slayta geçildiği doğrulanınca onun süresi yeniden beklenir', () => {
  const a = ready();
  const b = C.step(snapshot({ key: 'slide-b', timeline: { now: 0, max: 10 } }), a.state, 4000);
  assert.equal(b.action.kind, 'wait'); assert.equal(b.state.pending, null);
});
test('devam istemi yalnızca kayıtlı konum seçeneğini açar', () => {
  const a = C.step(snapshot({ resume: true, key: null }), running(), 1000);
  assert.equal(a.action.kind, 'resume');
  assert.equal(C.step(snapshot(), a.state, 2000).state.pending, null);
});

test('devam penceresi kapanana kadar Evet tekrar tıklanmaz', () => {
  const s = snapshot({ resume: true, key: null });
  const a = C.step(s, running(), 1000);
  assert.equal(C.step(s, a.state, 2000).action.kind, 'wait');
  const b = C.step(s, a.state, 22000);
  assert.equal(b.action.kind, 'pause');
  assert.equal(b.state.enabled, false);
});

test('otomasyon kapalıyken devam penceresi kendiliğinden yanıtlanmaz', () => {
  assert.equal(C.step(snapshot({ resume: true, key: null }), C.initial(), 1000).action.kind, 'idle');
});

test('devam penceresinden sonraki soru katılımsız modda ertelenir', () => {
  const a = C.step(snapshot({ resume: true, key: null }), running(), 1000);
  const b = C.step(snapshot({ question: true }), a.state, 2000);
  assert.equal(b.action.kind, 'switch');
  assert.equal(b.action.targetId, other.id);
  assert.equal(b.state.deferredLessons[lesson.id].title, lesson.title);
});
test('arka plandaki sekmede işlem yapılmaz', () => {
  assert.equal(ready(snapshot({ hidden: true }), { backgroundMode: false }).action.kind, 'wait');
});
test('arka planda geçen süre yerel kalan süreden düşülmez', () => {
  let a = C.step(snapshot({ end: true }), running({ backgroundMode: false }), 1000);
  a = C.step(snapshot({ end: true, hidden: true }), a.state, 301000);
  a = C.step(snapshot({ end: true, hidden: false }), a.state, 331000);
  assert.equal(a.action.remainingMs, 960000);
});
test('yüzde 75 olan 60dk derste en az 15dk ve kontrol payı beklenir', () => {
  const a = C.step(snapshot({ end: true }), running(), 1000);
  assert.equal(a.action.remainingMs, 960000);
  assert.equal(C.step(snapshot({ end: true }), a.state, 900999).action.kind, 'wait');
  assert.equal(C.step(snapshot({ end: true }), a.state, 961000).action.kind, 'verify');
});
test('yüzde 100 içerik eksikken hemen sonraki derse geçilmez', () => {
  const l = { ...lesson, percent: 100 };
  const s = snapshot({ lesson: l, lessons: [l, other], end: true });
  const a = C.step(s, running(), 1000);
  assert.equal(a.action.kind, 'wait');
  assert.equal(C.step(s, a.state, 61000).action.kind, 'verify');
});
test('site doğrulamadan ders tamamlanmış kabul edilmez', () => {
  const l = { ...lesson, percent: 100 };
  const a = C.step(snapshot({ lesson: l, end: true }), running({ verification: { lessonId: l.id, count: 3, at: 1 } }), 100000);
  assert.equal(a.action.kind, 'pause'); assert.match(a.action.message, /doğrulamadı/);
});
test('belirsiz yüzdeyle bölüm sonunda durulur', () => {
  const l = { ...lesson, percent: null };
  assert.equal(C.step(snapshot({ lesson: l, end: true }), running(), 1000).action.kind, 'pause');
});
test('tamamlanan ders otomatik seçenek açıksa sonraki eksiğe geçer', () => {
  const l = { ...lesson, completed: true };
  const a = C.step(snapshot({ lesson: l, lessons: [l, other] }), running(), 1000);
  assert.equal(a.action.kind, 'switch'); assert.equal(a.action.targetId, other.id);
});
test('otomatik sonraki ders kapalıysa ders sonunda durur', () => {
  const l = { ...lesson, completed: true };
  assert.equal(C.step(snapshot({ lesson: l, lessons: [l, other] }), running({ autoNext: false }), 1000).action.kind, 'pause');
});
test('bütün dersler site tarafından tamamlanmışsa durur', () => {
  const l = { ...lesson, completed: true };
  assert.equal(C.step(snapshot({ lesson: l, lessons: [l] }), running(), 1000).action.kind, 'pause');
});
test('yeniden açılan aynı ders üzerinde doğrulama beklemesi kaldırılır', () => {
  const st = running({ pending: { kind: 'verify', targetId: lesson.id, instance: 'page0', at: 0 } });
  assert.equal(C.step(snapshot(), st, 1000).state.pending, null);
});
test('yeni yüzde gözlemi kalan süre hesabını günceller', () => {
  const a = C.step(snapshot({ end: true }), running(), 1000);
  const b = C.step(snapshot({ end: true, lesson: { ...lesson, percent: 80 } }), a.state, 61000);
  assert.ok(Math.abs(b.action.remainingMs - 780000) < 0.01);
});
test('oynatıcı uzun süre yüklenmezse otomatik tıklama durur', () => {
  const a = C.step(snapshot({ key: null }), running(), 1000);
  assert.equal(C.step(snapshot({ key: null }), a.state, 47000).action.kind, 'pause');
});
test('izin kapsamı yalnızca eğitim sayfasıdır', () => {
  const manifest = require('./manifest.json');
  assert.equal(manifest.manifest_version, 3);
  const controller = manifest.content_scripts.find(script => script.js.includes('content.js'));
  assert.deepEqual(controller.matches, ['https://egitim.saglik.gov.tr/EgitimIzle/*']);
  assert.deepEqual(manifest.permissions, ['alarms', 'storage']);
  assert.equal(manifest.host_permissions, undefined);
});

test('arka plan modu açıkken gizli sekmede süre bitince ilerler', () => {
  assert.equal(ready(snapshot({ hidden: true })).action.kind, 'advance');
});
test('arka planda da slayt süresi ve ek bekleme koşulları korunur', () => {
  assert.equal(ready(snapshot({ hidden: true, timeline: { now: 4, max: 5 } })).action.kind, 'wait');
  const a = C.step(snapshot({ hidden: true }), running(), 1000);
  assert.equal(C.step(snapshot({ hidden: true }), a.state, 2999).action.kind, 'wait');
  assert.equal(C.step(snapshot({ hidden: true }), a.state, 3001).action.kind, 'advance');
});
test('arka planda sorulu ders tamamlandı sayılmadan ertelenir', () => {
  const a = C.step(snapshot({ hidden: true, question: true }), running(), 1000);
  assert.equal(a.action.kind, 'switch');
  assert.equal(a.action.targetId, other.id);
  assert.ok(a.state.deferredLessons[lesson.id]);
});
test('arka plan modu açıkken beklenen süre ilerler ama sunucu onayı uydurulmaz', () => {
  const a = C.step(snapshot({ end: true, hidden: true }), running(), 1000);
  const b = C.step(snapshot({ end: true, hidden: true }), a.state, 301000);
  assert.equal(b.action.remainingMs, 660000);
  assert.equal(C.durationStatus(snapshot(), b.state, 301000).timeComplete, false);
});
test('arka plan modu kapatılınca gizli sekmede ilerleme kesilir', () => {
  const a = C.step(snapshot({ hidden: true }), running(), 1000);
  const b = C.step(snapshot({ hidden: true }), { ...a.state, backgroundMode: false }, 5000);
  assert.equal(b.action.kind, 'wait');
  assert.equal(b.state.readySince, null);
});
test('süre tamamlanması ile içerik tamamlanması ayrı raporlanır', () => {
  const l = { ...lesson, percent: 100 };
  const status = C.durationStatus(snapshot({ lesson: l }), C.initial(), 1000);
  assert.equal(status.timeComplete, true);
  assert.equal(status.contentComplete, false);
});
test('yerel sayaç sıfıra inse de sunucu süre onayı sayılmaz', () => {
  const a = C.step(snapshot({ end: true }), running(), 1000);
  const status = C.durationStatus(snapshot({ end: true }), a.state, 901000);
  assert.equal(status.remainingMs, 0);
  assert.equal(status.timeComplete, false);
  assert.equal(status.contentComplete, false);
});
test('yenilemede düşük gelen site yüzdesi eski yerel tahminin önüne geçer', () => {
  const a = C.step(snapshot({ end: true }), running(), 1000);
  const fresh = snapshot({ instance: 'page2', end: true, lesson: { ...lesson, percent: 60 } });
  const b = C.step(fresh, JSON.parse(JSON.stringify(a.state)), 1000000);
  assert.equal(b.action.kind, 'wait');
  assert.equal(b.action.remainingMs, 1500000);
});
test('yenilemeden sonra kalan süre yeni yüzdeye göre hesaplanır', () => {
  const a = C.step(snapshot({ end: true }), running(), 1000);
  const fresh = snapshot({ instance: 'page2', end: true, lesson: { ...lesson, percent: 90 } });
  const b = C.step(fresh, a.state, 1000000);
  assert.equal(b.action.kind, 'wait');
  assert.ok(Math.abs(b.action.remainingMs - 420000) < 0.01);
});
test('site yüzdesi ilerliyorsa önceki başarısız kontrol sayısı durdurmaz', () => {
  const old = running({ lessonId: lesson.id, anchorAt: 1000, anchorPercent: 75,
    observedInstance: 'page1', verification: { lessonId: lesson.id, count: 3, at: 2000 } });
  const fresh = snapshot({ instance: 'page2', end: true, lesson: { ...lesson, percent: 80 } });
  const a = C.step(fresh, old, 1000000);
  assert.equal(a.action.kind, 'wait');
  assert.equal(a.state.enabled, true);
});
test('içerik slaydı devam ederken süre dolduğu için sayfa yenilenmez', () => {
  const a = C.step(snapshot({ nextEnabled: false }), running(), 1000);
  const b = C.step(snapshot({ nextEnabled: false }), a.state, 4000000);
  assert.equal(b.action.kind, 'wait');
});
test('yenileme sonrası çalışma durumu korunur ve tamamlanan dersten çıkılır', () => {
  const a = C.step(snapshot({ end: true }), running(), 1000);
  const b = C.step(snapshot({ end: true }), a.state, 961000);
  assert.equal(b.action.kind, 'verify');
  const done = { ...lesson, percent: 100, completed: true };
  const fresh = snapshot({ instance: 'page2', lesson: done, lessons: [done, other] });
  const c = C.step(fresh, JSON.parse(JSON.stringify(b.state)), 962000);
  assert.equal(c.state.enabled, true);
  assert.equal(c.action.kind, 'switch');
  assert.equal(c.action.targetId, other.id);
});
test('durdurulan uygulamanın yerel süre tahmini ilerlemez', () => {
  const a = C.step(snapshot(), running(), 1000);
  const b = C.step(snapshot(), { ...a.state, enabled: false }, 301000);
  const status = C.durationStatus(snapshot(), b.state, 301000);
  assert.equal(status.remainingMs, 900000);
});
test('katılımsız soru geçişi varsayılan olarak açıktır', () => {
  assert.equal(C.initial().skipQuestions, true);
});
test('soruya gelen ders tamamlandı sayılmadan sonraki derse geçilir', () => {
  const s = snapshot({ question: true });
  const before = JSON.stringify(s);
  const a = C.step(s, running(), 1000);
  assert.equal(a.action.kind, 'switch');
  assert.equal(a.action.targetId, other.id);
  assert.equal(a.state.deferredLessons[lesson.id].title, lesson.title);
  assert.equal(JSON.stringify(s), before);
});
test('sorudan çıkılırken tamamlanmış dersler atlanır', () => {
  const done = { ...other, completed: true };
  const third = { ...other, id: 'li_888' };
  const a = C.step(snapshot({ question: true, lessons: [lesson, done, third] }), running(), 1000);
  assert.equal(a.action.targetId, third.id);
});
test('soru bekleyen derse döngüyle tekrar girilmez', () => {
  const third = { ...other, id: 'li_888' };
  const st = running({ deferredLessons: { [other.id]: { title: other.title, at: 1 } } });
  const a = C.step(snapshot({ question: true, lessons: [lesson, other, third] }), st, 1000);
  assert.equal(a.action.targetId, third.id);
});
test('iki ders de soru bekliyorsa iki ders arasında sonsuz geçiş yapılmaz', () => {
  const a = C.step(snapshot({ question: true }), running(), 1000);
  const second = snapshot({ instance: 'page2', lesson: other, key: 'question-b', question: true });
  const b = C.step(second, JSON.parse(JSON.stringify(a.state)), 2000);
  assert.equal(b.action.kind, 'pause');
  assert.equal(b.state.enabled, false);
  assert.equal(Object.keys(b.state.deferredLessons).length, 2);
  assert.match(b.action.message, /2 ders soru yanıtı bekliyor/);
});
test('tamamlanan dersten çıkarken yalnızca sorulu ders kaldıysa bitmiş gibi raporlanmaz', () => {
  const done = { ...other, completed: true };
  const st = running({ deferredLessons: { [lesson.id]: { title: lesson.title, at: 1 } } });
  const a = C.step(snapshot({ lesson: done, lessons: [lesson, done] }), st, 1000);
  assert.equal(a.action.kind, 'pause');
  assert.match(a.action.message, /soru yanıtı bekliyor/);
  assert.doesNotMatch(a.action.message, /bütün dersler Tamamlandı/);
});
test('kullanıcının tamamladığı sorulu ders duraklama sırasında da bekleyenlerden çıkarılır', () => {
  const done = { ...lesson, completed: true };
  const st = { ...C.initial(), deferredLessons: { [lesson.id]: { title: lesson.title, at: 1 } } };
  const a = C.step(snapshot({ lesson: done, lessons: [done, other] }), st, 1000);
  assert.deepEqual(a.state.deferredLessons, {});
});
test('listenin sonundaki sorudan önceki uygun derse geçilebilir', () => {
  const a = C.step(snapshot({ lesson: other, question: true }), running(), 1000);
  assert.equal(a.action.kind, 'switch');
  assert.equal(a.action.targetId, lesson.id);
});
test('ders değişiminde bekleyen soru listesi korunur ve içerik oynamaya devam eder', () => {
  const a = C.step(snapshot({ question: true }), running(), 1000);
  const s = snapshot({ instance: 'page2', lesson: other, nextEnabled: false });
  const b = C.step(s, JSON.parse(JSON.stringify(a.state)), 2000);
  assert.equal(b.action.kind, 'wait');
  assert.equal(b.state.enabled, true);
  assert.equal(b.state.pending, null);
  assert.ok(b.state.deferredLessons[lesson.id]);
});
test('sorudan sonra ders geçişi gerçekleşmezse tekrar tekrar tıklanmaz', () => {
  const s = snapshot({ question: true });
  const a = C.step(s, running(), 1000);
  const b = C.step(s, a.state, 22000);
  assert.equal(b.action.kind, 'pause');
  assert.match(b.action.message, /geçiş doğrulanamadı/);
});
