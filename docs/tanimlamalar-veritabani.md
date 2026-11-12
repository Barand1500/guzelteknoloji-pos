# Tanımlamalar › Para Birimleri ve Kargo — Veritabanı ve API

Bu belge, POS'taki **Tanımlamalar → Kargo ve Nakliye** ile **Para Birimleri** ekranlarının gerçek veri katmanını anlatır. E-ticaret vitrini henüz yoktur; veriler yalnızca POS yönetim ekranlarında kullanılır.

## Tablolar (migration: `20261112120000_kargo_para_birimleri`)

| Tablo | Amaç | Önemli alanlar |
| --- | --- | --- |
| `para_birimleri` | İşletmenin para birimleri ve kurları | `isletme_id`, `ad`, `kisa_ad`, `sembol`, `ana_mi`, `kur_tipi`, `otomatik`, `kur` (18,6), `api_url`, `aktif`, `sira` |
| `kargo_firmalari` | Kargo firmaları | `isletme_id`, `ad`, `kisa_ad`, `api_url`, `kdv_orani`, `sira` |
| `kargo_fiyat_basamaklari` | Desi/ağırlık fiyat basamakları | `firma_id`, `tur` (`desi`/`weight`), `sira`, `ust_sinir`, `fiyat` (12,2), `birim_basi` |
| `kargo_lokasyonlari` | Ülke → İl → İlçe → Semt → Mahalle → Sokak ağacı | `isletme_id`, `ust_id`, `ad`, `seviye` (0–5), `sira` |
| `kargo_tanimlari` | Gönderi/Kargo/Alım/Teslimat türleri, yasak kargolar | `isletme_id`, `liste`, `baslik`, `kisa_ad`, `metin`, `sira` |

Kurallar:
- Bütün tablolar **işletme kapsamlıdır** (`isletme_id`); başka işletmenin kaydı okunamaz/yazılamaz.
- `(isletme_id, kisa_ad)` ve `(isletme_id, ad)` tekil; tanım başlığı listede tekil.
- Lokasyon silinince alt dalları da silinir (FK `ON DELETE CASCADE`); en fazla 6 seviye.
- Fiyat basamağında ilk satır 0'dan başlar, son satır açıktır (`ust_sinir = NULL`), birim başı fiyat yalnızca son satırda olur (sunucu doğrular).
- **Ana para birimi (₺/TRY)** işletme başına tek satırdır; ilk okumada oluşturulur, silinemez, pasife alınamaz, kuru 1'dir.
- Otomatik kur yalnızca **TCMB `today.xml`** adresinden çekilir; istemciden gelen adres kullanılmaz (SSRF koruması). Yanıt 5 dakika önbelleklenir.

## API uçları

Yetki: hepsi **Ayarlar** kaynağının izinleriyle çalışır (GET → `read`, yazma → `save`, `/sil` → `delete`). İstekler oturum çerezi ister; kimlikler metin olarak döner.

### Para birimleri — `/api/para-birimleri`

| Yöntem | Yol | Gövde / sorgu |
| --- | --- | --- |
| GET | `/` | — → `Currency[]` |
| GET | `/kur?kod=USD&tip=dovizSatis` | `{ rate }` (kaydetmeden önizleme) |
| POST | `/` | `CurrencyDraft` → `Currency` (201) |
| POST | `/:id` | `CurrencyDraft` → `Currency` |
| POST | `/:id/sil` | — (204) |
| POST | `/:id/aktiflik` | `{ active: boolean }` (204) |
| POST | `/:id/guncelle` | — → `Currency` (TCMB'den kuru şimdi çeker) |

`CurrencyDraft`: `name, shortName, symbol, rateType, auto, rate, apiUrl`.
`rateType`: `dovizAlis | dovizSatis | efektifAlis | efektifSatis`.
`auto: true` ise kaydetme sırasında kur TCMB'den alınır; alınamazsa açık hata döner (elle girişe geçilir).

### Kargo — `/api/kargo`

| Yöntem | Yol | Gövde |
| --- | --- | --- |
| GET | `/firmalar` | — → `Carrier[]` (fiyat tablosu dahil) |
| POST | `/firmalar` | `CarrierDraft` → `Carrier` (201) |
| POST | `/firmalar/:id` | `CarrierDraft` → `Carrier` |
| POST | `/firmalar/:id/sil` | — (204) |
| POST | `/firmalar/:id/fiyatlar` | `PriceTable` (204) |
| GET | `/lokasyonlar` | — → `LocationNode[]` (düz liste, `parentId`) |
| POST | `/lokasyonlar` | `{ parentId, name }` → `LocationNode` |
| POST | `/lokasyonlar/:id` | `{ name }` → `LocationNode` |
| POST | `/lokasyonlar/:id/sil` | — (204) |
| GET | `/tanimlar/:liste` | — → `DefItem[]` |
| POST | `/tanimlar/:liste` | `{ title, short, text }` → `DefItem` |
| POST | `/tanimlar/:liste/:id` | `{ title, short, text }` → `DefItem` |
| POST | `/tanimlar/:liste/:id/sil` | — (204) |

`liste`: `gonderi-tipleri`, `kargo-tipleri`, `alim-sekilleri`, `teslimat-sekilleri`, `teslimat-modelleri`, `ulastirma-turleri`, `yasak-kargolar`.

## Uygulama

Migration'ı uygulamak için `DATABASE_URL` tanımlı bir ortamda:

```bash
npm run db:deploy
```

Uygulamadan önce MySQL yedeği alınmalıdır. Mevcut tablolarda değişiklik yapılmaz; yalnızca beş yeni tablo eklenir.

## Güvenlik notları

- Tüm sorgular oturumdaki işletmeye filtrelenir; istemciden işletme kimliği kabul edilmez.
- Kargo API adresi yalnızca saklanır, sunucu tarafından çağrılmaz.
- Para birimi kuru için sabit TCMB adresi kullanılır; dış URL çağrısı yapılmaz.
- Hatalar kullanıcıya açık mesajla döner; sahte başarı üretilmez.
