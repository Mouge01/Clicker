# V1.3 doğrulaması — 22 Ekim 2026

- `npm test`: **76 / 76 başarılı**; eski süre/soru/geçiş korumaları ve yeni arka plan davranışları dahil.
- JavaScript sözdizimi kontrolleri: başarılı.
- Gizli sekme mantığı, görünürlük/odak geri dönüşü, 15 saniyelik uyumluluk süresinin dolması, rAF iptali ve çift çağrı koruması test edildi.
- Arka plan kayıt kapsamı, belge kimliği, sekme kapanması, gezinme, durdurma, çoklu sekme ve worker yeniden başlatma senaryoları test edildi.
- Chrome'daki yerel görünürlük/rAF oynatıcısında iki ders otomatik ilerledi; ilk soru nedeniyle ikinci derse geçildi, iki ders de soru bekleyenlere alınınca duruldu. Tamamlanan ders sayısı **0 / 2** kaldı.
- Deneyin geçiş kaydı gerçek görünürlüğü `gizli: false` olarak bildirdi. Bu deneme gerçek gizli/küçültülmüş pencere başarısı olarak raporlanmaz.
- Gerçek USES sayfasına V1.3 yükleme, gerçek gizli/küçültülmüş pencere, Windows kilidi/uyku ve tam ders geçişi henüz doğrulanmadı.
- V1.3 ZIP'i manifest, dört JavaScript dosyası, Türkçe tanıtım/kurulum/sürüm notları ve önceki sürümün yerel önizlemesini içerir. Test dosyaları eklenmez.

Önceki doğrulamalar aşağıdadır.

# Test sonucu — 21 Ekim 2026

- Sürüm: **V1.2 alpha** (manifest: 1.2.0).
- `node --test tests.cjs`: **51 / 51 başarılı**.
- JavaScript sözdizimi kontrolleri: başarılı.
- Üretim ZIP'i: manifest, iki JavaScript dosyası, kurulum/README/sürüm notları ve yerel simülasyon önizlemesi içerir. Test dosyaları ve eski paketler kurulum ZIP'ine eklenmez.

## Tarayıcı simülasyonu

1. Başlat düğmesine basılmadan slayt ilerlemedi.
2. HTML range zaman çizgisinde iki içerik slaydı süreleri dolunca ilerledi; soru sayfasında durdu.
3. Örnek soru elle tamamlanınca yardımcı kendiliğinden yeniden başlamadı.
4. Sonraki slayda elle geçilip Başlat denince bölüm sonu doğrulaması çalıştı. Sayfa tamamen yenilendi; yeni sayfadaki Tamamlandı etiketi okunarak işlem bitti.
5. ARIA zaman çizgisi biçiminde Başlat → Durdur işlemi sonrası ilk slaytta kaldı.
6. ARIA biçiminde yeniden Başlat denince iki içerik slaydı ilerledi ve soru sayfasında durdu.
7. 1.0.1 sürümünde süre koşulu ile içerik koşulu ayrı gösterildi. Site %100 iken içerik eksik olarak görüntülendi; bölüm sonunda tam yenileme sonrasında hem süre hem içerik tamamlandı olarak doğrulandı. Son sayfa okuma zamanı değişti ve çalışma durumu yenilemede korundu.

Yeni karar mantığı testleri; yerel sayacın sunucu onayı sayılmamasını, yenilemeden gelen düşük/yüksek yüzdeye göre yeniden beklemeyi, ilerleme olduğunda kontrol sayacının sıfırlanmasını ve içerik slaydı oynarken sayfanın yenilenmemesini de kapsar.

## 1.1.0 katılımsız mod testi

- İki dersli yerel simülasyonda Başlat'a bir kez basıldı.
- İlk derste iki içerik slaydı otomatik ilerledi. Soruda ilk ders bekleyenlere kaydedildi ve ikinci ders otomatik açıldı.
- İkinci dersin içerikleri de otomatik ilerledi. Soruda her iki dersin soru beklediği gösterilerek durdu. İlk derse tekrar otomatik dönmedi.
- Tamamlanan ders sayısı **0 / 2** olarak kaldı; ertelenen dersler tamamlandı sayılmadı.
- Bekleyen dersler listesinde iki dersin adı görüntülendi.
- İlk sorulu derse dön düğmesi ilk dersi açtı, katılımsız modu kapattı ve otomatik ilerletmeyi durdurdu.
- Kullanıcı varlığı otomatik algılanmaz; katılımsız mod panelden seçilen bir ayardır. Tarayıcıya idle/activity izni eklenmedi.

Ek birim testleri; tamamlanan/ertelenen dersleri atlamayı, listenin sonundan önceki uygun derse geçmeyi, bekleyenlerin sayfa değişiminde korunmasını, tamamlanan dersin bekleyenlerden çıkarılmasını ve başarısız ders geçişinde durmayı kapsar.

Simülasyon gerçek eğitim hesabını kullanmaz. Simülasyonda 1,2 saniyelik slaytlar ve 3 saniyelik son kontrol payı kullanıldı. Üretimde son kontrol payı 60 saniyedir; gerçek ders süreleri değiştirilmez.

## Henüz doğrulanmayan

Chrome'a eklenti olarak kurulum, gerçek USES sayfasında eklenti olarak çalışma ve tam bir dersin süre boyunca tamamlanması. Bu adımlar, eklenti kurulduktan sonra gerçek USES oturumunda doğrulanmalıdır.
