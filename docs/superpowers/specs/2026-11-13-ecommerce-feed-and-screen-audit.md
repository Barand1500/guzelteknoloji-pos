# E‑Ticaret Feed ve Ekran Bağlantıları Tasarımı

## Amaç

Google ve Meta katalog araçlarının çekebileceği, işletmeye özel ve gerçek stok kartlarından üretilen bir Google Merchant Center RSS 2.0 XML feed'i sağlamak; E‑Ticaret yönetim ekranlarında kaydedilen ancak çalışır davranışı bulunmayan alanları belirlemek.

## Mevcut durum

- Sayfa, menü, slider, widget ve şablon değişkenleri işletme kimliğiyle ilişkili Prisma tablolarında CRUD ve sıralama API'lerine bağlı.
- Site ayarları `isletme_ayarlari` tablosunda bölüm başına JSON tutuluyor.
- Ürünler `urunler`, `urun_birimleri`, `urun_fiyatlari`, `urun_barkodlari` ve `urun_gorselleri` tablolarında mevcut.
- Google/Meta XML ekranındaki açık/kapalı değeri saklanıyor; feed API'si yok ve gösterilen URL örnek.
- Ürün sayfası rotası proje içinde bulunmadığından ürün URL'si uydurulmamalı.
- ERP ekranı bağlantı bilgilerini saklıyor; ERP sağlayıcısı/protokolü verilmediği için canlı adaptör bu kapsamda kurulamaz.

## Karar

Google Merchant Center RSS 2.0 şeması üretilecek; Meta kataloglarının desteklediği RSS/XML içeriğini de aynı ürün alanları karşılayacak. İşletme, gerçek mağaza rotasıyla uyumlu mutlak HTTPS ürün URL şablonu tanımlar (`{id}`, `{code}` veya `{slug}` belirteci zorunlu). Feed URL'si işletme kimliğiyle oluşturulur. Feed yalnızca etkin, URL şablonu geçerli, satışa açık, ana görseli ve varsayılan satış fiyatı bulunan ürünleri yayınlar. Görseller için yalnızca feed etkin olduğunda erişilebilen, ürün/işletme sahipliğini doğrulayan public URL kullanılır. Dış ERP bilgisi gerektiren çalışma bu kapsamda sahte biçimde uygulanmaz.

## Güvenlik ve veri kuralları

- Kamuya açık feed yalnızca işletmenin satışa açık ürün kataloğunu döndürür; kullanıcı, müşteri veya maliyet bilgisi içermez.
- Feed kapalıysa veya URL şablonu geçersizse feed ve public ürün görsel uçları 404 döndürür.
- XML değerleri escape edilir; ürün/görsel sorguları işletme sahibine göre sınırlandırılır.
- Feed fiyatı seçili işletmenin varsayılan fiyat listesinden alınır; uygun tanım bulunmazsa `fiyat` kodlu liste, ardından ilk kullanılabilir liste kullanılır.
- Satışa kapalı, fiyatı veya görseli olmayan ürün feed dışında kalır. Stok takibi kapalı ürün `in stock`, takip edilen ve miktarı sıfır ürün `out_of_stock` olur.
- Ürün verisi/ayar yapısında veya Prisma şemasında yeni tablo/migration gerekmez.

## Ekran taraması sonucu

- Backend CRUD'u bulunan alanlar (sayfa, menü, slider, widget, değişken, görünüm, header, sistem ayarları) API/veritabanında kalır.
- XML ekranı gerçek feed URL'si ve ürün URL şablonu ile tamamlanır.
- ERP ekranı yalnızca yapılandırma deposu olarak adlandırılır; çalışan bağlantı iddiası eklenmez.
- Özel head/body kodları şu an kaydedilir ancak mağaza runtime'ında çalıştırılmaz; kod çalıştırmak ayrı storefront uygulaması gerektirir.

