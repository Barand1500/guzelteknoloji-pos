# Yeni ürün ekranı ve veritabanı

Migration: `20261109000000_urun_adlandirma_sadelestirme`.

- `stok_kartlari` tablosu `urunler` oldu. Bağlı birim, barkod, fiyat, görsel, kategori, fırsat, özellik ve varyant tabloları `urun_*` adlarına taşındı. Seçenekler `urun_secenekleri` içinde.
- Ürün bağlantıları `urun_id`, birim bağlantıları `urun_birimi_id`; ürün alanları `urun_kodu`, `urun_adi`, `urun_tipi_id` oldu. Mevcut ID, ürün, barkod, normal fiyat, görsel ve bağlantı kayıtları yeniden oluşturulmaz.
- Yeni ekranda kaldırılan KDV departmanı, ürün nevi, GTIP ve birim açıklaması sütunları kaldırılır. Bu alanların eski değerleri korunmaz. Kullanılmayan KDV departmanı/nevi seçenekleri silinir.
- Ek alış/satış fiyatı özelliği kaldırıldığı için `stok_ek_fiyatlari` tablosu ve kayıtları kaldırılır. FİYAT, PERAKENDE, TOPTAN gibi fiyat listeleri korunur; bunlar ek fiyat tablosu değildir.
- Diğer vergi, alış/satış KDV oranları, miktar, limitler, marka/kategori aktifliği, kategori gizliliği ve hiyerarşisi korunur. Bunların yeni arayüzde karşılıkları veya mevcut kayıtlarda kullanımları var.
- `20261109010000_urun_takip_sadelestirme` migration'ı Seri/LOT/Ömür alanlarını kaldırır. Eski takipli ürünler Evet (`normal`) durumuna geçirilir; miktarları korunur. Seri numarası/LOT önekleri ve raf ömrü gibi kaldırılan alanların değerleri silinir. API yalnızca Evet/Hayır (`normal`/`yok`) kabul eder.
- Menşei yeni ülke kodlarını da mevcut serbest metin değerlerini de saklar; bayrak frontend tarafından türetilir.
- Varyantların iş modeli değiştirilmedi; yalnızca tablo ve ürün bağlantı adları güncellendi.
- İş verisi JSON/metin dizi alanlarına taşınmadı. Çoklu ilişkiler ayrı satırlarda kalır.
- Toplu görsel ekranındaki mevcut/yeni görsel sırası `urun_gorselleri.sira` alanına kaydedilir. İlk sıra vitrin görselidir. Gönderilen sıra ürünün tüm görsellerini içermelidir; eksik, yinelenen veya başka ürüne ait görseller reddedilir. Yeni tablo gerekmez.
- `20261109020000_urun_coklu_vergiler` ile her seçilen diğer vergi ve oranı `urun_vergileri` içinde ayrı satırda saklanır. Eski tek vergi bu tabloya taşınır; bilinmeyen oran boş kalır. `urunler.diger_vergi_id` kaldırılır. MTV, Alış ÖTV ve Satış ÖTV seçenekleri mevcut kullanıcılar için de tamamlanır. Bu kayıtlar yalnızca girilen oranları saklar; fiyat hesaplamasına yeni bir vergi hesaplama kuralı eklenmez.

API adresleri ve uygulama içindeki Prisma model adları uyumluluk için aynı kalır. Yeni arayüzün ortak taslak tipi kaldırılan bazı alanları hâlâ taşıyor; API bunları kaydetmez ve okurken boş değer döndürür (ek fiyatlar boş dizi). Ürün nevi artık zorunlu değildir. Kaldırılmış seçenek listelerine yeni kayıt oluşturulamaz.

Dağıtım sırasında yeni kodla birlikte migration uygulanmalıdır. `docs/veritabani-guncel.sql` mevcut veritabanının üstüne çalıştırılacak güncelleme dosyası değildir. Güncelleme Prisma migration ile yapılır.
