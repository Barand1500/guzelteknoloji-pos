# SEO Ayarları API'si

Ayarlar › SEO ekranının sunucu sözleşmesi. Ekran `features/seo/services/seo.service.ts`
üzerinden uçları kullanır; geçici test girişinde (ÖRNEK VERİ) `mocks/seo.mock.ts` ile çalışır.
Ortak sözleşme `packages/shared/src/seo.ts` içindedir.

## Mantık

- SEO verisi ayrı bir tabloda yaşamaz: **kategori, marka ve fırsat** kayıtlarının kendi
  `seo_basligi`/`seo_aciklamasi` kolonları, **ürün** için `urunler` tablosuna eklenen aynı adlı
  kolonlar kullanılır. Ekran yalnızca bu kolonları günceller.
- Satırlar **oturum kullanıcısının** kendi katalog kayıtlarından okunur (kategori/fırsat:
  `kullanici_id`, marka/ürün: `kullanici_id`).
- **301 yönlendirmeleri** işletme kapsamlı `seo_yonlendirmeleri` tablosunda tutulur; ekleme sırasında
  hedef kaydın sahipliği doğrulanır (başkasının sayfasına yönlendirme eklenemez).
- Vitrin adresleri ekranda gösterim amaçlıdır ve kaydedilmez. Kalıplar: kategori
  `/{üst-slugs}/{slug}`, marka `/marka/{slug}`, fırsat `/all-categories?firsat={slug}`,
  ürün `/urun/{slug}`. Slug Türkçe karakter duyarlıdır (API tarafında üretilir).
- **Sabit Sayfa** sekmesi diğerleriyle aynı yapıdadır; sabit sayfa kayıtları henüz yoktur, API boş
  liste döndürür ve yazma isteği `404` ile reddedilir.

## Uçlar

| Uç | Yanıt |
| --- | --- |
| `GET /api/seo/:tur?ara=&sayfa=&adet=` | `SeoListDto` (`tur`: `kategori\|marka\|firsat\|urun\|sabit-sayfa`) |
| `POST /api/seo/:tur/:id` | Başlık/açıklama kaydet; gövde `{ seoTitle, seoDescription }` → `204` |
| `POST /api/seo/yonlendirme` | 301 ekle; gövde `{ kind, id, from, seoTitle, seoDescription }` → `201` |
| `POST /api/seo/yonlendirme/:id` | 301 satırının başlık/açıklamasını güncelle; gövde `{ seoTitle, seoDescription }` → `204` |
| `POST /api/seo/yonlendirme/:id/sil` | `204` |

- Tüm uçlar oturum ister, `Cache-Control: no-store` döner ve `settings` bölümü yetkisi bekler
  (okuma `read`, kaydetme `save`, silme `delete`).
- Sayfalama kuralı 8.15: `sayfa` ≥ 1, `adet` 1–200 (varsayılan 10).
- Listede `ara` varsa ad/SEO başlık/açıklamada (`ürün` için ayrıca stok kodu) geçen kayıtlar süzülür.
- `SeoListDto`: `{ total, items: SeoRowDto[] }`. `SeoRowDto`: `id`, `kind`, `name`, `address`,
  `seoTitle`, `seoDescription`, `redirects[]` (`id`, `from`, `seoTitle`, `seoDescription`).

## Hatalar

| Durum | Kod | Neden |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Geçersiz tür/kimlik, 250/1000 karakter aşımı, `from` `/` ile başlamaz |
| `404` | `NOT_FOUND` | Kayıt yok ya da başka kullanıcıya ait; sabit sayfa yazma isteği |
| `409` | `CONFLICT` | Aynı işletme + tür için `eski_adres` zaten kayıtlı (`adres_tekil` tekil indeksi) |

## Veritabanı

Migration: `20261112170000_seo_ayarlari` (API kapalıyken uygulanır; veri taşınmaz).

- `urunler` — eklenen `seo_basligi` (250) ve `seo_aciklamasi` (1000) kolonları `''` ile başlar.
- `seo_yonlendirmeleri` — `isletme_id`, `tur` (20), `kaynak_id` (boş olabilir; FK **değildir**, türe
  göre farklı tabloya bakar; yazarken sahiplik doğrulanır), `eski_adres` (300), `seo_basligi`,
  `seo_aciklamasi`, `olusturma_tarihi`. Tekil indeks: (`isletme_id`, `tur`, `eski_adres`).
  İşletme silinirse yönlendirmeler de silinir.
