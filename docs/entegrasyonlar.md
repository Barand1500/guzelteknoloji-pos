# İşletme entegrasyonları

Ayarlar → Entegrasyonlar üç sayfada düzenlenir: **İletişim** (SMTP, IMAP, WhatsApp), **Robot Doğrulama** (Cloudflare veya reCAPTCHA) ve **Sosyal Giriş** (Google işletme bağlantısı ve Apple genel giriş durumu). İletişim kartları ayrı kaydedilir ve test edilir; grup içindeki kaydedilmemiş değişiklikler tek ayrılma uyarısıyla korunur. Apple genel giriş anahtarları sunucudaki `.env` üzerinden yönetilir; bu düzenleme Apple için işletmeye özel anahtar kaydı eklemez. Eski bağlantı adresleri çalışmaya devam eder, Google bağlantı dönüşü Sosyal Giriş sayfasına gider.

Anahtarlar mevcut `isletme_ayarlari` tablosunda ayrı satırlarda saklanır; yeni migration gerekmez. Uygulama gizli anahtarı, erişim belirteci, webhook belirteci ve robot doğrulama gizli anahtarları mevcut AES-256-GCM şifrelemesini kullanır. Normal GET yanıtları bunları içermez. Göz düğmesi Ayarlar/Kaydet yetkisiyle, `no-store` yanıtıyla çalışır; loglara gizli değer yazılmaz.

## Cloudflare Turnstile / Google reCAPTCHA

Cloudflare için Turnstile anahtarlarını, Google için reCAPTCHA **v2 checkbox** anahtarlarını girin. Uygulamanın alan adını sağlayıcının izin verilen alanlarına ekleyin. Anahtarları önce kapalı durumda kaydedip ekrandaki doğrulama testini tamamlayabilirsiniz. Bir sağlayıcıyı etkinleştirip kaydetmek diğerini aynı işletmede kapatır.

Girişte işletme, yazılan e-postanın sunucudaki aktif üyeliğinden belirlenir; istemci işletme kimliği seçemez. E-posta başlangıcı/kod gönderimi, şifreyle giriş ve e-posta kodu doğrulamasında etkin sağlayıcının tokenı sunucuda doğrulanır; hostname `APP_URL` ile eşleşmelidir. Süresi dolan veya reddedilen tokenla geçilemez. İşletmeye özel ayar yalnızca işletmenin üyelerine uygulanır; aşağıdaki sunucu varsayılanı henüz işletmeye üye olmayan adreslere de uygulanır. Sosyal sağlayıcı girişlerinde bu kutu kullanılmaz; mevcut hız sınırları devam eder.

Sağlayıcı tokenı test sırasında tüketilir; tekrar denemede yeni doğrulama gerekir. Kaydetmek tek başına harici anahtarların doğruluğunu kanıtlamaz. İşletmenin mevcut oturumu ayar değiştirmek için kullanılabilir.

E-posta girişinde robot doğrulaması akışın **ilk adımında bir kez** yapılır. Sunucu, doğrulamanın geçtiğini gösteren imzalı ve kısa ömürlü bir akış anahtarı üretir; bu anahtar HttpOnly çerezle ve yanıt gövdesiyle taşınır. Kod veya şifre adımında çerez engellenmiş olsa bile anahtar doğrulanır ve widget ikinci kez istenmez. Anahtar e-postaya bağlıdır ve 10 dakika geçerlidir; başka e-posta için kullanılamaz.

## Meta WhatsApp Cloud API

Alanlar: Meta Uygulama Kimliği, Uygulama Gizli Anahtarı, Telefon Numarası Kimliği, Erişim Belirteci ve Webhook Doğrulama Belirteci. Meta Graph API sürümü uygulama tarafından arka planda yönetilir (`v25.0`); kullanıcıdan istenmez ve eski işletme sürüm ayarları kullanılmaz. Uygulama ID'si ve telefon numarası ID'si, ekranda gösterilen telefon numarasından farklı kimliklerdir.

OTP, giriş kodu ve OTP şablon ayarları eklenmedi. Kayıtlı Bağlantıyı Test Et, telefon numarası metadatasını Meta'dan okur; mesaj göndermez. Alıcı ve mesaj yazılıp Mesaj Gönder düğmesine basılınca normal metin mesajı gönderilir. Meta'nın görüşme penceresi, izin ve alıcı kuralları geçerlidir. API kabul yanıtı, mesajın teslim edildiği anlamına gelmez. Uygulama otomatik mesaj veya OTP göndermez.

Gelen WhatsApp Kurulumu altında işletmeye özel webhook adresi gösterilir: `/api/webhooks/whatsapp/:businessId`. Meta'da bu URL ve aynı doğrulama belirteciyle kurulumu yapıp `messages` alanına abone olun. POST bildirimlerinin ham gövdesi, Uygulama Gizli Anahtarı ile HMAC-SHA256 üzerinden doğrulanır. Bildirimdeki telefon kimliği de işletmenin kayıtlı kimliğiyle eşleşmelidir. Mesaj içeriği/telefon numaraları saklanmaz; mesaj ve teslimat bildirimi sayıları işletme loguna yazılır. Bu bir sohbet/gelen kutusu ekranı değildir.

## Kontrol

Otomatik testler sahte sağlayıcı yanıtlarıyla şifreleme, işletme kapsamı, doğrulama hataları, webhook imzası ve telefon kimliği kontrollerini doğrular. Tarayıcı testleri mobil/masaüstü ekranlarını ve her iki robot sağlayıcısıyla giriş tokenının aktarılmasını kontrol eder. Gerçek anahtarlarla dış bağlantı ve mesaj teslimatı yayından sonra ayrıca denenmelidir; geliştirme sırasında gerçek mesaj gönderilmez.

Kaynaklar: [Cloudflare sunucu doğrulaması](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Google reCAPTCHA v2](https://developers.google.com/recaptcha/docs/display), [Google sunucu doğrulaması](https://developers.google.com/recaptcha/docs/verify), [Meta WhatsApp Cloud API koleksiyonu](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api).

## Ardışık iskonto

İskonto ifadeleri toplanmaz; her oran kalan tutara uygulanır. `20+20` eşdeğer `%36`, `10+10` eşdeğer `%19` olur. Enter sonrasında veya kaydetmede eşdeğer oran mevcut sayısal iskonto alanına yazılır. Geçmişte tek oran olarak kaydedilmiş değerlerin hangi ifadeden geldiği bilinmediğinden bunlar otomatik değiştirilmez.

## SMS (Netgsm)

Entegrasyonlar → İletişim altındaki SMS kartı yalnızca Netgsm ile çalışır.

- **Alanlar:** Sağlayıcı (sabit Netgsm), API Adresi (boşsa `https://api.netgsm.com.tr/sms/rest/v2/send`), Kullanıcı / Hesap Adı, API Anahtarı / Şifre, Gönderici Başlığı, Test Telefon Numarası.
- **Saklama:** `isletme_ayarlari` tablosunda `sms` bölümü. Şifre AES-256-GCM ile şifreli saklanır; GET yanıtında değeri dönmez, yalnızca `configured` listesinde adı görünür.
- **Kaydetme:** yüzen adadaki Kaydet. SMS'i etkinleştirmeden önce kullanıcı adı, şifre ve gönderici başlığı zorunludur.
- **Test:** `POST /api/hesap/ayarlar/sms/test`, gövde `{ number }` (boşsa kayıtlı test numarası kullanılır). Numara `5XXXXXXXXX` biçimine normalize edilir; baştaki `0` ve `+90` atılır.
- **Netgsm yanıtı:** HTTP 200 gelse bile sonuç gövdedeki `code` alanındadır — `00` başarı, `20/30/40/50/70` hata. Ekranda Türkçe karşılığı gösterilir; `30` çoğunlukla sunucu IP'sinin Netgsm panelinde yetkili olmamasıdır.
- **Zaman aşımı:** 15 saniye; servis yavaşladığında istek kilitlenmez.

# Sunucu varsayılan robot doğrulaması

Kök `.env` dosyasında `ROBOT_PROVIDER=cloudflare`, `TURNSTILE_SITE_KEY` ve `TURNSTILE_SECRET_KEY` tanımlanır. Google v2 için `ROBOT_PROVIDER=recaptcha`, `RECAPTCHA_SITE_KEY` ve `RECAPTCHA_SECRET_KEY` kullanılır. `none` doğrulamayı sunucuda kapatır. Etkin sağlayıcının iki anahtarı eksikse API yapılandırma hatasıyla başlamaz.

İşletmenin veritabanında etkin sağlayıcı varsa önceliklidir. İşletme açıkça kapalı kaydetmişse sunucu varsayılanı o işletme için uygulanmaz. İki sağlayıcı için de kayıtlı açık/kapalı tercihi yoksa sunucu varsayılanı kullanılır. Bilinmeyen e-posta adreslerinde de sunucu varsayılanı geçerlidir. Anahtarlar backend tarafından okunur; gizli anahtarlar `VITE_` değişkeni yapılmaz. Değişiklikten sonra API yeniden başlatılır.

E-posta ekranı açılınca sunucu varsayılanı, geçerli e-posta yazılınca işletmeye ait sağlayıcı önceden yüklenir. Kod ve şifre ekranları da doğrulamayı tıklama beklemeden yükler. Doğrulama tamamlanana kadar devam düğmesi kapalıdır. Google/Apple OAuth girişinde bu kutu kullanılmaz.
