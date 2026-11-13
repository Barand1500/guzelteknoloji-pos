# E-ticaret Ayarları — Site İçeriği API'si

Ayarlar → E-Ticaret altındaki ekranların (Sistem, Sayfalar, Görünüm, Menü, Sliderlar, Widgetlar, Header Yazısı, Varsayılanlar, Şablon Değişkenleri, ERP, Google & Meta XML) veri katmanı.

> **Durum:** Backend, veritabanı ve ekran bağlantıları hazır. Sayfalar, Menü, Sliderlar ve Widgetlar listeleri API'den okur/yazar; sıralama sürükle-bırakta anında kaydedilir. Varsayılanlar ekranı kategori, marka, para birimi, birim, fiyat listesi, stok/cari tipi ve vergi dairesi seçeneklerini POS'un gerçek listelerinden yükler.

## Tablolar (migration: `20261112190000_site_icerikleri`, `20261112193000_site_widget_gorseli`)

| Tablo                           | İçerik                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `site_sayfalari`                | Sayfa: `ad`, `slug` (tekil), `icerik` LONGTEXT, `yasal_tur`, `yayinda`, `sira`                                  |
| `site_menu_ogeleri`             | Menü: `grup` (`ust/alt/alt1-3`), `ad`, `baglanti`, `yeni_sekme`, `aktif`, `sira`                                |
| `site_gorselleri`               | Yüklenen görsel: `tur` (`logo/favicon/popup/kampanya/slider/widget/stok`), `dosya_adi`, `hash`, `mime`, `boyut` |
| `site_sliderlari`               | `baslik`, `aciklama`, `baglanti`, `aktif`, `sira`, `gorsel_id`                                                  |
| `site_widgetlari`               | `ad`, `tur`, `baslik`, `gorunur`, `sira`, `gorsel_id`, `ayarlar` JSON                                           |
| `site_sablon_degiskenleri`      | `ad`, `tur` (`E-Posta`/`Sms`), `modul`, `aciklama`, `sira`                                                      |
| `site_sablon_degisken_alanlari` | Değişkenin `db_sutun` ↔ `degisken` eşleşmeleri                                                                  |

- Hepsi `isletme_id` taşır ve işletme silinince temizlenir; slider/widget görseli silinirse `gorsel_id` boşalır (SetNull).
- Sayfa `slug` işletme içinde tekildir.
- Görseller `UPLOADS_DIR/site` altında özgün dosya olarak saklanır (PNG/JPG/WebP/SVG, en çok 2 MB); DB'de dosya adı, hash, mime ve boyut tutulur.

## Form ayarları (mevcut `isletme_ayarlari` JSON)

| Bölüm             | Kapsam                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `site_system`     | Bildirim e-posta/numaraları, 4 kod alanı, köşe yazısı + gizli, 4 uygulama linki, istatistik kodu                                                       |
| `site_appearance` | Ana renk, oran (kare/yatay/dikey), kırp/sığdır, logo/favicon/popup/kampanya görsel kimlikleri ve linkleri, 13 sistem anahtarı                          |
| `site_defaults`   | Ürün/müşteri/sistem varsayılanları (kategori, marka, stok tipi, para birimi, birim, KDV, fiyat listesi, cari tipi, vergi dairesi, stok olmama görseli) |
| `site_erp`        | Durum, API URL, sunucu, veritabanı, kullanıcı, **şifre (AES-GCM ile şifreli)**                                                                         |
| `site_xml`        | XML feed durumu                                                                                                                                        |

Bu bölümler mevcut `GET/POST /api/hesap/ayarlar/:section` uçlarıyla okunur/yazılır. Uzun kod alanları için değer sınırı 20.000 karaktere, istek gövdesi 256 KB'a çıkarıldı.

## Site içeriği uçları

Yetki: **Ayarlar** kaynağı (GET `read`, yazma `save`, `/sil` `delete`); tümü işletme kapsamlı.

| Yöntem   | Yol                                              | Gövde                                                      |
| -------- | ------------------------------------------------ | ---------------------------------------------------------- |
| GET/POST | `/api/site/sayfalar`                             | `{ title, slug, content, legal, published, order }`        |
| POST     | `/api/site/sayfalar/:id` · `/:id/sil`            | aynı gövde · —                                             |
| POST     | `/api/site/sayfalar/sirala`                      | `{ ids: string[] }` → `204`                                |
| GET/POST | `/api/site/menu`                                 | `{ group, label, url, newTab, active, order }`             |
| POST     | `/api/site/menu/:id` · `/:id/sil`                | aynı gövde · —                                             |
| POST     | `/api/site/menu/sirala`                          | `{ ids: string[] }` (tek grup) → `204`                     |
| GET/POST | `/api/site/sliderlar`                            | `{ title, description, link, active, order, imageId }`     |
| POST     | `/api/site/sliderlar/:id` · `/:id/sil`           | aynı gövde · —                                             |
| POST     | `/api/site/sliderlar/sirala`                     | `{ ids: string[] }` → `204`                                |
| GET/POST | `/api/site/widgetlar`                            | `{ name, type, title, visible, order, imageId, settings }` |
| POST     | `/api/site/widgetlar/:id` · `/:id/sil`           | aynı gövde · —                                             |
| POST     | `/api/site/widgetlar/sirala`                     | `{ ids: string[] }` → `204`                                |
| GET/POST | `/api/site/sablon-degiskenleri`                  | `{ name, type, module, description, fields }`              |
| POST     | `/api/site/sablon-degiskenleri/:id` · `/:id/sil` | aynı gövde · —                                             |
| POST     | `/api/site/gorseller`                            | `{ kind, dataUrl }` → `{ id, kind, url }`                  |
| GET      | `/api/site/gorseller/:id`                        | görsel baytları (yetkili)                                  |

### Sıralama kuralları

- `ids` dizisi **yeni sıranın tamamıdır**; sunucu `sira` alanını `0..n-1` olarak tek transaction'da yazar. Yarım kalan sıra oluşmaz.
- Aynı kimlik iki kez gönderilirse `400`, işletmeye ait olmayan bir kimlik varsa `404` döner ve **hiçbir satır güncellenmez**.
- Menü sıralaması grup içindedir: yalnızca tek grubun kimlikleri gönderilir; karışık grup `400` verir.
- `/sirala` uçları `/api/site/<kaynak>/:id` tanımından **önce** kayıtlıdır; aksi halde `sirala` bir kimlik sanılır.
- Ekranlar sırayı önce yerelde gösterir (iyimser), istek düşerse eski sıra geri gelir ve hata `Alert` ile söylenir.

## Arayüz kuralları (tüm e-ticaret ekranları)

- **Kaydet:** sayfada Kaydet düğmesi yoktur; **yüzen adadaki (Dock) disket düğmesi** kaydeder (stok kartı ekranındaki gibi). Pencere (Sheet) içindeki formlar kendi Kaydet düğmesini kullanır. Düğme, veri yüklenmeden veya alan geçersizken pasiftir.
- **Güvenli kaydetme:** veri sunucudan bir kez başarıyla yüklenmeden Kaydet açılmaz; yükleme hatasında varsayılan değerlerin kaydedilip alanları ezmesi engellenir.
- **Sıralama:** Sayfalar, Menü, Sliderlar ve Widgetlar sürükle-bırakta anında kaydedilir; ayrı "Sıralama" anahtarı yoktur. Arama sırasında sürükleme kapalıdır.
- **Silme:** Sayfalar, Menü, Sliderlar ve Widgetlar silmeden önce onay penceresi gösterir.
- **Dışa Aktar:** Sayfalar ve Şablon Değişkenleri listeyi CSV olarak indirir (noktalı virgül ayırıcı + BOM; Excel'de Türkçe karakterler bozulmaz).
- **Açılır listeler:** bu ekranlarda her zaman aşağı açılır (`SiteSelect` → `placement="down"`); altta yer kalmazsa liste kısalıp kendi içinde kayar.

## Görsel kuralları

- Slider ve widget görselleri `/api/site/gorseller` ucuna yüklenir; dönen `id` kayda yazılır.
- `imageId` gönderilmezse görsel bağlanmaz; başka işletmenin görsel kimliği `400` ile reddedilir.
- Varsayılanlar ekranındaki "Stok Olmama Görseli" `kind: "stok"` ile yüklenir ve `stokYokGorselId` ayarına yazılır.

## Uygulama

```bash
npm run db:deploy
```

Yedek aldıktan sonra uygulanmalıdır. `20261112190000_site_icerikleri` yeni tablolar oluşturur; `20261112193000_site_widget_gorseli` yalnızca `site_widgetlari` tablosuna `gorsel_id` sütunu ve yabancı anahtar ekler, mevcut veriyi değiştirmez.

## Güvenlik

- İşletme kimliği istemciden alınmaz; oturumdan gelir.
- Görseller rastgele dosya adıyla, 0600 izinle yazılır; kullanıcı dosya adı kullanılmaz.
- ERP şifresi mevcut ayar şifreleme katmanıyla saklanır, yanıtlarda maskelenir.
- Sayfa içeriği HTML olarak saklanır; vitrin yayınında sunucu tarafı temizleme gerekir.
