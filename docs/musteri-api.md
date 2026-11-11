# Müşteriler API'si

Müşteriler listesi ve müşteri sayfasındaki sekmelerin sunucu sözleşmesi. Ekranlar bu uçları
`features/customers/services/customer.service.ts` üzerinden kullanır; uç 404 dönerken örnek veriyle
açılır, uçlar hazır olduğunda örnek veri devre dışı kalır.

## Uçlar

| Uç | Yanıt |
| --- | --- |
| `GET /api/musteriler` | `Customer[]` |
| `GET /api/musteriler/:id/detay` | `CustomerDetail` |
| `POST /api/musteriler` | Yeni müşteri; gövde `CustomerDraft` → `Customer` |
| `POST /api/musteriler/:id` | Güncelleme; gövde `CustomerDraft` → `Customer` |
| `POST /api/musteriler/:id/sil` | `204` |
| `POST /api/musteriler/:id/giris` | Gövde `{ active }` → `204` (tüm giriş hesapları) |
| `POST /api/musteriler/:id/adresler` | Gövde `AddressDraft` → `CustomerAddress` |
| `POST /api/musteriler/:id/adresler/:adresId` | Adres güncelleme → `CustomerAddress` |
| `POST /api/musteriler/:id/kullanicilar/:kullaniciId/giris` | Gövde `{ active }` → `204` |

Tüm uçlar oturum ister ve yalnızca oturumdaki kullanıcının **işletmesine** ait kayıtları döndürür.
Müşteriler için ayrı bir bölüm yetkisi yoktur; işletmeye bağlı her kullanıcı listeyi görür.

## Alanlar

`Customer`: `id`, `code`, `name`, `kind` (`real|corporate`), `taxId`, `phone`, `email`, `priceList`,
`customerType`, `payments[]`, `cardDeal`, `active`, `userCount`, `lastLogin`, `debt`, `credit`.
Bakiye = `debt − credit`; ekranda borçlu/alacaklı olarak gösterilir.

`CustomerDetail`: `users[]`, `addresses[]`, `ledger[]`, `orders[]`, `returns[]`, ayrıca mağaza
tarafı için `favorites`, `cart`, `savedCarts`, `alerts`, `reviews`, `likedReviews`, `messages`.
Bu son yedi alan bu sürümde boş döner (mağaza/sepet/yorum modülleri henüz yok).

## Veritabanı

Migration: `20261111150000_musteriler`.

- `musteriler` — işletme, müşteri kodu, ad/ünvan, gerçek/tüzel, vergi/TC kimlik, telefon, e-posta,
  fiyat listesi, cari tipi, ödeme şekilleri (JSON metin), kart anlaşması, girişe açık.
- `musteri_kullanicilari` — müşterinin giriş hesapları; her müşteri oluşturulurken bir varsayılan
  hesap açılır (ad/e-posta müşteri formundan gelir).
- `musteri_adresleri` — başlık, açık adres, varsayılan. İlk adres kendiliğinden varsayılan olur;
  yeni varsayılan seçilirse diğerleri kapatılır.
- `musteri_hareketleri` — tarih, referans, borç, alacak; liste bakiyesi bunlardan hesaplanır.
- `siparisler.musteri_id` ve `iade_talepleri.musteri_id` — müşteri detayındaki Alışveriş sekmesi bu
  bağla dolar. Müşteri silinirse sipariş/iade kaydı silinmez, bağ boşalır (`SET NULL`).

Silme müşteriye bağlı adres, giriş hesabı ve cari hareketleri de siler; geçmiş sipariş ve iadeler
raporlarda kalır.

## Notlar

- Müşteri kodu boş bırakılabilir; doluysa aynı işletmede tekrar edemez (`409`).
- Telefon en az 10 hane, e-posta geçerli olmalıdır. TC kimlik 11, vergi no 10 hane olmalıdır
  (boş bırakılabilir).
- Müşteri formundaki ad ve e-posta, varsayılan giriş hesabına da yansıtılır.
- Cari hareket ekleme ve müşteri giriş hesabı ekleme ekranı bu sürümde yoktur; tablolar hazırdır.
- Müşteri listesi sunucudan tamamı gelir; arama/süzme/sıralama istemcide yapılır. Büyük veri için
  ileride sunucu tarafı sayfalama eklenebilir.
