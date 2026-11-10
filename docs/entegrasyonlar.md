# İşletme entegrasyonları

Anahtarlar mevcut `isletme_ayarlari` tablosunda ayrı satırlarda saklanır; yeni migration gerekmez. Uygulama gizli anahtarı, erişim belirteci, webhook belirteci ve robot doğrulama gizli anahtarları mevcut AES-256-GCM şifrelemesini kullanır. Normal GET yanıtları bunları içermez. Göz düğmesi Ayarlar/Kaydet yetkisiyle, `no-store` yanıtıyla çalışır; loglara gizli değer yazılmaz.

## Cloudflare Turnstile / Google reCAPTCHA

Cloudflare için Turnstile anahtarlarını, Google için reCAPTCHA **v2 checkbox** anahtarlarını girin. Uygulamanın alan adını sağlayıcının izin verilen alanlarına ekleyin. Anahtarları önce kapalı durumda kaydedip ekrandaki doğrulama testini tamamlayabilirsiniz. Bir sağlayıcıyı etkinleştirip kaydetmek diğerini aynı işletmede kapatır.

Girişte işletme, yazılan e-postanın sunucudaki aktif üyeliğinden belirlenir; istemci işletme kimliği seçemez. E-posta başlangıcı/kod gönderimi, şifreyle giriş ve e-posta kodu doğrulamasında etkin sağlayıcının tokenı sunucuda doğrulanır; hostname `APP_URL` ile eşleşmelidir. Süresi dolan veya reddedilen tokenla geçilemez. Bu işletme ayarı, henüz hiçbir işletmeye üye olmayan yeni kayıtları veya sosyal sağlayıcı girişlerini küresel olarak korumaz; mevcut hız sınırları devam eder. Küresel kayıt koruması ayrı uygulama ayarı gerektirir.

Sağlayıcı tokenı test sırasında tüketilir; tekrar denemede yeni doğrulama gerekir. Kaydetmek tek başına harici anahtarların doğruluğunu kanıtlamaz. İşletmenin mevcut oturumu ayar değiştirmek için kullanılabilir.

## Meta WhatsApp Cloud API

Alanlar: Meta Uygulama Kimliği, Uygulama Gizli Anahtarı, Telefon Numarası Kimliği, Erişim Belirteci, Webhook Doğrulama Belirteci ve Meta Graph API Sürümü. Sürüm boşsa `v25.0` kullanılır; Meta uygulamasındaki desteklenen sürüme göre değiştirilebilir. Uygulama ID'si ve telefon numarası ID'si, ekranda gösterilen telefon numarasından farklı kimliklerdir.

OTP, giriş kodu ve OTP şablon ayarları eklenmedi. Kayıtlı Bağlantıyı Test Et, telefon numarası metadatasını Meta'dan okur; mesaj göndermez. Alıcı ve mesaj yazılıp Mesaj Gönder düğmesine basılınca normal metin mesajı gönderilir. Meta'nın görüşme penceresi, izin ve alıcı kuralları geçerlidir. API kabul yanıtı, mesajın teslim edildiği anlamına gelmez. Uygulama otomatik mesaj veya OTP göndermez.

Gelen WhatsApp Kurulumu altında işletmeye özel webhook adresi gösterilir: `/api/webhooks/whatsapp/:businessId`. Meta'da bu URL ve aynı doğrulama belirteciyle kurulumu yapıp `messages` alanına abone olun. POST bildirimlerinin ham gövdesi, Uygulama Gizli Anahtarı ile HMAC-SHA256 üzerinden doğrulanır. Bildirimdeki telefon kimliği de işletmenin kayıtlı kimliğiyle eşleşmelidir. Mesaj içeriği/telefon numaraları saklanmaz; mesaj ve teslimat bildirimi sayıları işletme loguna yazılır. Bu bir sohbet/gelen kutusu ekranı değildir.

## Kontrol

Otomatik testler sahte sağlayıcı yanıtlarıyla şifreleme, işletme kapsamı, doğrulama hataları, webhook imzası ve telefon kimliği kontrollerini doğrular. Tarayıcı testleri mobil/masaüstü ekranlarını ve her iki robot sağlayıcısıyla giriş tokenının aktarılmasını kontrol eder. Gerçek anahtarlarla dış bağlantı ve mesaj teslimatı yayından sonra ayrıca denenmelidir; geliştirme sırasında gerçek mesaj gönderilmez.

Kaynaklar: [Cloudflare sunucu doğrulaması](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Google reCAPTCHA v2](https://developers.google.com/recaptcha/docs/display), [Google sunucu doğrulaması](https://developers.google.com/recaptcha/docs/verify), [Meta WhatsApp Cloud API koleksiyonu](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api).

## Ardışık iskonto

İskonto ifadeleri toplanmaz; her oran kalan tutara uygulanır. `20+20` eşdeğer `%36`, `10+10` eşdeğer `%19` olur. Enter sonrasında veya kaydetmede eşdeğer oran mevcut sayısal iskonto alanına yazılır. Geçmişte tek oran olarak kaydedilmiş değerlerin hangi ifadeden geldiği bilinmediğinden bunlar otomatik değiştirilmez.
