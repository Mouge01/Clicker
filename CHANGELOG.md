# Sürüm notları

## V1.3 alpha — 22 Ekim 2026

- Yarım kalan dersin devam penceresinde otomatik **Evet** seçimi güçlendirildi: Türkçe büyük harf, düğme/input/ARIA biçimleri ve iç içe oynatıcı çerçeveleri desteklenir.
- Devam seçimi geçiş doğrulamasını bekler; gizli/pasif düğmelere ve ilgisiz onay pencerelerine tıklamaz. 87 otomatik test ve 16 tarayıcı DOM testi geçti; kayıtlı slayda dönüş yerel simülasyonda görüldü.
- Kullanıcı tarafından kapatılabilen arka planda ilerleme modu.
- Eğitim ve SCORM çerçevelerinde, çalışma açıkken görünürlük/odak uyumluluğu.
- Gizli sekmede bekleyen animasyon karelerine gerçek zamanlı saat desteği.
- Çalışan sekmelere düzenli denetim ve 30 saniyelik worker kurtarma alarmı.
- Gerçek sekme durumu, bağlantı ve uzun kontrol arası bilgisi gösteren panel.
- Gizli sekme, durdurma, kare iptali, worker yeniden başlatma ve sekme temizleme testleri.
- Windows/Caffeine güç yönetimi ayrı tutulur; güç ve idle izni eklenmez.

V1.3, gerçek USES üzerinde gizli/küçültülmüş pencere testi tamamlanmadan deneme sürümü olarak değerlendirilmelidir.

## V1.2 alpha — 21 Ekim 2026

İlk GitHub alpha paketi. Chrome manifest sürümü `1.2.0`, görüntülenen sürüm adı `V1.2 alpha`.

- Slayt zaman çizgisini ve İLERİ düğmesinin etkinleşmesini bekleyerek otomatik ilerleme.
- Ders süresi ile içerik tamamlanması için ayrı durum göstergeleri.
- Bölüm sonunda tam sayfa yenilemesiyle süre/tamamlanma doğrulaması.
- Tamamlanan dersten sonraki eksik derse otomatik geçiş.
- Katılımsız modda sorulu dersleri erteleme, bekleyenler listesi ve sorulu derse dönüş.
- Döngü ve yinelenen tıklama korumaları; yenilemede oturum durumunu koruma.
- Başlat/durdur paneli ve ayarlanabilir ek bekleme.
- 51 davranış testi, iki zaman çizgisi biçimi için yerel simülasyonlar.

Sorular otomatik yanıtlanmaz. Gerçek USES üzerinde eklenti olarak tam ders akışı henüz uçtan uca doğrulanmamıştır.
