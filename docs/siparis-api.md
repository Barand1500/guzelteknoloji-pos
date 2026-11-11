# Siparişler ve anasayfa API'si

Gelen Siparişler, İade/Değişim ve Anasayfa ekranlarının sunucu sözleşmesi. Ekranlar bu uçları
`features/orders/services/order.service.ts` ve `features/home/services/home.service.ts` üzerinden
kullanır; uç 404 dönerken ekranlar örnek veriyle açılır, uçlar hazır olunca örnek veri kendiliğinden
devre dışı kalır.

## Uçlar

| Uç                                                      | Yanıt                                     |
| ------------------------------------------------------- | ----------------------------------------- |
| `GET /api/siparisler`                                   | `Order[]` (en yeniden eskiye)             |
| `POST /api/siparisler/:id/durum`                        | Gövde `{ "status": "preparing" }` → `204` |
| `GET /api/siparisler/iade`                              | `ReturnRequest[]`                         |
| `POST /api/siparisler/iade/:id/durum`                   | Gövde `{ "status": "approved" }` → `204`  |
| `GET /api/anasayfa?donem=today\|week\|month\|year\|all` | `HomeData`                                |

Tüm uçlar oturum ister ve yalnızca oturumdaki kullanıcının **işletmesine** ait kayıtları döndürür;
istemciden işletme kimliği kabul edilmez. Siparişler için ayrı bir bölüm yetkisi yoktur (menüde de
ayrı yetki yok); işletmeye bağlı her kullanıcı listeyi görür ve durum değiştirebilir.

## Alanlar

`Order`: `id`, `no`, `date` (ISO), `source` (`web|mobile|marketplace|manual`), `customer`, `total`
(KDV hariç), `totalWithVat` (KDV dahil), `paid`, `paymentMethod`, `status`
(`pending|preparing|shipped|delivered|cancelled`), `address`, `lines[]`.
Satır: `id`, `name`, `code`, `qty`, `unitPrice` (KDV hariç birim fiyat).

`ReturnRequest`: `id`, `customer`, `orderNo`, `kind` (`return|exchange`), `itemCount`, `date`, `status`
(`pending|approved|rejected|completed`), `reason`.

`HomeData`: `period`, `salesAmount` (dönem cirosu), `previousSalesAmount`, `trend[]`, `stats`
(`orders` ve `customers` dönem, `products` tüm ürünler, `totalSales` tüm zamanlar), `revenue[]`,
`orders` (teslim/iptal/bekleyen), `recentOrders[]`, `payments[]`, `productRanks`
(`carts|favorites|alarms`).

## Veritabanı

Migration: `20261111120000_siparisler`.

- `siparisler` — işletme, sipariş no, tarih, kaynak, müşteri, KDV hariç/dahil toplam, ödeme, durum,
  adres. `(isletme_id, siparis_no)` tekil; `(isletme_id, tarih)` indeksli.
- `siparis_satirlari` — sipariş anındaki ürün adı/kodu, adet, birim fiyat ve isteğe bağlı birim
  maliyet. Ürün silinse bile sipariş bozulmaz (`urun_id` ilişkisiz, boş kalabilir).
- `iade_talepleri` — müşteri, sipariş no, tür, ürün adedi, tarih, durum, sebep.

Sipariş ve iade silme ucu yoktur; kayıt geçmişi korunur. Durum değişiklikleri işlem kaydına yazılır.

## Anasayfa hesapları

- Dönem sınırları **Türkiye saatiyle (+03:00)** hesaplanır: bugün 00:00, hafta pazartesi, ayın 1'i,
  yılın 1 Ocak'ı; "Tümü" tüm siparişleri kapsar. Bir önceki dönem karşılaştırması tam bir önceki
  gün/hafta/ay/yıl üzerinden yapılır.
- Ciro `totalWithVat` toplamıdır; **iptal edilen siparişler ciroya ve ürün sıralamasına katılmaz**.
- `revenue` kovaları: bugün 4 saatlik (6), hafta günlük (7), ay haftalık (4–5), yıl aylık (12),
  tümü yıllık. Kâr = satış − maliyet; maliyet satırlardaki `unitCost` alanından gelir, yoksa 0.
- "Sepette" ürün sıralaması satılan ürünlerin adet sıralamasıdır; favori ve fiyat alarmı olayları bu
  sürümde yoktur (boş döner).
- Sipariş yoksa sayılar 0, listeler boş döner. Örnek veri sunucuda üretilmez; Örnek Veri rozeti
  yalnızca uç 404 dönerken istemcide görünür.

## Notlar

- Sipariş oluşturma ucu bu kapsamda yoktur; kayıtlar ileride mağaza/pazaryeri entegrasyonundan veya
  toplu içe aktarmadan gelecektir. Bu nedenle yeni kurulan işletmede listeler boş açılır.
- KDV hariç/dahil tutarlar sipariş kaydında birlikte tutulur; hesaplama sunucuda yapılmaz, entegrasyon
  gönderir.
- Ürün sıralaması ve ödeme dağılımı için ayrı özet tablosu yoktur; anasayfa her istekte siparişlerden
  hesaplanır. İleride büyük veri için özet/indeks eklenebilir.
