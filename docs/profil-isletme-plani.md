# Profil ve işletme yönetimi

Profil simgesi küçük menü açar: Profil, Kullanıcılar, Roller, Ayarlar, Log Kayıtları, Çıkış Yap.
Alt sayfalar aynı tasarım sisteminin input, modal ve butonlarını kullanır.

- Bir işletme sahibi ve işletmeye bağlı üyeler. Kişiler kendi doğrulanmış e-posta girişleriyle katılır.
- Roller bölüm bazında Görüntüle, Kaydet, Sil. Kaydet/Sil, Görüntüle gerektirir. Sunucu zorunlu kontrol eder.
- İşletme sahibinin erişimi kapatılamaz; işletmenin son yöneticisi kaybolmaz.
- Ayarlar: Genel, Görseller ve Entegrasyonlar olarak gruplanır. SMTP, IMAP, Google, Cloudflare Turnstile, Meta WhatsApp Cloud API ve Google reCAPTCHA v2 ayrı sekmelerdir. Sırlar normal ayar yanıtlarında geri döndürülmez.
- Log: kullanıcı, zaman, bölüm, işlem, sonuç ve gizli olmayan alan değişiklikleri. Şifre/token/e-posta içerikleri kaydedilmez.
- Görseller sekmesinden ürün, marka, kategori ve özellik görsellerinin açık renkli fonu (düz beyaz ya da yukarıdan aşağıya koyulaşan gri gradyan) gösterimde temizlenebilir. Fon yalnızca kenardan bağlantılı ve satır bazında ölçülen fon rengine çok yakın piksellerde kaldırılır; açık gri ürün gövdeleri ve ince detaylar korunur. Çanta kulpu gibi nesnenin içinde kalan, dış fonla aynı renkteki büyük ve tek düze boşluklar da saydam yapılır; küçük beyaz logo/etiketler korunur. Kenar pikselleri fon renginden arındırılıp kapsama oranına göre yumuşatılır, ürün silueti kırpılmaz. İşlem tarayıcıda, en fazla 1024 piksel önizleme üzerinden yapılır; özgün dosya değişmez. Ayar kapanınca özgün görsel gösterilir. Renkli veya karmaşık arka planları ayıran bir nesne segmentasyonu uygulanmaz; stüdyo gölgesi görselde kalabilir.

Mevcut katalog kayıtlarının kullanıcı bağlantıları korunur. İşletmenin veri sahibi eski işletme sahibidir; üyeler sunucunun belirlediği bu ortak veri kapsamını kullanır. Kimlik doğrulama daima gerçek kullanıcıya aittir. İstemcinin veri sahibi kimliği seçmesine izin verilmez.

## Kurulum ve kapsam

`20261110000000_isletme_profil_yetkiler` migration'ı mevcut kullanıcıların işletme ve sahip üyeliklerini oluşturur. Yeni tablolar: `isletmeler`, `isletme_uyeleri`, `isletme_rolleri`, `rol_yetkileri`, `isletme_ayarlari`, `islem_kayitlari`, `islem_degisiklikleri`. Alanlar ayrı sütunlarda ve ilişkili satırlarda tutulur.

Hesap uçları `/api/hesap` altındadır. Profil, kullanıcılar, roller, ayarlar ve loglar ayrı uçlara sahiptir. Bir kullanıcı bu sürümde tek işletmeye bağlıdır. Kullanıcı ekleme, doğrulanmış e-posta ile sonraki girişte katılınabilen bir davet kaydı oluşturur; otomatik davet e-postası gönderilmez.

SMTP, IMAP ve Google bağlantılarında öncelik işletmenin veritabanındaki bağlantı kaydıdır. Bağlantı bilgisi girilmemişse ilgili sunucu ortam değişkenleri kullanılır. Eksik işletme kaydı env şifresiyle tamamlanmaz; hata gösterilir. Kaynak bilgisi arayüzde gösterilir, ortak env şifreleri veya istemci anahtarları kullanıcıya döndürülmez. Bağlantı testi e-posta göndermez veya posta kutusu içeriği çekmez; IMAP posta okuma ekranı bu kapsamda yoktur.

Giriş kodu gönderiminde `createWorkspaceMailer` alıcı adresini sunucudaki etkin işletme üyeliğinden çözer; kullanıcının istekte işletme seçmesine izin verilmez. O işletmenin SMTP kaydı varsa gerçek `sendMail` bu kayıtla çağrılır. Üyelik veya işletme bağlantı kaydı yoksa ortak `createMailer` (.env) kullanılır. Hatalı işletme SMTP kaydında başka hesaba sessiz geçiş yapılmaz. IMAP ortam değişkenleri `IMAP_HOST`, `IMAP_PORT` (varsayılan 993), `IMAP_USER`, `IMAP_PASS` olarak tanımlıdır.

Google işletme bağlantısı yalnızca temel profil/e-posta izinlerini kullanır; Gmail senkronizasyonu içermez. Bağlantı kaydı yoksa env istemcisi kullanılır. Anonim Google girişinde işletme henüz belirlenemediğinden ortak env istemcisi kullanılır. Ayarlarda girilen istemci kimliği mevcut Google girişindekiyle aynıysa, aynı origin üzerindeki kayıtlı `/api/auth/google/callback` dönüş adresi kullanılır. İmzalı state ve oturum kontrolü işletme bağlantısını normal girişten ayırır. Başka istemcide `/api/hesap/google/callback` kullanılır. Ekranda gösterilen tam adres Google Cloud’daki yetkili yönlendirme URI’leriyle birebir eşleşmelidir. [Google OAuth kurulumu](https://developers.google.com/identity/protocols/oauth2/web-server).

Yeni işletmelerin bağlantı bilgileri boş başlar. Formda yazılan bilgiler o işletmenin ayar satırlarına kaydedilir; yeni şifre girilirse eskisinin yerine geçer. Normal kayıtta boş şifre mevcut değeri korur. Kayıtlı bilgiyi kaldır kutusu arayüzde bulunmaz.

SMTP ve IMAP için `allowInvalidCertificate` tercihi aynı ayar tablosunda bağlantı başına saklanır. Varsayılan kapalıdır. Açıkça `true` kaydedilirse o bağlantıda sertifika doğrulaması atlanır; TLS/STARTTLS şifrelemesi devam eder. Uygulama genelinde sertifika kontrolü kapatılmaz.

Gizli entegrasyon değerleri AES-256-GCM ile şifrelenir. Anahtar `COOKIE_SECRET` üzerinden türetildiğinden bu değer değiştirilecekse kayıtlı sırların taşınması veya yeniden girilmesi gerekir. Normal ayar yanıtları şifre/token değerlerini içermez. Göz düğmesiyle açıkça istendiğinde Ayarlar/Kaydet yetkisi kontrol edilerek yalnızca tanımlı şifre veya istemci anahtarı gösterilir; yanıt `no-store` taşır. Tokenlar bu uçtan gösterilmez. Görüntüleme işlemi loglanır, gizli değer loga yazılmaz.

Loglar kullanıcı arayüzünden değiştirilemez veya silinemez. Yazma isteklerinde başlangıç kaydı, yanıt tamamlandığında sonuç kaydı tutulur; bu son güncelleme alan işlemiyle aynı veritabanı transaction'ında değildir. Beklenmedik kapanmada kayıt “İşleniyor” durumunda kalabilir. Alan değişiklikleri boyut sınırlarıyla özetlenir; tam veritabanı geçmişi veya giriş denemeleri günlüğü değildir. Şifreler ve tokenlar loglanmaz.

Sunucuya yayın sonrası mevcut migration'lar uygulanmalı; sahip hesabı, yetkili/yetkisiz personel, davetle katılma ve gerçek entegrasyon bağlantıları sunucuda kontrol edilmelidir. Beyaz fon temizleme tercihleri mevcut `isletme_ayarlari` tablosunda `bolum=images` ve sayfa başına ayrı anahtar/satır ile saklanır; bu düzenleme ek migration gerektirmez. Hesap bilgileriyle tüm kullanıcılara görünüm tercihleri iletilir, yalnızca Ayarlar/Kaydet yetkisi olanlar değiştirir.
