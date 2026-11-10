# Vitrin (müşterinin göreceği mağaza) — İnceleme ve Yapım Planı

> Bu dosya, vitrini yaparken bana (Claude) verilecek **ana talimattır**. Önce "Kararlar" ve "Kurallar"ı,
> sonra ilgili fazın bölümünü oku; Apple bulguları **doğrulanmış sayılardır** (apple.com/tr'nin gerçek CSS
> dosyalarından okundu, 2026-11-10), "yorum" yazan yerler benim çıkarımımdır.

---

## 1. Kararlar (kullanıcı söyledi)

| Konu | Karar |
| --- | --- |
| Ne yapıyoruz | İşletmenin **tüm ürünlerini** gösteren, müşteriye açık, Apple Store hissinde bir vitrin. |
| Kimin mağazası | Uygulamayı birkaç kişiye satacağız. **Her işletmenin kendi mağazası** olacak (kendi adresi, kendi ürünleri, kendi teması). |
| Sepet | **Var.** Ekle / çıkar / miktar / toplam. **Satın alma (ödeme, sipariş) yok** — şimdilik. |
| Tema | **Çok temalı** olacak. İşletme ayarlardan tema seçer/değiştirir. Mimari baştan buna göre kurulur. |
| Tasarım | Apple gibi: sade, bol boşluk, büyük görsel, az yazı. "Yapay zeka tasarımı" görünümünden kaçın. Gerekirse Figma'da önce taslak. |
| Dokunulmayacak | Profil/ayarlar ekranları (arkadaşın yapıyor). Vitrin temasını seçme alanı sonradan **onun ekranına eklenecek**, şimdi değil. |

---

## 2. Apple incelemesi (apple.com/tr)

Yöntem: ana sayfa, Store, iPhone alışveriş, AirPods Pro 3 ürün sayfası ve çanta sayfasının HTML'i ile
`main/homepage/tiles/globalheader/footer/step0` CSS dosyaları indirilip okundu. Aşağıdakiler **gerçek değerlerdir**.

### 2.1 Düzen ve kırılma noktaları

- Ana kırılmalar: **734 px** (telefon), **1068 px** (tablet), **1441 px** (geniş). Mağaza kartlarında ayrıca 1023/1440.
  CSS'te `max-width:1068px` yaklaşık 147, `max-width:734px` yaklaşık 125 kez geçiyor: yani **önce telefon/tablet kuralları yazılmış değil,
  masaüstü esas, ikisine "daraltma" kuralları** eklenmiş. Biz mobil öncelikliyiz; aynı üç eşiği kullanacağız.
- Yükseklik duyarlı kırılma da var: `min-height:776px` / `734px`. Hero ve karolar **ekran yüksekliğine göre** boyutlanıyor.
- Genel gezinme çubuğu **44 px yükseklikte**, sayfanın üstünde `absolute`, yazı 17 px; açılınca "flyout" menü (kapanma gecikmesi 0,12 sn,
  bağlantı belirme 0,5 sn). `backdrop-filter` ile buzlu cam (kaydırınca).
- Sayfa; üst gezinme → yerel gezinme (ürün sayfasında "Genel Bakış / Teknik Özellikler", yapışkan) → içerik → altbilgi.
- Yol kırıntısı (breadcrumb): "Apple Online Store → iPhone".
- Altbilgi: sütunlu bağlantı grupları; **telefonda her grup başlığının yanında "+"** (açılır kapanır). Alt satırda ülke seçici,
  telif, yasal bağlantılar (Gizlilik, Çerez, Kullanım Şartları, Satış ve Para İadesi, Site Haritası).

### 2.2 Tipografi

- Yazı tipi: **SF Pro Display** (başlık, 19 px üstü) ve **SF Pro Text** (gövde). Yedek: `Helvetica Neue, Helvetica, Arial`.
- Boyut ölçeği (en çok kullanılandan): 14, 17, 19, 32, 40, 21, 28, 24, 12, **48, 56** (hero).
- Ağırlık: neredeyse yalnızca **600 (başlık)** ve **400 (gövde)**; ara sıra 500. Kalın (700+) yok.
- Satır yüksekliği: büyük başlıkta **1,0–1,25**; gövdede **≈1,35–1,37** (17 px → 1,3684).
- Harf aralığı: gövdede 0; büyük başlıkta **−0,022 em / −0,016 em** (sıkı); küçük yazıda +0,012 em.
- Karo başlığı (`typography-modal-headline`): 40 px / 600 / satır yüksekliği 1.

### 2.3 Renk

- Zemin: **#f5f5f7** (açık gri), kartlar **#ffffff**; koyu karo/kart: **#1d1d1f**, **#272729**, **#18181a**, **#000**.
- Metin: ana `rgba(0,0,0,.8)`, ikincil **#333336**, üzerine gelince **#000**.
- Vurgu (bağlantı, odak): **#0071e3** (mavi); bağlantı üzerine gelince **#0076df / #006edb**.
- Kenar/çizgi: **#ededf2**. Bütün sayfada **tek bir vurgu rengi** var; ürünün kendi rengi görseli süslüyor, arayüz renkli değil.
- Fiyat ve rozetlerde turuncu "msgtag" (`rf-card-msgtag-orange`) küçük etiket olarak kullanılıyor.

### 2.4 Şekil, gölge, hareket

- Köşe yarıçapı: **düğme `980px` (hap)**, **kart `28px`**, küçük kart/girdi `18px`, `12px`, `10px`, `8px`, yuvarlak `50%`.
- Kart gölgesi: `2px 4px 12px rgba(0,0,0,.08)`; üzerine gelince `2px 4px 16px rgba(0,0,0,.16)` **ve** `scale3d(1.01,1.01,1.01)`.
  Geçiş: **0,3 sn `cubic-bezier(0,0,.5,1)`** (hızlı başlar, yumuşak durur).
- Site geneli eğriler: `cubic-bezier(.4,0,.6,1)` (78 yerde), `cubic-bezier(.25,.1,.3,1)` (13), `cubic-bezier(.42,0,.58,1)`.
- Odak halkası: **`outline: 2px solid #0071e3; outline-offset: 3px`** — yalnızca `:focus-visible`'de.
- **`prefers-reduced-motion`** kurallarıyla hareketler azaltılıyor (14 yerde). Erişilebilirlik sonradan eklenmemiş, baştan var.
- Başlıkta "renk akışı" (MacBook karosunda yazıya `background-clip:text` ile kayan degrade) gibi **tek bir ayırt edici hareket** var; her şey hareket etmiyor.

### 2.5 Ana sayfa karoları (tile) — düzen kuralı

Her karo aynı kalıp: **görsel + başlık (headline) + kısa alt başlık + iki bağlantı: "Daha Fazla Bilgi ›" ve "Satın Alın ›"**.
Karolar tam genişlikte, açık/koyu zeminli, görsel büyük, yazı ortada/üstte. İki sütunlu karo çiftleri de var. İlk karo (hero)
mevsimsel kampanya, tek bir eylem ("Hediye Satın Alın"). Boşluk, içerikten çok **bol**: bir ekranda bir fikir.

### 2.6 Mağaza ürün rafı (shelf / "cards scroller")

- **Yatay kayan kart rafı**: `scroll-snap-type: mandatory`, `scroll-snap-align: start`; sağ/sol **paddle (ok) düğmeleri** (rafın altında, 52 px boşlukla).
- Kart: **313 × 470 px** (telefonda 260 × 450), **28 px köşe**, beyaz, `overflow:hidden`; üstte "eyebrow" (küçük üst etiket),
  başlık, kısa açıklama, altta bağlantı; görsel kartın alt yarısı.
- Kartın alt/üst iç boşlukları rafın "platter"ında (üst 16, alt 40 px) — gölge kırpılmasın diye.
- "Hediye/ürün" kartlarında fiyat **görselin üstündeki yarı saydam "scrim"** içinde yazıyor.

### 2.7 Ürün sayfası (AirPods Pro 3 örneğinden)

Sıra: üst gezinme → yerel gezinme ("Genel Bakış / Teknik Özellikler") → **"AirPods Pro 3 Satın Alın"** (başlık, "X Satın Alın" kalıbı)
→ kısa tanıtım + küçük etiket ("Ücretsiz Lazer Baskı") → **galeri** (tek büyük görsel, anlamlı `alt`) → **seçenekler** (renk "Beyaz" iğnesi;
birden çok varsa model seçici) → **fiyat "17.499,00 TL"** + altında soluk satır ("5.833,00 TL x 3 aya kadar taksit") → **sepete git bağlantısı**
→ teslimat/KDV dipnotları → "Sık Sorulan Sorular" → **"Size en uygun AirPods hangisi?"** karşılaştırma kartları (bakılan model
"Şu anda görüntülenen model" işaretli) → "Tüm modelleri karşılaştırın" → altbilgi.

- Fiyatlar **KDV dahil** gösterilir; dipnot: "Fiyatlara %20 KDV dahildir, teslimat ücretleri dahil değildir."
- Gezinmede çanta simgesi yanında **adet rozeti ("0+")**.
- Çanta sayfası başlığı "Çanta"; boş çanta için sade mesaj + alışverişe dönüş.

### 2.8 Apple'dan alınmayacaklar

- SF Pro lisanslı yazı tipidir → **kullanmayacağız** (yedek olarak sistem yazısı + bizim `Manrope`). Apple'ın logosu, ikonları, görselleri, "Satın Alın" gibi marka dili kopyalanmaz.
- Apple'ın mavisi → bizde **temanın vurgu rengi** (varsayılan turuncu, tema değişince değişir).
- Hero'daki ağır video/animasyon → ilk sürümde yok (performans). Yerine hafif "kaydırınca belirme".

---

## 3. Bizim vitrin tasarım dilimiz (Apple'dan çevrilmiş, kimlik bizim)

Prensipler: **bir ekran = bir fikir · büyük ürün görseli · az kelime · tek vurgu rengi · bol boşluk · tutarlı hareket.**

### 3.1 Tasarım belirteçleri (tema bunları değiştirir)

Hepsi CSS değişkeni (`--sf-*`), mevcut yönetim paneli belirteçlerinden **ayrı** (vitrin panelle karışmasın).

| Belirteç | Aydınlık Minimal (varsayılan) | Not |
| --- | --- | --- |
| `--sf-bg` | `#f5f5f7` | sayfa zemini |
| `--sf-surface` | `#ffffff` | kart |
| `--sf-surface-dark` | `#1d1d1f` | koyu karo |
| `--sf-ink` | `#1d1d1f` | ana metin |
| `--sf-ink-2` | `#6e6e73` | ikincil metin |
| `--sf-line` | `#d2d2d7` | çizgi |
| `--sf-accent` | işletme/tema rengi (varsayılan `#c2410c`) | düğme, bağlantı, odak |
| `--sf-radius-card` | `28px` | kart |
| `--sf-radius-control` | `980px` (hap) | düğme, arama |
| `--sf-radius-sm` | `12px` | girdi, çip |
| `--sf-shadow` | `2px 4px 12px rgba(0,0,0,.08)` | durgun |
| `--sf-shadow-hover` | `2px 4px 16px rgba(0,0,0,.16)` | üzerine gelince |
| `--sf-ease` | `cubic-bezier(0,0,.5,1)` | 0,3 sn |
| `--sf-font` | Manrope Variable → sistem | başlık ve gövde |

Tip ölçeği (clamp ile akışkan): hero `clamp(2.5rem, 6vw, 3.5rem)` / 600 / lh 1.07 / ls −0.022em · başlık `clamp(1.75rem, 3.5vw, 2.5rem)`
· alt başlık `1.3125rem` · gövde `1.0625rem` (17 px) lh 1.37 · küçük `.875rem`. Ağırlıklar **yalnızca 400 / 600**.

### 3.2 Bileşen listesi

1. **Üst gezinme (`StoreHeader`)**: 48 px, buzlu cam; logo/ad · kategoriler (flyout) · arama · sepet (adet rozetli). Telefonda hamburger → tam ekran menü.
2. **Yerel gezinme (`LocalNav`)**: kategori/ürün sayfasında yapışkan ikinci çubuk ("Genel Bakış · Özellikler · Benzer ürünler").
3. **Hero/Karo (`Tile`)**: görsel + başlık + alt başlık + iki bağlantı (`Daha Fazla ›`, `Sepete Ekle ›`). Açık/koyu varyant, tam genişlik ya da yarı yarıya.
4. **Ürün rafı (`Shelf`)**: yatay kaydırmalı, snap'li, ok düğmeli kart rafı. Ana sayfada "Yeni", "Fırsatlar", "Kategoriye göre".
5. **Ürün kartı (`ProductCard`)**: 28 px köşe, görsel üstte (kare/4:5, `object-fit: contain`, beyaz/şeffaf zemin), fırsat rozeti
   (fırsatın kendi **konumu ve boyutu** — panelde ayarlı), ad, kısa satır, fiyat. Üzerine gelince gölge + `scale 1.01`.
6. **Izgara (`ProductGrid`)**: 4 / 3 / 2 / 1 sütun (≥1441 / ≥1069 / ≥735 / altı); boşluk 20–24 px. Sonsuz kaydırma yerine "Daha fazla göster".
7. **Süzgeç (`FilterBar`)**: kategori ağacı, marka, fiyat aralığı, fırsatlı, **özellik süzgeci** (renk noktaları, beden çipleri). Masaüstünde üstte yatay hap'lar,
   telefonda **alttan açılan sheet** (panelde zaten var, aynı kalıp).
8. **Ürün detay (`ProductPage`)**: sol büyük galeri (küçük resim şeridi + yakınlaştırma), sağ yapışkan **satın alma kutusu** (ad, fiyat, KDV notu,
   renk/özellik seçici, varyant, miktar, **"Sepete Ekle"**). Altında: Özellikler tablosu, açıklama, SSS, **"Size en uygun hangisi?" karşılaştırma kartları**, benzer ürünler rafı.
9. **Sepet**: sağdan **çekmece (drawer)** + tam sayfa. Satırlar (görsel, ad, özellik özeti, miktar ±, sil), ara toplam, KDV, genel toplam,
   boş durum çizimi. **Ödeme düğmesi yok**; yerine pasif "Yakında" notu ve **"Sepeti paylaş / WhatsApp ile iletişime geç"** (isteğe bağlı, işletme ayarı).
10. **Arama**: üst çubukta açılan tam genişlik katman; yazdıkça önerilen ürün/kategori (gecikmeli, 250 ms).
11. **Kategori / Marka / Fırsat sayfaları**: başlık + açıklama (kategoride **SEO başlığı/açıklaması** zaten var) + ızgara + süzgeç.
12. **Altbilgi**: sütunlar (Kategoriler · Markalar · Bilgi · İletişim), telefonda "+" ile açılır; işletme adı, telif.
13. **Durumlar**: yükleme iskeleti (kart şeklinde), boş sonuç, hata, 404, çevrimdışı.

### 3.3 Hareket kuralları

- Tek eğri `--sf-ease`, süre **200–300 ms**; sayfa girişinde kartlar **kaydırınca yukarıdan 12 px + opaklıkla** belirir (IntersectionObserver, bir kez).
- Üst çubuk kaydırınca buzlu cama döner. Sepet çekmecesi sağdan kayar; ürün sepete eklenince küçük "eklendi" bildirimi + sepet rozeti yaylanır.
- **`prefers-reduced-motion`** açıkken tüm bunlar kapanır (yalnızca opaklık geçişi kalır).
- Ağır hareket yok: video hero, paralaks, kaydırmaya bağlı sahne yok (ilk sürümde). İleride tema bazlı eklenebilir.

### 3.4 Duyarlılık

| Genişlik | Düzen |
| --- | --- |
| ≤ 734 px | tek sütun; ızgara 1–2 sütun (kartlar 2'li), hamburger menü, alt sheet süzgeç, raf kartı 260 px, sepet tam ekran |
| 735–1068 px | ızgara 2–3 sütun, üst çubukta kategori simgeleri, süzgeç üstte hap'lar |
| 1069–1440 px | ızgara 3–4 sütun, yapışkan satın alma kutusu |
| ≥ 1441 px | içerik en çok **1440 px**, kenarda bol boşluk, ızgara 4 sütun |

Dokunma hedefi ≥ 44 px, yatay taşma yok, %200 yakınlaştırmada bozulma yok, yatay telefonda kullanılabilir (projede `test:responsive` zaten var, vitrini ona ekle).

---

## 4. Çok temalı mimari (en kritik karar)

**Kural: sayfa mantığı ile görünüm ayrı. Temaya "renk" değil, "tasarım dili" seçtiriyoruz.**

```
apps/web/src/storefront/
  core/            ← mantık: veri çekme, sepet, süzgeç, arama, adres çözümü (TEMA BİLMEZ)
  themes/
    index.ts       ← tema kayıt defteri { id, ad, önizleme, belirteçler, bileşenler }
    minimal/       ← "Aydınlık Minimal" (Apple hissi, varsayılan)
    gece/          ← "Gece" (koyu, kontrastlı)
    butik/         ← "Butik" (sıcak, serif başlık, yuvarlak)
    kurumsal/      ← "Kurumsal" (yoğun, tablo/liste ağırlıklı, B2B)
  pages/           ← sayfa iskeletleri; bileşenleri temadan alır
```

- **Belirteç katmanı:** her tema `--sf-*` değişkenlerini verir (renk, yarıçap, gölge, yazı tipi, boşluk ölçeği). Çoğu "yeni tema" yalnızca bu dosya.
- **Bileşen katmanı (slot):** bir tema `ProductCard`, `Tile`, `Header`, `ProductPage` gibi bileşenleri **kendi sürümüyle değiştirebilir**; vermezse varsayılan (`minimal`) kullanılır.
  Böylece "Kurumsal" tema kartı liste satırı yapabilir, "Butik" büyük görselli yapabilir.
- **Tema sözleşmesi (`StorefrontTheme`)**: `{ id, name, description, preview, tokens, components?: Partial<Slots>, fonts? }`. Sözleşme tipiyle zorlanır; eksik belirteç derlemede hata verir.
- **Seçim:** işletme ayarında `storefront.themeId` (+ vurgu rengi, logo, mağaza adı, duyuru çubuğu). Ayarlar ekranında **canlı önizleme** (küçük çerçevede). Bu alan arkadaşın ayarlar sayfasına eklenecek; **sözleşmeyi biz yazarız**, o bağlar.
- **Çalışma zamanı:** tema, `<html data-sf-theme>` ile uygulanır; temalar **yalnızca vitrin rotalarında** yüklenir (panel paketini şişirmez, `import()` ile ayrı parça).
- **Test:** her tema için aynı sayfa testleri + ekran görüntüsü karşılaştırma; **tema eklemek mevcut testleri bozmamalı**.
- **Koyu mod:** tema içinde ayrı belirteç seti (`prefers-color-scheme`) ya da ayrı "Gece" teması — kararı Faz 2'de ver.

---

## 5. Mağaza kimliği, adres ve veri (arkadaşa söylenecekler)

### 5.1 Adres

- İlk sürüm: **`/magaza/:kod`** (kod = işletmenin benzersiz kısa adı, ör. `/magaza/guzel-teknoloji`). Giriş istemez.
- Sonra: **alt alan adı** (`guzel-teknoloji.siteadi.com`) ve **özel alan adı** (`magaza.firmaadi.com`). Bunun için vitrin, adresten **mağazayı çözen tek bir
  fonksiyon** kullanır (yol ya da `Host` başlığı); sayfalar mağaza kodunu parametre olarak değil bağlamdan alır → sonradan adres türü eklemek kolay.
- Pasif/silinmiş işletme → 404. Mağaza kapalıysa "Mağaza yakında açılıyor" sayfası.

### 5.2 Herkese açık API (yeni; `/api/vitrin/:kod/...`, oturum istemez, yalnızca OKUMA)

| Uç nokta | İçerik |
| --- | --- |
| `GET /ayarlar` | mağaza adı, logo, tema, vurgu rengi, duyuru, iletişim, para birimi, KDV gösterimi |
| `GET /kategoriler` | ağaç (yalnızca **aktif ve gizli olmayan**), görsel, SEO alanları |
| `GET /markalar` | yalnızca aktif |
| `GET /urunler?kategori=&marka=&q=&min=&max=&firsat=&sirala=&sayfa=` | sayfalı; **sunucu tarafı** süzme ve sıralama |
| `GET /urunler/:kod` | detay: tüm görseller (sıralı), fiyat listeleri, varyantlar, özellikler, fırsatlar, kategori yolu, benzer ürünler |
| `GET /firsatlar` | aktif fırsatlar ve ürün sayısı |
| `GET /arama-onerileri?q=` | ürün + kategori önerisi (en çok 8) |

Kurallar (arkadaş için):
- **Hangi ürün görünür:** satışa açık, kategorisi aktif, stok durumu ayara bağlı ("stokta yoksa gizle / soluk göster").
- **Hangi fiyat:** işletme ayarında "vitrin fiyat listesi" seçilir (varsayılan ilk liste). Alış fiyatı **asla** dışarı çıkmaz.
- Yanıtlarda **`ETag` / `Cache-Control`**, ürün görseli için **farklı boyutlar** (`?w=400/800/1600`, WebP/AVIF) ve **yer tutucu** (blurhash ya da dominant renk).
- Hız sınırı, bot koruması; kullanıcı kimliği ve iç kimlikler sızdırılmaz (herkese açık `slug`/`kod` kullanılır).
- Ürün ve kategoriler için **`slug`** (adreste güzel yol: `/magaza/kod/urun/flexypos-fp-503`).
- SEO: `sitemap.xml`, `robots.txt`, ürün için **JSON-LD (`Product`, `Offer`, `BreadcrumbList`)**, Open Graph resmi.

### 5.3 SEO ve paylaşım

Vitrin **sunucuda üretilmiş HTML** olmalı mı? Panel tek sayfa uygulaması (SPA). Arama motoru ve paylaşım önizlemesi için ilk sürümde
**yalnızca vitrin rotaları için sunucu tarafında meta etiketi basma** (hafif "prerender"/etiket enjeksiyonu) yeterli; tam SSR'ı Faz 5'te değerlendir.

---

## 6. Sepet (satın alma yok)

- Durum: **tarayıcıda** (`localStorage`, mağaza koduna özel anahtar). Sunucu tarafı sepet yok.
- Satır: ürün kimliği + seçilen özellik/varyant + miktar + **ekleme anındaki fiyat** (gösterim için), her açılışta güncel fiyatla **doğrulanır**
  (fiyat/stok değişmişse satırda "fiyat güncellendi" notu).
- Davranış: ekle → çekmece açılmaz, **küçük bildirim + rozet yayı**; rozete basınca çekmece. Miktar 1–99. Aynı ürün aynı seçenekle birleşir.
- Toplam: ara toplam, KDV, toplam (KDV dahil/hariç ayarı). Para birimi çoklu ise ürün başına ayrı gösterilir (toplama **karıştırılmaz**).
- Şimdilik "Satın al" yok: yerine işletme **iletişim eylemi** (WhatsApp / e-posta / telefon, sepet metni hazır dolu). Ayar kapalıysa yalnızca "Yakında".
- Gelecek (şimdi yapma, yalnızca kapıyı açık bırak): sipariş oluşturma, ödeme, müşteri hesabı. **Sepet depolama arayüzünü soyut tut** (`CartStore`),
  ileride sunucuya taşınabilsin.

---

## 7. Erişilebilirlik, performans, güvenlik

- **WCAG 2.2 AA**: kontrast ≥ 4,5:1 (tema belirteçleri **derleme sırasında kontrast testinden** geçer; geçmeyen tema yayınlanmaz), klavye ile her şey, görünür odak (`2px`, offset `3px`),
  `alt` metinleri anlamlı, başlık hiyerarşisi, "içeriğe atla" bağlantısı, `aria-live` sepet bildirimi, hareket azaltma.
- **Performans bütçesi:** LCP < 2,5 sn (4G), CLS < 0,1, INP < 200 ms. İlk ekran görseli `fetchpriority=high`, diğerleri `loading=lazy`, `srcset/sizes`,
  görsel boyutu önceden belli (CLS yok), yazı tipi `font-display: swap` + ön yükleme, tema parçası bölünmüş, ilk yük JS ≤ ~150 KB (gzip).
- **Güvenlik:** herkese açık uçlar yalnızca okur; ürün açıklamasında HTML varsa **temizlenir**; görsel adresleri doğrulanır; hız sınırı; yönetim panelinin çerezi vitrin
  isteğine **gitmez** (ayrı yol, kimlik doğrulamasız).
- **Kurallar (proje):** Türkçe metin ("mu/mi" küçük harf, "KDV Dahil/Hariç"), `docs/PROJECT_RULES.md` kuralları, her özellik testli, `tsc` + `eslint` + testler yeşil.

---

## 8. Yapım aşamaları (her faz kendi başına yayınlanabilir)

| Faz | İçerik | Kabul ölçütü |
| --- | --- | --- |
| **0 — Taslak** | Figma'da (ya da HTML prototipte) ana sayfa, kategori, ürün detay, sepet — masaüstü + telefon. Kullanıcı onayı. | Onaylı ekran görüntüleri |
| **1 — Temel + Minimal tema** | `storefront/` iskeleti, tema sözleşmesi, `minimal` tema, üst gezinme, altbilgi, **ürün ızgarası**, ürün kartı, kategori sayfası, demo veri (Test Kullanıcısı gibi, sunucusuz) | Telefon/masaüstünde gezilir, testler yeşil |
| **2 — Ürün detay + sepet** | galeri, seçenekler/varyant, satın alma kutusu, sepet çekmecesi ve sayfası, benzer ürünler, karşılaştırma kartları | Sepete ekle → miktar → toplam doğru |
| **3 — Arama, süzgeç, fırsat, marka sayfaları** | süzgeç sheet'i, arama önerileri, Fırsatlar ve Marka sayfaları, ana sayfa rafları | Süzgeç + arama + sıralama çalışır |
| **4 — Gerçek veri** | `/api/vitrin/...` uçları (arkadaş), `/magaza/:kod`, önbellek, görsel boyutları | Gerçek işletmenin ürünleri görünür |
| **5 — Çok tema + ayar** | `gece`, `butik`, `kurumsal` temaları, ayarlarda tema seçimi + canlı önizleme (arkadaşın ekranına bağlanır), alt alan adı | Temayı değiştirince vitrin anında değişir |
| **6 — SEO ve cila** | meta/JSON-LD/sitemap, performans bütçesi, erişilebilirlik denetimi, `test:responsive`'e vitrin | Lighthouse ≥ 90 (Performans/Erişilebilirlik/SEO) |

**Önerilen başlangıç:** Faz 0 → Faz 1. Gerçek API (Faz 4) gelene kadar vitrin **demo veriyle** çalışır; arayüz API sözleşmesine (bölüm 5.2) göre yazılır, böylece
arkadaş sunucuyu bitirdiğinde yalnızca servis dosyası değişir (panelde kullandığımız `*.service.ts` + `*.demo.ts` kalıbı).

---

## 9. Açık sorular (başlamadan netleşmeli)

1. **Mağaza adı ve logo** nereden gelecek? (Profil/işletme ayarları arkadaşta — alanları ona söyleyelim.)
2. **Stoku olmayan ürün** vitrinde gizli mi, soluk mu? (Ayar olarak ikisini de destekleriz; varsayılan: soluk + "Tükendi".)
3. **Fiyat gösterimi:** KDV dahil mi hariç mi, yoksa ikisi de mi? (Öneri: KDV dahil büyük, hariç küçük — panelle aynı.)
4. **Birden çok fiyat listesi** (perakende/toptan): vitrinde yalnızca biri mi, müşteri tipine göre mi? (Öneri: şimdi tek liste.)
5. **İletişim eylemi:** WhatsApp numarası ayarı olacak mı?
6. **Dil/para birimi:** yalnızca Türkçe/TL mi, çoklu para (USD/EUR) ürün bazında gösterilsin mi?
7. **Müşteri hesabı** ileride gelecek mi? (Şimdi hayır; sepet soyutlaması bunun için.)

---

## 10. Claude için çalışma kuralları (bu dosyayı okuyunca)

1. Önce Faz 0 çıktısını (taslak) üret/iste; **onaylanmadan kod yazma**.
2. Vitrin kodu `apps/web/src/storefront/` altında; panelle **belirteç ve bileşen paylaşma** (yalnızca `lib/` yardımcıları ve `@gt/shared` tipleri).
3. Her bileşen: temadan gelen belirteçleri kullan; **renk/yarıçap/gölgeyi sabit yazma**.
4. Önce telefon, sonra geniş ekran; her görünüm için test (RTL) + `test:responsive`.
5. Hareket: yalnızca bölüm 3.3; `prefers-reduced-motion` testi.
6. Servis kalıbı: `storefront.service.ts` (gerçek) + `storefront.demo.ts` (demo); arayüz bölüm 5.2'ye uygun.
7. Arkadaşın alanlarına (profil, ayarlar, `workspace`) dokunma; tema seçimi için **yalnızca sözleşme ve yardımcı kanca** hazırla, bağlamayı o yapsın.
8. Bitirince: değişen dosyalar, doğrulama sonucu, **commit komutu (Claude imzası yok)** ve arkadaşa söylenecek notlar.

---

### Kaynaklar (incelenen sayfalar)

- apple.com/tr (ana sayfa), /tr/store, /tr/shop/buy-iphone, /tr/shop/buy-airpods/airpods-pro-3, /tr/shop/bag
- CSS: `v/homepage/a/styles/{main,homepage,tiles}.built.css`, `api-www/global-elements/global-header/v1/assets/globalheader.css`,
  `ac/globalfooter/8/tr_TR/styles/ac-globalfooter.built.css`, `store.storeimages.cdn-apple.com/.../rs-merch-4.20.3-cc4ae/dist/step0.css`
- Apple Human Interface Guidelines — Typography (SF Pro / New York)
