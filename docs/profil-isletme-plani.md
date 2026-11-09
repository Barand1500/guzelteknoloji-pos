# Profil ve işletme yönetimi

Profil simgesi küçük menü açar: Profil, Kullanıcılar, Roller, Ayarlar, Log Kayıtları, Çıkış Yap.
Alt sayfalar aynı tasarım sisteminin input, modal ve butonlarını kullanır.

- Bir işletme sahibi ve işletmeye bağlı üyeler. Kişiler kendi doğrulanmış e-posta girişleriyle katılır.
- Roller bölüm bazında Görüntüle, Kaydet, Sil. Kaydet/Sil, Görüntüle gerektirir. Sunucu zorunlu kontrol eder.
- İşletme sahibinin erişimi kapatılamaz; işletmenin son yöneticisi kaybolmaz.
- Ayarlar: genel, entegrasyonlar, SMTP, IMAP, Google ayrı sayfalardır. Sırlar şifrelenir ve geri döndürülmez.
- Log: kullanıcı, zaman, bölüm, işlem, sonuç ve gizli olmayan alan değişiklikleri. Şifre/token/e-posta içerikleri kaydedilmez.
- Görsel arka plan temizleme/şeffaflık davranışı kullanıcıyla ayrıca netleştirilecek; bu aşamada eklenmez.

Mevcut katalog kayıtlarının kullanıcı bağlantıları korunur. İşletmenin veri sahibi eski işletme sahibidir; üyeler sunucunun belirlediği bu ortak veri kapsamını kullanır. Kimlik doğrulama daima gerçek kullanıcıya aittir. İstemcinin veri sahibi kimliği seçmesine izin verilmez.

## Kurulum ve kapsam

`20261110000000_isletme_profil_yetkiler` migration'ı mevcut kullanıcıların işletme ve sahip üyeliklerini oluşturur. Yeni tablolar: `isletmeler`, `isletme_uyeleri`, `isletme_rolleri`, `rol_yetkileri`, `isletme_ayarlari`, `islem_kayitlari`, `islem_degisiklikleri`. Alanlar ayrı sütunlarda ve ilişkili satırlarda tutulur.

Hesap uçları `/api/hesap` altındadır. Profil, kullanıcılar, roller, ayarlar ve loglar ayrı uçlara sahiptir. Bir kullanıcı bu sürümde tek işletmeye bağlıdır. Kullanıcı ekleme, doğrulanmış e-posta ile sonraki girişte katılınabilen bir davet kaydı oluşturur; otomatik davet e-postası gönderilmez.

İşletme SMTP/IMAP ayarları kaydedilir ve bağlantı sınanabilir. Bu işlem e-posta göndermez veya posta kutusu içeriği çekmez. Uygulamanın giriş kodlarını gönderen genel SMTP ve Google giriş ayarları sunucu ortam değişkenlerinde kalır. Google işletme bağlantısı yalnızca temel profil/e-posta izinlerini kullanır; Gmail senkronizasyonu içermez. Google istemcisinde geri dönüş adresi uygulamanın `/api/hesap/google/callback` adresi olarak tanımlanmalıdır. [Google OAuth kurulumu](https://developers.google.com/identity/protocols/oauth2/web-server).

Gizli entegrasyon değerleri AES-256-GCM ile şifrelenir. Anahtar `COOKIE_SECRET` üzerinden türetildiğinden bu değer değiştirilecekse kayıtlı sırların taşınması veya yeniden girilmesi gerekir. Ayar yanıtları şifre/token değerlerini içermez.

Loglar kullanıcı arayüzünden değiştirilemez veya silinemez. Yazma isteklerinde başlangıç kaydı, yanıt tamamlandığında sonuç kaydı tutulur; bu son güncelleme alan işlemiyle aynı veritabanı transaction'ında değildir. Beklenmedik kapanmada kayıt “İşleniyor” durumunda kalabilir. Alan değişiklikleri boyut sınırlarıyla özetlenir; tam veritabanı geçmişi veya giriş denemeleri günlüğü değildir. Şifreler ve tokenlar loglanmaz.

Sunucuya yayın sonrası migration uygulanmalı; sahip hesabı, yetkili/yetkisiz personel, davetle katılma ve gerçek entegrasyon bağlantıları sunucuda kontrol edilmelidir. Görsel arka plan temizleme ve şeffaflık ayarları sonraki aşamaya bırakılmıştır.
