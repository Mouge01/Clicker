/* USES Slayt Yardımcısı — DOM'dan alınan gözlemler için karar mantığı. */
(function (root) {
  'use strict';
  const clean = value => String(value || '').replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim();
  const number = value => Number(String(value).replace(',', '.'));
  function parseLesson(id, text) {
    text = clean(text);
    const duration = text.match(/\((\d+(?:[,.]\d+)?)\s*dk\.?\)/i);
    const percent = text.match(/%\s*(\d+(?:[,.]\d+)?)/);
    const completed = text.includes('Tamamlandı');
    return { id, title: text.split(/\(\d/)[0].trim(), minutes: duration ? number(duration[1]) : null,
      percent: completed ? 100 : percent ? number(percent[1]) : null, completed };
  }
  function classify(title, text, hasQuestionControls) {
    title = clean(title).replace(/^slide:\s*/i, '');
    const lowerTitle = title.toLocaleLowerCase('tr-TR');
    const question = hasQuestionControls || /(?:^|[^\p{L}])(?:soru(?:ları|lar|su)?|sınav|değerlendirme)(?=$|[^\p{L}])/u.test(lowerTitle);
    const end = !question && (/^(bölüm|eğitim|ders)\s+sonu$/i.test(title) ||
      (/dersini tamamladınız/i.test(clean(text)) && /son/i.test(title)));
    return { question, end };
  }
  function timelineDone(timeline) {
    if (!timeline || !Number.isFinite(timeline.now) || !Number.isFinite(timeline.max)) return false;
    const min = timeline.min || 0;
    return timeline.max > min && timeline.now >= timeline.max - 0.000001;
  }
  function initial() {
    return { enabled: false, autoNext: true, skipQuestions: true, deferredLessons: {}, extraMs: 2000, lessonId: null,
      anchorAt: null, anchorPercent: null, slideKey: null, slideSince: null,
      readySince: null, pending: null, verification: null, unavailableSince: null,
      observedInstance: null, lastReadAt: null,
      lastTick: null, wasHidden: false, message: 'Başlamak için Başlat düğmesine basın.' };
  }
  function durationStatus(s, st, now) {
    const l = s.lesson;
    if (!l) return { timeComplete: false, contentComplete: false, remainingMs: null, percent: null, readAt: null };
    const anchored = st.lessonId === l.id && st.anchorAt != null;
    const percent = anchored ? st.anchorPercent : l.percent;
    const known = l.minutes > 0 && Number.isFinite(percent) && percent >= 0 && percent <= 100;
    const remainingMs = known ? Math.max(0, l.minutes * 60000 * (1 - percent / 100) -
      (anchored ? Math.max(0, now - st.anchorAt) : 0)) : null;
    return { timeComplete: l.completed || l.percent === 100, contentComplete: l.completed,
      remainingMs, percent: l.percent, readAt: st.lastReadAt };
  }
  function step(s, previous, now, bufferMs = 60000) {
    const st = { ...initial(), ...previous };
    st.deferredLessons = { ...(st.deferredLessons || {}) };
    if (s.lessons?.length) {
      const currentIds = new Set(s.lessons.filter(l => !l.completed).map(l => l.id));
      for (const id of Object.keys(st.deferredLessons)) if (!currentIds.has(id)) delete st.deferredLessons[id];
    }
    const result = (kind, message, extra = {}) => {
      st.message = message;
      return { state: st, action: { kind, message, ...extra } };
    };
    const pause = message => { st.enabled = false; st.pending = null; return result('pause', message); };
    const nextAvailable = () => {
      const index = s.lessons.findIndex(l => l.id === s.lesson.id);
      const ordered = index < 0 ? s.lessons : [...s.lessons.slice(index + 1), ...s.lessons.slice(0, index)];
      return ordered.find(l => !l.completed && !st.deferredLessons[l.id]);
    };
    const pauseForQuestions = () => {
      const count = Object.keys(st.deferredLessons).length;
      return pause(count ? 'Gezilebilecek başka ders kalmadı. ' + count + ' ders soru yanıtı bekliyor.' :
        'Gezilebilecek başka ders bulunamadı.');
    };
    const sameLesson = s.lesson && st.lessonId === s.lesson.id;
    const freshPage = s.lesson && st.observedInstance !== s.instance;
    const increased = sameLesson && s.lesson.percent != null &&
      (st.anchorPercent == null || s.lesson.percent > st.anchorPercent);
    if (s.lesson && (!sameLesson || freshPage || increased)) {
      // Her tam yenilemede sunucudan görünen yeni yüzde esas alınır; eski yerel tahmin taşınmaz.
      if (increased && st.verification?.lessonId === s.lesson.id) st.verification = null;
      st.lessonId = s.lesson.id;
      st.anchorAt = now;
      st.anchorPercent = s.lesson.percent;
      st.observedInstance = s.instance;
      st.lastReadAt = now;
      if (!sameLesson || freshPage) {
        st.lastTick = now;
        st.slideKey = null;
        st.readySince = null;
      }
    }
    const elapsed = st.lastTick == null ? 0 : Math.max(0, now - st.lastTick);
    // Durdurulmuş veya arka plandaki sekmede yerel tahmini ilerletme.
    if ((!st.enabled || s.hidden || st.wasHidden) && st.anchorAt != null) st.anchorAt += elapsed;
    st.lastTick = now;
    st.wasHidden = s.hidden;
    if (!st.enabled) return result('idle', st.message);
    if (s.hidden) return result('wait', 'Ders sekmesini görünür tutun; ilerletme bekliyor.');
    if (!s.lesson || !s.lessons?.length) {
      st.unavailableSince ??= now;
      return now - st.unavailableSince > 45000 ? pause('Ders listesi okunamadı. Sayfayı kontrol edip tekrar başlatın.') :
        result('wait', 'Ders listesi yükleniyor…');
    }
    if (s.lessons.every(l => l.completed)) return pause('Listedeki bütün dersler Tamamlandı olarak doğrulandı.');
    if (st.pending) {
      const p = st.pending;
      const moved = p.kind === 'advance' ? !!s.key && s.key !== p.key :
        p.kind === 'resume' ? !s.resume && !!s.key :
        s.instance !== p.instance && s.lesson.id === p.targetId;
      if (moved) { st.pending = null; st.readySince = null; }
      else if (now - p.at > 20000) return pause('Tıklamadan sonra geçiş doğrulanamadı. Oynatıcıyı kontrol edin.');
      else return result('wait', 'Geçiş doğrulanıyor…');
    }
    if (s.lesson.completed) {
      if (!st.autoNext) return pause('Bu ders Tamamlandı olarak doğrulandı.');
      const next = nextAvailable();
      if (!next) return pauseForQuestions();
      st.pending = { kind: 'switch', at: now, targetId: next.id, instance: s.instance };
      return result('switch', 'Sonraki eksik ders açılıyor…', { targetId: next.id });
    }
    if (s.resume) {
      st.pending = { kind: 'resume', at: now };
      return result('resume', 'Kayıtlı konumdan devam ediliyor…');
    }
    if (!s.key) {
      st.unavailableSince ??= now;
      return now - st.unavailableSince > 45000 ? pause('Slayt okunamadı. Oynatıcıyı kontrol edin.') :
        result('wait', 'Oynatıcı yükleniyor…');
    }
    st.unavailableSince = null;
    if (s.question) {
      st.deferredLessons[s.lesson.id] = { title: s.lesson.title, at: now };
      if (!st.skipQuestions) return pause('Soru sayfası: soruyu yanıtlayıp sonraki içerik slaydına geçin; sonra Başlat’a basın.');
      const next = nextAvailable();
      if (!next) return pauseForQuestions();
      st.pending = { kind: 'switch', at: now, targetId: next.id, instance: s.instance };
      return result('switch', 'Bu ders soru bekleyenlere eklendi. Diğer ders açılıyor…', { targetId: next.id });
    }
    if (s.end) {
      const v = st.verification?.lessonId === s.lesson.id ? st.verification : null;
      if (v && v.count >= 3) return pause('Site bu dersi Tamamlandı olarak doğrulamadı. Süre veya eksik içerik durumunu kontrol edin.');
      if (!(s.lesson.minutes > 0) || st.anchorPercent == null) return pause('Ders süresi/yüzdesi okunamadı. Tamamlanmayı siteden kontrol edin.');
      const remaining = s.lesson.minutes * 60000 * (1 - st.anchorPercent / 100);
      const deadline = Math.max(st.anchorAt + remaining + bufferMs, v ? v.at + bufferMs : 0);
      if (now < deadline) {
        const timeLeft = Math.max(0, st.anchorAt + remaining - now);
        const message = timeLeft > 0 ? 'Bölüm sonu: ders süresi için bekleniyor. Tahmini kalan ' +
          Math.ceil(timeLeft / 60000) + ' dk.' : (s.lesson.percent === 100 ? 'Süre koşulu tamam. ' : 'Tahmini süre doldu. ') +
          'Yenileme kontrolüne ' + Math.ceil((deadline - now) / 1000) + ' sn.';
        return result('wait', message, { remainingMs: deadline - now });
      }
      st.verification = { lessonId: s.lesson.id, count: (v?.count || 0) + 1, at: now };
      st.pending = { kind: 'verify', at: now, targetId: s.lesson.id, instance: s.instance };
      return result('verify', 'Sayfa yenilenerek süre ve tamamlanma durumu kontrol ediliyor…', { targetId: s.lesson.id });
    }
    if (st.slideKey !== s.key) {
      st.slideKey = s.key;
      st.slideSince = now;
      st.readySince = null;
    }
    if (!s.nextVisible) { st.readySince = null; return result('wait', 'İLERİ düğmesi bekleniyor.'); }
    if (!s.nextEnabled) { st.readySince = null; return result('wait', 'Slayt süresi / İLERİ düğmesinin açılması bekleniyor.'); }
    if (!timelineDone(s.timeline)) {
      st.readySince = null;
      if (!s.timeline && now - st.slideSince > 45000) return pause('Slayt süresi okunamadı; otomatik ilerletme durdu.');
      return result('wait', 'Slaydın zaman çizgisi tamamlanıyor…');
    }
    st.readySince ??= now;
    if (now - st.readySince < st.extraMs || now - st.slideSince < 750)
      return result('wait', 'Slayt bitti; ek bekleme süresi…');
    st.pending = { kind: 'advance', key: s.key, at: now };
    return result('advance', 'Sonraki slayta geçiliyor…', { fromKey: s.key });
  }
  const api = { clean, parseLesson, classify, timelineDone, initial, durationStatus, step };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.defineProperty(root, 'UsesSlideCore', { value: api });
})(globalThis);
