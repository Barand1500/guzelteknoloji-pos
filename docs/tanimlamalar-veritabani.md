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

## Vergiler ve Cari/Stok Tanımları (migration: `20261112160000_vergiler_cari_stok`)

| Tablo | Amaç | Önemli alanlar |
| --- | --- | --- |
| `vergi_turleri` | KDV, ÖTV gibi vergi türleri | `isletme_id`, `ad`, `kisa_ad`, `sira` |
| `vergi_oranlari` | Türün yüzdeleri | `tur_id`, `oran` (6,2), `sira`; `(tur_id, oran)` tekil |
| `vergi_daireleri` | Vergi daireleri | `isletme_id`, `ad`, `yerlesik` |
| `cari_tipleri` | Son Kullanıcı/Bayi gibi cari tipleri | `isletme_id`, `ad`, `sira` |
| `fiyat_listesi_ayarlari` | Fiyat listesi ek bilgileri | `isletme_id`, `secenek_id` (tekil), `tur` (`general`/`special`), `baslangic`, `bitis`, `varsayilan` |

- **Stok tipleri, ölçü birimleri ve fiyat listeleri mevcut `stok_secenekleri` tablosunu kullanır** (`liste_turu`: `stockTypes`, `units`, `priceLists`). Böylece stok kartı ekranındaki seçeneklerle tek kaynak olur; burada eklenen birim/tipler ürün formunda da görünür.
- Fiyat listesinin tür/tarih/varsayılan bilgisi `fiyat_listesi_ayarlari` tablosunda tutulur; liste adı `stok_secenekleri.secenek_adi` alanındadır.
- İşletme başına **tek varsayılan fiyat listesi** vardır; varsayılan liste silinemez, "varsayılan yap" işlemi diğerlerini kapatır.
- Kullanımdaki kayıtlar silinemez: üründe kullanılan birim/ürün tipi ve ürün fiyatlarında kullanılan fiyat listesi reddedilir.
- `Belirtilmemiş` vergi dairesi sistem kaydıdır (`yerlesik`), değiştirilemez ve silinemez.

### API uçları

Yetki: **Ayarlar** kaynağı (GET `read`, yazma `save`, `/sil` `delete`).

| Yöntem | Yol | Gövde |
| --- | --- | --- |
| GET/POST | `/api/vergiler` | `{ name, shortName }` |
| POST | `/api/vergiler/:id` | `{ name, shortName }` |
| POST | `/api/vergiler/:id/sil` | — |
| POST | `/api/vergiler/:id/oranlar` | `{ rate }` → `TaxType` |
| POST | `/api/vergiler/:id/oranlar/sil` | `{ rate }` → `TaxType` |
| GET/POST | `/api/vergi-daireleri` | `{ name }` |
| POST | `/api/vergi-daireleri/:id` | `{ name }` |
| POST | `/api/vergi-daireleri/:id/sil` | — |
| GET/POST | `/api/cari-stok/:liste` | `{ name, shortName }` (`cari-tipleri`, `stok-tipleri`, `olcu-birimleri`) |
| POST | `/api/cari-stok/:liste/:id` | `{ name, shortName }` |
| POST | `/api/cari-stok/:liste/:id/sil` | — |
| GET/POST | `/api/cari-stok/fiyat-listeleri` | `{ name, kind, start, end }` |
| POST | `/api/cari-stok/fiyat-listeleri/:id` | `{ name, kind, start, end }` |
| POST | `/api/cari-stok/fiyat-listeleri/:id/sil` | — |
| POST | `/api/cari-stok/fiyat-listeleri/:id/varsayilan` | — |

Uygulamak için iki migration birlikte çalıştırılır: `npm run db:deploy` (önce yedek alın).