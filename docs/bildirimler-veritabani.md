# Bildirimler › Mobil Bildirimler — Veritabanı ve API

Müşterilerin mobil uygulamasına gönderilecek duyuru bildirimlerinin POS tarafındaki kaydı. **Gerçek push teslimi (FCM/APNs) henüz yoktur**; bu katman bildirimi kaydeder, planlar ve iptal eder. Teslim altyapısı eklendiğinde `durum` alanı gönderim sonucuna göre güncellenecektir.

## Tablolar (migration: `20261112180000_bildirimler`)

| Tablo | Amaç | Alanlar |
| --- | --- | --- |
| `bildirimler` | Bildirim kaydı | `isletme_id`, `baslik` (60), `metin` (240), `gonderim_zamani`, `durum` (`sent`/`scheduled`/`cancelled`/`failed`), `otomatik`, `tum_musteriler`, zaman damgaları |
| `bildirim_musterileri` | Seçilen alıcılar | `bildirim_id`, `musteri_id`; bileşik anahtar, iki tarafta `ON DELETE CASCADE` |

- `tum_musteriler = true` → alıcı satırı yoktur, ekranda `audience: null` (“tüm müşteriler”).
- Seçili müşteriler kaydedilmeden önce **aynı işletmeye ait** oldukları doğrulanır.
- İşletme silinince bildirimler; bildirim silinince alıcı bağlantıları; müşteri silinince ilgili alıcı bağlantısı silinir.
- Sorgular işletme kapsamlıdır; başka işletmenin bildirimi okunamaz/iptal edilemez.

## API uçları

Yetki: **Bildirimler** kaynağı (`notifications`) → GET `read`, gönderim/iptal `save`.

| Yöntem | Yol | Gövde / dönüş |
| --- | --- | --- |
| GET | `/api/bildirimler/mobil` | `MobileNotification[]` (yeniden eskiye) |
| POST | `/api/bildirimler/mobil` | `NotificationDraft` → `MobileNotification` (201) |
| POST | `/api/bildirimler/mobil/:id/iptal` | — (204, yalnızca `scheduled`) |

`NotificationDraft`: `title` (1–60), `text` (≤240), `customerIds` (0–1000, boş = tümü), `sendAt` (`YYYY-MM-DDTHH:mm` ya da `null`).
- `sendAt: null` → hemen kaydedilir, `durum: sent`.
- `sendAt` dolu → `durum: scheduled`.
- Planlanmış bildirim iptal edilince `cancelled` olur; gönderilmiş bildirim iptal edilemez.
- Zaman damgası yerel duvar saati olarak girilir ve aynı biçimde geri okunur.

## Uygulama

```bash
npm run db:deploy
```

Mevcut tablolara dokunulmaz; yalnızca iki yeni tablo eklenir. Uygulamadan önce MySQL yedeği alınmalıdır.

## Notlar

- Gönderim sayısı/audience ekranda `audience` alanıyla gösterilir; ayrı bir sayaç tablosu yoktur.
- Otomatik bildirimler (`otomatik = true`) ileride sipariş olaylarından üretilecek; bu ekran yalnızca elle gönderim yapar.
- Teslim altyapısı eklendiğinde `failed` durumu ve yeniden deneme bu katmanda ele alınacaktır.
