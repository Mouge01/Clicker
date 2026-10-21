# USES Slayt Yardımcısı

**V1.3 alpha** · Chrome eklentisi

Sağlık Bakanlığı USES eğitimlerini takip eden kullanıcılar için hazırlanmış Türkçe Chrome eklentisidir. Slaytların süresini bekler, dersin tamamlanma durumunu kontrol eder ve uygun dersler arasında otomatik geçiş yapar. Katılımsız modda soru bulunan dersleri daha sonra yanıtlamanız için bekleyenlere alır.

![V1.2 yerel simülasyon önizlemesi](preview.png)

Önizleme önceki sürüme aittir; V1.3 panelinde arka plan modu ve denetim durumu da bulunur.

## Özellikler

- Slaytın zaman çizgisi dolduğunda ve **İLERİ** etkinleştiğinde ilerler; geçişi kontrol eder.
- Ders süresi ile içerik tamamlanmasını ayrı gösterir.
- Bölüm sonunda gereken süreyi bekleyip sayfayı yeniler; yeni yüzde ve **Tamamlandı** etiketini kontrol eder.
- Tamamlanan dersin ardından sonraki eksik dersi açar.
- **Katılımsız mod** açıkken sorulu dersi bekleyenlere kaydeder; aynı dersler arasında döngü oluşturmaz.
- Bekleyen sorulu derse tek düğmeyle dönülebilir. Soruları otomatik yanıtlamaz.
- Başlat/durdur, ek bekleme süresi ve oturum boyunca durum koruma bulunur.
- **Arka planda ilerlemeye devam et** seçeneği varsayılan olarak açıktır. Oynatıcıya görünürlük/odak uyumu sağlar; gizli sekmede animasyon geri çağrılarını destekler.
- Arka plan denetleyicisi, yalnızca çalışma açıkken eğitim sekmesine düzenli kontrol sinyali gönderir.
- Panel, gerçek sekme durumunu, arka plan bağlantısını ve uzun kontrol aralarını gösterir.

## Chrome'a kurulum

1. `uses-slayt-yardimcisi-v1.3-alpha.zip` dosyasını bir klasöre çıkarın.
2. Chrome'da `chrome://extensions` adresini açın ve **Geliştirici modu**nu etkinleştirin.
3. **Paketlenmemiş öğe yükle** ile `manifest.json` içeren klasörü seçin.
4. USES eğitim sekmesini yenileyip panelde **Başlat**'a basın.

Bilgisayar başından ayrılmadan önce **Katılımsız mod: soruda diğer derse geç** kutusunu açık bırakın. Kullanıcı varlığı otomatik algılanmaz. Arka plan modunu kapatırsanız ders sekmesi görünür kalmalıdır. Bilgisayarın uyanık tutulması Windows/Caffeine tarafında yönetilir.

Ayrıntılı davranış ve güncelleme adımları: [KURULUM.md](KURULUM.md).

## Gizlilik

- Hesap bilgisi, parola, çerez veya kişisel iletişim bilgisi toplamaz.
- Harici bir hizmete veri göndermez; yapay zekâ bağlantısı veya anahtar gerektirmez.
- Yenilemeden sonra devam edebilmek için çalışma ayarlarını, ders kimliklerini, soru bekleyen derslerin adlarını ve zaman bilgilerini yalnızca açık sekmenin oturum alanında tutar.
- Ayrı bir kullanıcı hesabı istemez.
- `alarms` izni arka plan kontrolü, `storage` izni ise yalnızca Chrome oturumu süresince çalışan sekmelerin dahili kimliklerini tutmak için kullanılır.
- Uyumluluk katmanı yalnızca USES eğitim sayfaları ve aynı sitedeki `ScormCourses` oynatıcılarında çalışır; hesap/profil sayfalarına eklenmez.

## Çalışma alanı

Kontrol paneli yalnızca `https://egitim.saglik.gov.tr/EgitimIzle/*` adreslerinde çalışır. Arka plan uyumluluk katmanı aynı kökendeki `ScormCourses` çerçevelerine de uygulanır. Ders listesi ve oynatıcı kontrollerini kullanır. Sitenin süre ve tamamlanma değerlerini değiştirmez; soru bekleyen veya süresi eksik dersleri tamamlandı saymaz.

**Deneme sürümü:** 76 davranış testi geçti. Yerel iki dersli senaryoda içerik ilerleme, soru erteleme ve ders geçişi görüldü. Deneme kaydı sekmeyi görünür gösterdiği için gerçek gizli/küçültülmüş pencere doğrulaması tamamlanmış sayılmaz. Gerçek USES sayfasında V1.3 paneli, denetleyici bağlantısı, soru erteleme, otomatik ders geçişi ve yeni derste ilerleme gözlendi. Son görünürlük okuması sekmeyi önde gösterdi; küçültülmüş pencerede kesintisiz çalışma ayrıca doğrulanmalıdır.

Bu sürüm Windows güç veya kilit ayarlarını değiştirmez. İşletim sistemi uyurken, bilgisayar kilitliyken veya Chrome sekmeyi tamamen dondurup bellekten kaldırdığında kesintisiz çalışacağı garanti edilmez. Arka plan denetleyicisi beklenmedik şekilde sonlanırsa 30 saniyelik kurtarma alarmı yeniden kontrol eder; Chrome bu alarmı geciktirebilir.

## Test ve geliştirme

Bağımlılık kurulumu gerekmez; testler için Node.js kullanılır:

```sh
npm test
npm run demo:prepare
python -m http.server 8765 --bind 127.0.0.1
```

- Tek ders: `http://127.0.0.1:8765/demo.html`
- İki ders ve soru erteleme: `http://127.0.0.1:8765/demo-multi.html`
- Görünürlük/animasyon ve arka plan geçiş deneyi: `http://127.0.0.1:8765/demo-background.html`

Simülasyonlar gerçek eğitim hesabına bağlanmaz. Kurulum paketini yeniden üretmek için `python build-release.py` çalıştırın.

Doğrulama ayrıntıları: [TEST-RAPORU.md](TEST-RAPORU.md). Sürüm notları: [CHANGELOG.md](CHANGELOG.md).
