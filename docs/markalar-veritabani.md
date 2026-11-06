# Markaların kalıcı kaydı

Gerçek kullanıcı Markalar ekranında API üzerinden kendi verileriyle çalışır. Test kullanıcısı ayrı `brand.demo.ts` servisini kullanır; veritabanına yazmaz. Yeni gerçek hesaplara örnek marka eklenmez.

Marka bütün bilgileriyle bağımsız `markalar` tablosundadır: `id`, `kullanici_id`, `marka_kodu`, `marka_adi`, `ad_hash`, `etkin`, `sira`, `olusturma_zamani`, `aciklama`, `logo_dosyasi`, `logo_hash`, `seo_basligi`, `seo_aciklamasi`, `guncelleme_zamani`. `logo_verisi` yalnızca eski kayıtları taşımak için geçici uyumluluk alanı olarak korunur ve taşınan kayıtlarda boşaltılır. Stok kartı doğrudan marka tablosuna bağlanır. API marka kimliği sayısal `id` alanıdır.

Ürün sayısı `stok_kartlari` ilişkilerinden hesaplanır. Marka/ürün işlemleri oturumdaki kullanıcıya göre sınırlandırılır; istemciden kullanıcı kimliği kabul edilmez. Aynı kullanıcının stok ve marka yazmaları ortak kilit altında transaction ile yürür. Toplu atamada tek bir ürün bile başka kullanıcıya aitse işlem bütünüyle reddedilir. Çıkarma yalnızca hâlen o markada olan ürünlere uygulanır. Marka silindiğinde ürünler korunur, marka alanları boşaltılır. İşlem başarısız olursa bütün değişiklikler geri alınır.

Marka adı zorunlu ve en çok 120 karakterdir. Aynı kullanıcıda Türkçe harf ve büyük/küçük harf normalizasyonuyla yinelenen ad reddedilir. Açıklama en çok 10000, SEO başlığı 250, SEO açıklaması 1000 karakterdir. Sıralama tam listeyi doğrular; eksik, yinelenen veya başka kullanıcıya ait kimlik kabul edilmez. Pasif markalar yönetim ekranında ve geçmiş ürünlerde kalır; yeni stok seçiminde gösterilmez.

Logo en çok 2 MB olabilir. PNG, JPEG, WebP ve SVG, Base64 ile aktarılır; doğrulandıktan sonra **orijinal baytları ve boyutları değiştirilmeden** `UPLOADS_DIR/markalar` klasörüne kaydedilir. Orijinal ad yerine sunucunun ürettiği dosya adı kullanılır; SQL'de yalnızca dosya adı ve hash tutulur. Dosyalar doğrudan web'e açılmaz, yalnızca sahibi korumalı API'den okuyabilir. Base64 yanıtı ve indirme de özgün içeriği döndürür. SVG yanıtında kısıtlayıcı CSP uygulanır.

Önceki SQL BLOB kayıtları API başlarken dosyaya yazılıp okunarak doğrulanır; ancak sonra SQL içeriği boşaltılır. Kesinti olursa henüz taşınmayanlar bir sonraki başlangıçta tekrar denenir. Önceki sistemin WebP'ye çevirdiği dosyaların özgün halleri bu geçişle geri getirilemez. Yeni dosya oluşturma ve veritabanı kaydı aynı fiziksel transaction değildir: başarısız işlemler veya süreç kesintisinde referanssız dosya kalabilir. Belirsiz veritabanı sonucu durumunda dosya, veri kaybını önlemek için silinmez. Klasör veritabanıyla birlikte yedeklenmelidir.

Arayüz kayıt hatasında formu ve alanları korur; ürün atama hatasında iyimser değişikliği geri alır. Başarı bildirimi yalnızca sunucu onayından sonra gösterilir. Ekranın mevcut tasarımı ve responsive yerleşimi korunur.

## Uygulama ve doğrulama

Sunucuda standart dağıtım `bash deploy/update.sh` yeni Prisma istemcisini üretir, derler ve bekleyen migration'ları uygular. Bağımsız marka geçişi `20261106120000_bagimsiz_markalar` içindedir. Bu çalışma canlı veritabanını değiştirmez; dağıtım ayrıca yapılır.

`DB_MIGRATION_TEST_URL` ayrı yerel MySQL sunucusunu göstermelidir. `npm run db:test:stock` geçici ve rastgele adlı veritabanında eski marka/ürün ilişkilerinin korunmasını, HTTP yetkilendirmesini, logo kaydını, ürün atamalarını, sıralamayı, stok seçimlerini ve hata durumunda geri almayı doğrular. `npm run db:test:stock:browser` ayrıca gerçek API/MySQL ile 320, 390, 768 ve 1440 genişliklerinde marka ve stok kayıt akışlarını çalıştırır. Test sonunda geçici veritabanı kaldırılır.
