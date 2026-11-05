# Markaların kalıcı kaydı

Gerçek kullanıcı Markalar ekranında API üzerinden kendi verileriyle çalışır. Test kullanıcısı ayrı `brand.demo.ts` servisini kullanır; veritabanına yazmaz. Yeni gerçek hesaplara örnek marka eklenmez.

Markanın adı, kullanıcı kimliği, aktifliği ve sırası mevcut `stok_secenekleri` kaydında tutulur (`liste_turu = brands`). Yeni `markalar` tablosu aynı kimliğe bire bir bağlıdır: `kimlik`, `aciklama`, `logo_verisi`, `logo_ozeti`, `seo_basligi`, `seo_aciklamasi`, `guncelleme_zamani`. Prisma modeli `Marka`, alan adları Türkçedir. Böylece aynı marka iki farklı kayda dönüşmez; mevcut stok kartlarının marka bağlantıları korunur. Eski marka seçeneklerinin ayrıntı kayıtları migration ile oluşturulur.

Ürün sayısı `stok_kartlari` ilişkilerinden hesaplanır. Marka/ürün işlemleri oturumdaki kullanıcıya göre sınırlandırılır; istemciden kullanıcı kimliği kabul edilmez. Aynı kullanıcının stok ve marka yazmaları ortak kilit altında transaction ile yürür. Toplu atamada tek bir ürün bile başka kullanıcıya aitse işlem bütünüyle reddedilir. Çıkarma yalnızca hâlen o markada olan ürünlere uygulanır. Marka silindiğinde ürünler korunur, marka alanları boşaltılır. İşlem başarısız olursa bütün değişiklikler geri alınır.

Marka adı zorunlu ve en çok 120 karakterdir. Aynı kullanıcıda Türkçe harf ve büyük/küçük harf normalizasyonuyla yinelenen ad reddedilir. Açıklama en çok 10000, SEO başlığı 250, SEO açıklaması 1000 karakterdir. Sıralama tam listeyi doğrular; eksik, yinelenen veya başka kullanıcıya ait kimlik kabul edilmez. Pasif markalar yönetim ekranında ve geçmiş ürünlerde kalır; yeni stok seçiminde gösterilmez.

Logo en çok 2 MB olabilir. PNG, JPEG, WebP ve SVG içerikleri sunucuda çözülür, en çok 800×800 ölçüde WebP olarak yeniden kodlanır. Orijinal dosya adı veya geçici `blob:` adresi saklanmaz. Liste yanıtında logo içeriği yerine korumalı API adresi döner. Logo yalnızca sahibi tarafından okunabilir. Logo kaldırma ve marka kaydı aynı transaction içindedir.

Arayüz kayıt hatasında formu ve alanları korur; ürün atama hatasında iyimser değişikliği geri alır. Başarı bildirimi yalnızca sunucu onayından sonra gösterilir. Ekranın mevcut tasarımı ve responsive yerleşimi korunur.

## Uygulama ve doğrulama

Sunucuda standart dağıtım `bash deploy/update.sh` yeni Prisma istemcisini üretir, derler ve `20261105190000_markalar` migration'ını uygular. Bu çalışma canlı veritabanını değiştirmez; dağıtım ayrıca yapılır.

`DB_MIGRATION_TEST_URL` ayrı yerel MySQL sunucusunu göstermelidir. `npm run db:test:stock` geçici ve rastgele adlı veritabanında eski marka/ürün ilişkilerinin korunmasını, HTTP yetkilendirmesini, logo kaydını, ürün atamalarını, sıralamayı, stok seçimlerini ve hata durumunda geri almayı doğrular. `npm run db:test:stock:browser` ayrıca gerçek API/MySQL ile 320, 390, 768 ve 1440 genişliklerinde marka ve stok kayıt akışlarını çalıştırır. Test sonunda geçici veritabanı kaldırılır.
