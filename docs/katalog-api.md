# Fırsat ve özellik kayıtları

Gerçek oturumda dört ürün yönetim ekranı API/MySQL'e bağlıdır. Yalnızca açıkça seçilen anonim test kullanıcısı `.demo.ts` servislerini kullanır. Gerçek oturumda API hatası örnek veriyle gizlenmez; hata ve tekrar deneme görünür. Yeni migration: `20261106220000_firsat_ozellik`. Kategoriler ve ortak birimler önceki `20261106210000_ortak_stok_kategori` migration'ındadır. Dağıtımda `npm run db:deploy` çalışmalıdır; SQL referans dosyası mevcut veritabanına doğrudan uygulanmaz.

## Fırsatlar

- `firsatlar`: sayısal `id`, `kullanici_id`, `ad`, `ikon_dosyasi`, `etkin`, `resimde_goster`, `konum`, `boyut`, `seo_basligi`, `seo_aciklamasi`, `sira`.
- `stok_firsatlari`: birleşik anahtar `stok_karti_id + firsat_id`. Bir ürün birden fazla fırsata bağlanabilir. Fırsat veya ürün silinince yalnızca ilgili bağlar kaldırılır.

Temel yol `/api/firsatlar`:

- `GET /`: sıralı fırsatlar ve hesaplanmış ürün sayıları.
- `POST /`, `POST /:id`: `{name, iconUrl, active, showOnImage, position, size, seoTitle, seoDescription}`. Oluşturma 201, güncelleme 200 ve kayıt döner.
- `POST /:id/aktiflik`: `{active}`.
- `POST /sirala`: `{ids}`; kullanıcının tüm fırsatlarının tam sırası.
- `GET /urunler`: gerçek ürünlerin ad, kod, barkod ve `dealIds` bilgileri.
- `POST /:id/urunler/ata`, `POST /:id/urunler/cikar`: `{productIds}`; diğer fırsatlar korunur.
- `POST /:id/sil`: fırsatı ve ilişkilerini siler, ürünleri korur.
- `GET /:id/gorsel`: oturum sahibinin ikon dosyası.

Konum: `tl|tc|tr|bl|bc|br`; boyut: `small|medium|large`. Resimde gösterimde ikon zorunludur. Aynı kullanıcının aynı adlı fırsatı reddedilir. Bu ekran rozet tanımlar; indirim/ödeme hesaplama motoru değildir.

## Özellikler

Ekranın hiyerarşisi doğrudan saklanır:

- `ozellik_sablonlari`: sayısal `id`, `kullanici_id`, `ad`, `tum_urunler`, `sira`.
- `ozellik_sablon_kategorileri`: birleşik `sablon_id + kategori_id`; şablon birden fazla kategoriye bağlanır. Tüm ürünler seçilirse kategori bağları temizlenir.
- `ozellik_gruplari`: sayısal `id`, `sablon_id`, `ad`, `tur`, `filtre`, `coklu`, `varyant`, `resimde_goster`, `konum`, `boyut`, `sira`.
- `ozellik_degerleri`: sayısal `id`, `grup_id`, `kod`, `ad`, `renk`, `gorsel_dosyasi`, `sira`. Kod grup içinde benzersizdir.

Temel yol `/api/ozellikler`:

- `GET /`: `{templates, groups, values}`; sıralar ve grup/değer sayıları veritabanından hesaplanır.
- `POST /sablonlar`, `POST /sablonlar/:id`: `{name, allProducts, categoryIds}`.
- `POST /gruplar`, `POST /gruplar/:id`: `{templateId, name, kind, filter, multiple, variant, showOnImage, position, size}`.
- `POST /gruplar/:id/degerler`, `POST /degerler/:id`: `{code, name, color, imageUrl}`.
- `POST /sablonlar/sirala`: `{ids}`; `POST /gruplar/sirala`: `{templateId, ids}`; `POST /degerler/sirala`: `{groupId, ids}`. Her seviye için tam kardeş sırası zorunlu.
- `POST /sablonlar/:id/sil`, `/gruplar/:id/sil`, `/degerler/:id/sil`: kullanılmayan tanımları alt kayıtlarıyla siler. Ürüne veya varyanta bağlı değer varsa 409 ve açıklayıcı uyarı verir; ürün bağlantıları sessizce silinmez.
- `GET /degerler/:id/gorsel`: oturum sahibinin değer görseli.

Grup türü `text|color|image` tek seçimdir. Renkli değer `#rrggbb` renk, resimli değer görsel gerektirir. Değeri olan grubun türünü değiştirmek 409 verir; farklı biçimdeki değerler sessizce bozulmaz. Ürün veya varyantlarda kullanılan grubun şablon, çoklu seçim ve varyant ayarları bağlantılar kaldırılmadan değiştirilemez. Şablonun kategori kapsamı, o şablonu kullanan ürünleri dışarıda bırakacak şekilde daraltılamaz. Adlar şablon/kardeş grup/değer kapsamında tekrarlanamaz. Ürün üzerindeki özellik seçimi ve varyant kayıtları `docs/stok-api.md` içinde açıklanır.

## Dosyalar ve veri bütünlüğü

İkon ve özellik görselleri Base64 ile aktarılır; özgün baytlar ve biçim `UPLOADS_DIR/firsatlar` ve `UPLOADS_DIR/ozellikler` altında korunur. Boyutlandırma/WebP dönüşümü yoktur. MySQL'de dosya adı bulunur; BLOB/Base64 kopyası tutulmaz. PNG/JPEG/WebP/SVG, en fazla 2 MB; SVG kısıtlı CSP ile sunulur. Mevcut görsel korunacaksa API adresi, silinecekse null gönderilir.

Sahiplik oturumdan alınır, gövdeden kullanıcı ID'si kabul edilmez. Başka hesaba ait şablon/grup/değer/kategori/ürün yazmaya eklenemez. Yazmalar transaction içinde kullanıcı satırı kilidiyle yürür. Sıralama eksik veya eski listeyle gönderilirse işlem reddedilir. Görsel değişiminde eski dosya ancak başarılı kayıttan sonra kaldırılır; bilinen doğrulama hatasında yeni dosya geri temizlenir.

`db:test:stock` ayrı yerel MySQL veritabanında migration zinciri, kayıt okuma/güncelleme/silme, sahiplik, sıralama, ilişki ve dosya kontrollerini çalıştırır. `db:test:stock:browser` ayrıca gerçek API ile dört ekranın yenileme sonrasında kalıcılığını telefon/tablet/masaüstü ve iki temada doğrular.
