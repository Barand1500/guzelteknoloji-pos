# Stok ve kategori API sözleşmesi

2026-11-06 güncellemesi: Ürünler, Kategoriler, Fırsatlar ve Özellikler ekranları gerçek oturumda API/MySQL kullanır. Deneme kullanıcısı ayrı `.demo.ts` servislerinde kalır. Shared paket değiştirilmedi; mevcut stok taslağı adaptörü korunur. Ürün görseli, ürün açıklaması ve ürün SEO kayıtları ayrı kapsamdır. E-posta kodları bilinçli olarak MySQL'dedir. Fırsat ve özellik uçları: [katalog-api.md](katalog-api.md).

## Veritabanı

- `stok_birimleri.stok_karti_id`: birimler doğrudan karta aittir. Barkod, çarpan, ana/varsayılan durum, ağırlık ve ölçüler bir kez tutulur.
- `stok_barkodlari.stok_birimi_id`: ortak birime bağlıdır.
- `stok_fiyatlari`: `stok_birimi_id + fiyat_listesi_id + fiyat_yonu` benzersizdir. `fiyat_listesi_id`, `stok_secenekleri.id` alanına bağlıdır. Alış/satış tutarı, KDV ve indirim her fiyat listesinde ayrı tutulur.
- `stok_ek_fiyatlari`: fiyat kaydına bağlı kalır.
- `stok_fiyat_listeleri` ara tablosu kaldırılır.
- `stok_kartlari.satisa_acik`: varsayılan true. `stok_miktari`: DECIMAL(18,6), varsayılan 0. Takip durumu ayrı sütuna kopyalanmaz; `envanter_takibi='yok'` kapalı demektir.
- `kategoriler`: `id`, `kullanici_id`, `ust_kategori_id`, `ad`, `aciklama`, `gorsel_dosyasi`, `etkin`, `gizli`, `sira`, `seo_basligi`, `seo_aciklamasi`.
- `stok_karti_kategorileri`: `stok_karti_id + kategori_id` birleşik anahtarıyla çoktan çoğa bağlantı.

Migration `20261106210000_ortak_stok_kategori`, henüz uygulanmamış eski katalog taslağının yerini alır. Önceki migration'lar değiştirilmez. Eski test kayıtlarında `(sira,id)` sırasındaki ilk fiyat listesinin birimleri alınır; diğer listelerin aynı birim seçeneğinin aynı sıradaki eşleşen fiyatları korunur. Eşleşmeyen eski test birimleri, barkodları ve fiyatları silinir. Kartlar, kullanıcılar, markalar ve logolar silinmez. Geçiş çalışan API durdurulduktan sonra standart dağıtımda uygulanmalıdır.

`docs/veritabani-guncel.sql` boş veritabanı için güncel şema referansıdır; mevcut veritabanında güncelleme olarak çalıştırılmaz. Mevcut veritabanında `npm run db:deploy` kullanılır.

## Kart oluşturma ve düzenleme

`POST /api/stok/kartlar` ve `POST /api/stok/kartlar/:id/guncelle` gövdesi `{draft, requestId}`. Kullanıcı ID'si gövdeden alınmaz. Güncelleme kartın ID'sini, kategori bağlantılarını, satış durumunu ve stok miktarını korur. Fiyat/birim değişiklikleri tek transaction içindedir; başarısızlıkta tamamı geri alınır.

`GET /api/stok/kartlar/:id` doğrudan formun beklediği draft nesnesini döndürür. Önceki ayrıntılı ilişkisel yanıtın yerine bu kullanılır. `/api/stok/kartlar/:id/form` aynı yanıt için uyumluluk yoludur.

Yeni stok kartı yan panelleri için `GET /api/stok/kartlar/:id/ekler` → `{categoryIds, dealIds}`. Oluşturma/güncelleme gövdesinde isteğe bağlı `extras: {categoryIds, dealIds}` kabul edilir; ID'ler sayısal veya sayısal metin olabilir. Seçimlerin tümü oturum sahibine ait olmalıdır. Bu alan gönderildiğinde iki ilişki listesi kart/birim/fiyatlarla aynı transaction içinde değiştirilir; boş dizi bağlantıları temizler. Alan gönderilmezse eski bağlantılar korunur. Tekrar isteği hash'ine bu seçimler de katılır. Shared paket değiştirilmedi.

Shared paket güncellemesi beklenirken mevcut `draft.units` (liste kodu → birim satırları) kabul edilir. Tüm listelerde birim sırası, birim türü, çarpan, barkod, ölçüler ve ana/varsayılan bayrakları aynı olmalıdır. Satır ID'lerinin aynı olması gerekmez. Yalnızca fiyat blokları farklı olabilir. Farklı ortak bilgiler 400 hatasıyla reddedilir; sessizce ilk listenin bilgileriyle değiştirilmez. Veritabanında birimler ve barkodlar yine tek kayıttır. Bu geçici adaptör yeni shared yapısı geldiğinde kaldırılabilir.

`requestId` bir kayıt ID'si değildir; tekrar gönderilen isteği tanıyan UUID anahtarıdır. Kart ID'leri sıralı sayıdır. Son başarılı kaydetmenin aynı anahtar ve aynı içerikle tekrarı aynı kart ID'sini döndürür; anahtar farklı içerik/kart için tekrar kullanılamaz. Yeni düzenlemelerde yeni requestId gönderilir.

## Sayfalı ürün listesi

`GET /api/stok/kartlar?arama=&sayfa=1&boyut=10&kategori=&marka=&stok=all&satis=all`

- `boyut`: 1–200. `sayfa`: 1'den başlar.
- `kategori`, `marka`: tek sayısal ID; boş değer filtresizdir. Kategori filtresi ürünün herhangi bir eşleşmesine bakar.
- `stok`: `all`, `in`, `out`, `unlimited`.
- `satis`: `all`, `open`, `closed`.
- Arama ürün adı, kod, marka ve barkod üzerinde yapılır.
- Yanıt: `{items: ProductItem[], total, page, pageSize}`. Toplam ve sayfa aynı veritabanı görünümünden okunur.

Satırda `ProductItem` alanları bulunur: `id`, `code`, `name`, `stockType`, `brandId`, `brandName`, `categoryId`, `categoryName`, `imageUrl`, `currency`, `vatRate`, `prices`, `cost`, `stock`, `stockTracking`, `salesOpen`, `dealIds`.

Çoklu kategori için `categoryIds` ve `categoryNames` de döner. Eski `categoryId` en küçük ID'li ilk kategoridir, `categoryName` tüm adların birleşimidir. Çoklu kategori seçimi/filtrelemesinde `categoryIds` kullanılmalıdır.

`prices[0..2]`: ana birimin `fiyat`, `perakende`, `toptan` listelerindeki KDV hariç, indirim uygulanmış satış fiyatları. `cost`: `fiyat` listesinin KDV hariç alış fiyatı. Hesap veritabanındaki ondalıklarla yapılır. Eksik tutar 0 gösterilir; başka listeden fiyat kopyalanmaz. Ana birim yoksa fiyatlar 0'dır. Eski `currency` simge, `vatRate` ilk satış fiyatının oranıdır. Fiyat listelerinde farklı KDV/para birimleri kullanılabildiği için `priceVatRates` ve ISO kodlu `priceCurrencies` dizileri ayrıca döner; ön yüz farklı oranları gösterirken bunları kullanmalıdır.

`dealIds`, `stok_firsatlari` ilişkilerinden döner. Ürün görseli kapsamı ertelendiğinden `imageUrl: null` döner; örnek ürün görseli üretilmez. Ön yüz her fiyatın kendi `priceVatRates` / `priceCurrencies` bilgisini kullanır. Alış fiyatı için `costVatRate`, `costCurrency` döner; farklı para birimlerindeki alış/satış arasında kâr yüzdesi hesaplanmaz.

Ön yüz mevcut çoklu süzgeçleri ve sayfalama düzenini korumak için sayfalı API'den tüm kayıtları 200'lük parçalarla yükler. Sahte ürün listesine geri dönmez. `kimlik` sorgusu tek ürün satırını seçer. Gerçek hesapta düzenleme ve kopyalama aynı stok kartı API'sini kullanır; metin ID'li deneme ürünü istisnası kaldırıldı.

## CSV ürün aktarımı

- `POST /api/stok/aktarim/onizle`: `{text}` → `{rows, missingColumns, newCount, updateCount, errorCount}`.
- `POST /api/stok/aktarim/kaydet`: `{text}` → `{created, updated, errors: string[]}`.
- UTF-8 CSV, en fazla 400.000 karakter ve 1000 satır. Zorunlu sütunlar: Stok Kodu, Ürün Adı, Fiyat 1. Fiyatlar KDV hariçtir; 6 ondalık basamağa kadar kabul edilir.
- Aynı stok kodu varsa mevcut kart güncellenir. Dosyada tekrarlanan kodun ikinci satırı reddedilir. Boş isteğe bağlı alanlar güncellemede önceki değerleri korur. Stok miktarı verilince kapalı stok takibi açılır. Diğer satış/takip ayarları ve kategori bağları korunur.
- Marka mevcut aktif marka adıyla eşleşir; aktarım sessizce marka veya kategori oluşturmaz. Kategori adına birden fazla eşleşme varsa `Ana > Alt` tam yolu gerekir; kategori eklemesi mevcut bağları silmez.
- Önizleme yazma yapmaz. Onayda yeniden doğrulanır. Her geçerli satır, birim/fiyat/stok/kategoriyle tek transaction içinde kaydedilir. Hatalı satırlar atlanır ve nedenleri döner; kısmi hata ekranda gösterilir.

Stok kartı formunda birim ve barkod değişiklikleri artık bütün fiyat listelerine birlikte yansır; yalnızca alış/satış fiyat blokları listeye özeldir. Shared paketin geçici liste temelli gövdesi veritabanında çoğaltılmaz.

## Toplu işlem

`POST /api/stok/kartlar/toplu`

Gövde: `{ids: number[], islem: 'stok_ac'|'stok_kapat'|'satis_ac'|'satis_kapat'|'sil'}`. En fazla 1000 farklı ID; boş seçim kabul edilmez. Yanıt `{affected: number}`. Tek bir ID bile kullanıcıya ait değilse tüm işlem reddedilir.

`stok_ac`, yalnızca takibi kapalı kartları `normal` yapar; mevcut seri/lot/ömür takibini değiştirmez. `stok_kapat`, `yok` yapar. Miktarlar korunur. Silme kartın ortak birimlerini, fiyatlarını, barkodlarını ve kategori bağlantılarını kaldırır; kategorileri ve markaları kaldırmaz.

## Kategori işlemleri

Temel yol `/api/kategoriler` (uyumluluk: `/api/katalog/kategoriler`).

- `GET /`: kategori listesi ve hesaplanmış `productCount`, `childCount`.
- `POST /`: CategoryDraft ile oluşturur.
- `POST /:id`: CategoryDraft ile günceller.
- `POST /:id/tasi`: `{parentId: string|number|null}`.
- `POST /:id/aktiflik`: `{active: boolean}`.
- `POST /sirala`: `{parentId, ids}`. Tam kardeş listesi zorunludur.
- `POST /:id/sil`: kategori ve alt dalları kaldırır; ürünler ve diğer kategori eşleşmeleri korunur.
- `GET /urunler`: ürün özetleri, `categoryIds` ve eski istemci için ilk `categoryId`.
- `POST /:id/urunler/ata`: `{productIds}`; mevcut kategorileri koruyup kategoriyi ekler.
- `POST /:id/urunler/cikar`: `{productIds}`; yalnızca bu kategoriyi çıkarır.
- `GET /:id/gorsel`: kullanıcıya ait kategori görselinin özgün içeriği.

CategoryDraft: `{parentId, name, description, imageUrl, active, hidden, seoTitle, seoDescription}`. Kategori kendi altına taşınamaz. Başka kullanıcıya ait üst kategori veya ürün kabul edilmez. Aynı üst kategoride aynı ad reddedilir. Görsel Base64 ile gelir; özgün baytlar `UPLOADS_DIR/kategoriler` altında korunur. Veritabanında yalnızca dosya adı tutulur. PNG/JPEG/WebP/SVG, en fazla 2 MB. Görsel değiştirilmediyse API'den gelen imageUrl aynen gönderilir; null görseli kaldırır. SVG kısıtlı CSP ile sunulur.

## Bekleyen logo temizliği

`markalar.logo_verisi` bu değişiklikte kaldırılmaz. Sunucudaki tüm eski logoların dosyaya taşındığı ve yedeğinin alındığı doğrulandıktan sonra ayrı migration ile kaldırılabilir. Bu bilgisayardaki çalışma sunucu veritabanını doğrulamaz veya değiştirmez.
