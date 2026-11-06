# Stok kartı kayıt yapısı

Ekranın ürün bilgileri, fiyat listeleri, birimleri, alış/satış fiyatları, ek fiyatları ve barkodları ilişkili olarak kaydedilir. Gerçek oturumda `Kaydet`, `/api/stok/kartlar` adresine istek gönderir. Başarı mesajı yalnızca sunucu kaydı tamamlayınca gösterilir. Hata halinde form korunur.

## Tablolar ve alanlar

- `stok_kartlari`: kullanıcı, stok kodu/adı, stok tipi/nevi, marka, KDV departmanı, diğer vergi seçimi, envanter takibi, alt/üst limitler, seri/LOT/SKT ayarları, raf ömrü/risk günleri, GTİP ve menşei.
- `stok_secenekleri`: kullanıcıya ait seçim listeleri ve özel eklenen seçenekler. KDV departmanı, birim ve fiyat listesi gibi seçimler kimlikleriyle bağlanır. Kullanılmış seçenekler fiziksel silinmez; pasifleştirilir ve geçmiş kartlarda korunur. Markalar bağımsız `markalar` tablosundadır.
- `stok_fiyat_listeleri`: kartın seçilen fiyat listeleri, sıraları ve ilişkileri.
- `stok_birimleri`: her listedeki birimler, çarpan, ana/varsayılan işaretleri, ağırlık ve birimi, desi, açıklama.
- `stok_fiyatlari`: her birimin alış ve satış fiyatları, para birimi, iskonto, KDV oranı/dahil bilgisi. Net, KDV hariç ve KDV dahil tutarlar ayrıca saklanmaz; okurken aynı Decimal formülüyle hesaplanır.
- `stok_ek_fiyatlari`: fiyatın ek tutarları, iskontosu, para birimi, açıklaması ve sırası.
- `stok_barkodlari`: birime bağlı barkod türü ve barkod metni. Baştaki sıfırlar korunur.

Tablo/sütun/indeks/ilişki adları Türkçe ve taşınabilirlik için ASCII'dir. Prisma kod alanları `@map` ile eşlenir. Önceki giriş tablolarına dokunulmaz.

## Kayıt kuralları

- Kullanıcı kimliği formdan alınmaz; oturumdan belirlenir. Marka, stok ve özel seçenekler kullanıcı hesabına özeldir; farklı hesaplara erişim verilmez.
- Mevcut ürün kararına uygun olarak stok kodu/adı dahil yeni zorunlu iş alanları eklenmemiştir. Boş kod/ad `NULL` olur; girilen stok kodu kullanıcı içinde tekildir. Ekrandaki doluluk göstergesi zorunluluk anlamına gelmez.
- Barkod, aynı kullanıcının başka bir kartına atanamaz. Aynı kartın farklı birim/fiyat listelerinde tekrarlanabilir; aynı birim satırında tekrarlanamaz. Kontrol ve kayıt aynı transaction ve kullanıcı satırı kilidi içinde yapılır.
- Kayıt isteğinin UUID kimliği ve içeriğinin hash'i tutulur. Aynı istek tekrarlandığında ikinci kayıt oluşturulmaz; farklı içerikle aynı kimlik kullanılırsa reddedilir.
- Bir kart tüm ilişkileriyle tek transaction içinde yazılır. Bir bölümde hata olursa kısmi kart oluşmaz. Kilit çakışmaları en fazla iki kez yeniden denenir.
- Fiyat/miktar alanları `DECIMAL` kullanır; virgül/nokta kabul edilir, en fazla 12 tam ve 6 ondalık basamak saklanır. Boş tutar `NULL`, girilen sıfır `0` olarak korunur. Oranlar 0–100 arasındadır. Gün alanları tam sayıdır.
- Hesaplanan tutarlar istemciden alınmaz; sunucuda ondalık aritmetikle tekrar hesaplanır ve 6 ondalığa yuvarlanır. Diğer vergi seçimi saklanır; ekranda oranı bulunmayan ÖTV/ÖİV vb. için tutar uydurulmaz. Farklı para birimleri arasında kur dönüşümü yapılmaz.
- Her kullanılan fiyat listesinde tam bir ana ve bir varsayılan birim bulunur. Ana çarpan 1'dir. Ana birim değişiminde oranlar yeni ana birime göre hesaplanıp 6 ondalığa yuvarlanır; sıfıra düşen veya alan kapasitesini aşan dönüşüm reddedilir.
- Seçilen envanter türünde görünmeyen alanlar boş/pasif kaydedilir; tür değişiminden kalan eski değerler yanlış takip oluşturmaz.
- En fazla 20 fiyat listesi, liste başına 30 ve toplam 100 birim satırı kabul edilir. İstek boyutu 512 KiB ile sınırlıdır.

## Fiyat listesi ve birim sınırı

Arayüzde her fiyat listesi bağımsız birim satırları oluşturur. Ana/varsayılan birim, çarpan, ağırlık, hacim ve barkodlar bu satıra aittir. Aynı birim adı farklı listelerde farklı bilgiler içerebildiğinden yalnızca ad veya barkod eşleşmesine bakılarak kayıtlar birleştirilmez. Ürün genelinde ortak birim düzenine geçmek ayrıca arayüz ve veri dönüşümü kararı gerektirir.

## Test kullanıcısı

Test düğmesi kalır. Bu mod ayrı demo servisini kullanır ve sunucuya kayıt yetkisi sağlamaz. Kaydet sonrası "Deneme tamamlandı" gösterilir; veritabanına yazıldığı iddia edilmez. Gerçek oturum varsa demo işaretinden bağımsız olarak gerçek API kullanılır.

## Uygulama ve doğrulama

Sunucuda normal deploy yeni migration'ı uygular. Bu çalışma canlı sunucuya kendiliğinden uygulanmaz.

`DB_MIGRATION_TEST_URL` ayrı bir yerel MySQL sunucusunu göstermelidir. `npm run db:test:stock`, rastgele isimli bir test veritabanı oluşturur, migration'ları ve HTTP kayıt/geri okuma testlerini çalıştırır; yalnızca oluşturduğu test veritabanını temizler.

`npm run db:test:stock:browser` aynı gerçek API/MySQL üzerinde 320, 390, 768 ve 1440 piksel genişliklerde tarayıcıdan form doldurma, kayıt ve geri okuma yapar. Testte canlı veritabanı veya gerçek müşteri hesabı kullanılmaz.
