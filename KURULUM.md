# USES Slayt Yardımcısı

USES eğitimlerinde slayt sürelerini ve ders tamamlanmasını takip eden Türkçe Chrome eklentisi. Slaytın süresi dolduğunda oynatıcının İLERİ düğmesini kullanır.

**V1.3 alpha:** Eklentiyi daha önce yüklediyseniz Chrome Uzantılar sayfasında bu eklentinin **Yenile** düğmesine basın, ardından eğitim sekmesini yenileyin. Eklentiyi yüklediğiniz klasörü kullanmaya devam edin. Yeni dosyalar nedeniyle uzantıyı ve eğitim sekmesini yenilemek zorunludur; panelde V1.3 yazmalıdır.

## Kurulum

1. Chrome'da adres çubuğuna `chrome://extensions` yazın.
2. Sağ üstte **Geliştirici modu**nu açın.
3. **Paketlenmemiş öğe yükle** düğmesine basın.
4. `manifest.json` dosyasını içeren **eklenti klasörünü** seçin.
5. USES eğitim sekmesini bir kez yenileyin. Gerekirse hesabınıza kendiniz giriş yapın.
6. Ders açıldığında sağ alttaki panelden **Başlat** düğmesine basın.

Chrome'un resmi yerel eklenti kurulum açıklaması:
https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked

## Çalışma şekli

- Zaman çizgisi tamamlanmadan ve İLERİ etkinleşmeden tıklamaz. Varsayılan ek bekleme 2 saniyedir.
- Her tıklamadan sonra slaydın değiştiğini kontrol eder. Geçiş 20 saniyede doğrulanmazsa durur.
- **Katılımsız mod: soruda diğer derse geç** varsayılan olarak açıktır. Sorulu dersi **soru bekleyenler** listesine alır; diğer uygun derse geçer. Soruyu yanıtlamaz ve dersi tamamlanmış saymaz.
- Kullanıcı varlığını otomatik algılamaz; katılımsız modu kullanıcı seçer. Modu kapatırsanız soruda durur. Soruyu kendiniz yanıtlayıp sonraki içerik slaydına geçin; sonra **Başlat**'a basın.
- Soru bekleyen dersleri aynı turda tekrar seçmez. Gezilebilecek başka ders kalmadığında bekleyenlerin sayısını gösterip durur; dersler arasında sonsuz döngü yapmaz.
- **Soru bekleyen dersler** bölümündeki **İlk sorulu derse dön** düğmesi katılımsız modu kapatıp ilk bekleyen dersi açar. Döndüğünüzde devam istemini ve soruları kendiniz tamamlayabilirsiniz.
- Panelde süre koşulu, tahmini kalan süre ve son sayfa okuma zamanı ayrı gösterilir. Yüzde 100 süre koşulunu; Tamamlandı etiketi hem süre hem içerik tamamlanmasını doğrular.
- Bölüm sonunda listedeki ders süresi ve yüzdesinden tahmini kalan süreyi hesaplar. Süre dolunca 1 dakika kontrol payıyla bekler; sayfayı tamamen yeniler ve yeni yüzdeyi okur. İçerik slaytları oynarken periyodik yenileme yapmaz.
- Her yenilemede kalan süreyi yeni site yüzdesine göre baştan hesaplar; eski yerel sayacı sunucu onayı olarak kabul etmez.
- Normal tamamlanma geçişinde sitenin **Tamamlandı** etiketi aranır. Katılımsız moddaki soru nedeniyle erteleme ayrı bir geçiştir; bitmiş ders sayısını artırmaz. İlerleme olmayan üç başarısız süre kontrolünden sonra durur; yenilemede yüzde ilerlemişse kalan süreyi yeniden bekler.
- **Tamamlanınca sonraki eksik dersi aç** seçiliyse tamamlanan dersleri atlayarak kalan dersleri açar.
- **Durdur** ilerletmeyi hemen durdurur; oynatıcının kendi sesini durdurmaz.
- **Arka planda ilerlemeye devam et** açıksa gizli sekmede de süre ve İLERİ koşullarını denetler. Bu seçenek kapatılırsa gizli sekmede bekler.
- Arka plan katmanı, oynatıcıya görünür/odaklı durum bildirir ve gizli sekmede bekleyen animasyon karelerini gerçek zaman bilgisiyle çalıştırır. Durdur düğmesi bu katmanı da devreden çıkarır.
- Arka plan denetimi yalnızca çalışma açıkken etkin olur. Çalışma bitince, sekme kapanınca veya sayfa değişince ilgili kayıt temizlenir.
- Panelde gerçek sekme görünürlüğü, denetleyici bağlantısı ve son arka plan sinyali gösterilir. Uzun kontrol araları olası uyku/tarayıcı duraklaması olarak bildirilir; kesin kilit/uyku teşhisi yapılmaz.
- Windows ekran, uyku ve kilit ayarları değiştirilmez. Bilgisayarı uyanık tutmayı Windows/Caffeine üzerinden yönetin.
- Sayfa yenilenince o sekmedeki çalışma durumunu korur. Yeni bir sekmede Başlat'a basmak gerekir.
- Oynatıcı duraklatılmışsa slayt süresini tamamlamak için oynatıcının kendi yürüt düğmesini kullanın.

## Kapsam ve doğrulama

Yalnızca `https://egitim.saglik.gov.tr/EgitimIzle/*` sayfalarında çalışır. `alarms` ve `storage` izinleri arka plan denetimi için kullanılır. Harici kütüphane, veri aktarımı veya sunucu gerektirmez. Arka plan uyumluluğu aynı sitedeki ScormCourses oynatıcı çerçevelerine de uygulanır. Parola, çerez veya hesabınıza ait özel bilgileri okumaz; süre/tamamlanma değerlerini değiştirmez. Görünen ders yüzdesi kesin bir sayaç değildir; kalan süre bu yüzden tahminidir ve son karar sitenin Tamamlandı etiketidir.

2026-10-21 tarihinde incelenen iki oynatıcı biçimi desteklenir: ARIA zaman çizgisi ve HTML range çizgisi. Karar mantığı testleri ve yerel oynatıcı simülasyonu bulunur. V1.3 ile gerçek Chrome üzerinde panel, arka plan denetleyicisi bağlantısı, slayt ilerleme, soru erteleme ve otomatik ders değişimi gözlenmiştir. Son görünürlük okuması sekmeyi önde gösterdiğinden gerçek gizli/küçültülmüş Chrome penceresinde kesintisiz çalışma henüz doğrulanmış sayılmaz. Site oynatıcısı değişirse eklenti güvenli şekilde bekler/durur.

## Geliştirme

Node.js kuruluysa `npm test` ile testleri çalıştırın. npm kurulumu gerekmez.
Kaynak koddan yerel simülasyon hazırlamak için önce `npm run demo:prepare` çalıştırın. Ardından bu klasörde `python -m http.server 8765 --bind 127.0.0.1` komutuyla sunucu başlatıp `http://127.0.0.1:8765/demo.html` adresini açın.
`content.demo.js`, üretim kodunun yalnızca bölüm sonu kontrol payı 3 saniyeye düşürülmüş test kopyasıdır; manifest bunu yüklemez.
`http://127.0.0.1:8765/demo-multi.html` iki ders arasında otomatik geçişi ve sorulu derslerin ertelenmesini gösterir.

`http://127.0.0.1:8765/demo-background.html` görünürlük ve animasyon uyumluluğunu deneyen iki dersli testtir. Başlat düğmesinden sonra başka sekmeye geçilebilir. Deney kaydı, her geçiş sırasında gerçek sekmenin gizli olup olmadığını gösterir.

Eklentiyi kaldırmak için Chrome Uzantılar sayfasındaki **Kaldır** düğmesini kullanın.
