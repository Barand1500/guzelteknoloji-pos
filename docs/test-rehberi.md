# Uygulama Test Rehberi

Baştan sona gerçek hesapla deneme sırası. Her adımda "Beklenen" yazanı kontrol et; tutmayan yeri not alıp ekran görüntüsüyle ilet.
Veri girerken anlamsız "111" yerine aşağıdaki hazır örnekleri kullan.

**Hazırlık:** sunucuda `bash deploy/update.sh` çalışmış olsun. Önce gerçek hesapla giriş yap (Test Kullanıcısı değil). Telefonda da ayrıca dene; açıklamada "(telefon)" yazan yerler var.

---

## 1. Giriş
| Ne yap | Beklenen |
|---|---|
| E-posta + şifreyle gir | Üst çubukta "Günaydın/İyi akşamlar + adın" görünür; açılış ekranı Yeni Stok Kartı |
| Üstte ay simgesine bas | Koyu tema açılır, tekrar basınca açık |
| Çıkış simgesi | Giriş ekranına döner |

## 2. Kategoriler (`/uygulama/kategoriler`)
Önce ürünlerde kullanacağımız kategorileri aç.
| Kategori adı |
|---|
| POS Cihazları |
| Barkod Okuyucular |
| Yazıcılar |
| Sarf Malzeme |

Beklenen: ekle, ad değiştir, sil çalışır; liste yenileyince (F5) aynı kalır.

## 3. Markalar (`/uygulama/markalar`)
Örnek: **FlexyPOS**, **Zebra**, **Epson**. Beklenen: eklenir, F5'te durur, silme onay sorar.

## 4. Özellikler (`/uygulama/ozellikler`)
- Grup: **Renk** (değerler: Siyah, Beyaz) → "Varyant için kullan" açık.
- Grup: **Garanti** (değerler: 1 Yıl, 2 Yıl) → varyant kapalı.

Beklenen: grup ve değerler eklenir, F5'te durur.

## 5. Fırsatlar (Ürünler → Fırsatlar)
Örnek: **Kasım İndirimi**. Beklenen: eklenir; stok kartının Fırsat sekmesinde seçilebilir.

## 6. Stok kartı: yeni ürün (alt çubukta "+")
Örnek ürün 1:

| Alan | Değer |
|---|---|
| Stok Kodu | FP-503 |
| Stok Adı | FlexyPOS FP-503 15.6" Dokunmatik POS |
| Marka | FlexyPOS |
| Kategori (yan panel) | POS Cihazları |
| Stok miktarı | 12 |
| FİYAT listesi → Satış Fiyatı | 25000 (KDV %20) |
| Alış fiyatı | 19000 |
| Barkod | 8690000000011 |

Beklenen:
- Kaydet → "Kaydedildi" ekranı; Ürünler listesinde en üstte görünür.
- Aynı stok kodunu tekrar kaydetmeye çalışırsan hata verir.
- Boş ad/kod ile kaydet → ilgili alanda uyarı.

Örnek ürün 2 (hızlı): Kod **ZB-100**, Ad **Zebra El Terminali**, Marka Zebra, Fiyat 8500, Stok 0, stok takibi kapalı.

### 6.1 Birden fazla fiyat listesi (en önemli yenilik)
1. Fiyat sekmelerinin yanındaki **+** ile yeni liste ekle: **BARAN**.
2. BARAN sekmesine geç, Satış Fiyatı **22000** gir, kaydet.
3. **Ürünler** listesine dön.

Beklenen:
- Tabloda sütun başlıkları "Fiyat 1/2/3" değil, listenin adı (FİYAT, BARAN…).
- 3'ten fazla liste varsa "Fiyat sütunları" çipleri çıkar; çipe basınca sütun açılıp kapanır.
- Bu listede fiyatı girilmemiş ürünlerde "—" yazar (0,00 değil).
- (telefon) Fiyat seçicide liste adların + Alış çıkar; satıra dokununca tüm listeler adlarıyla görünür.
- Formda birim ve barkod listeler arasında ortaktır, fiyatlar ayrıdır.

### 6.2 Yan panel (masaüstü)
Sağ kenardaki sekmeler: Özet, Kategori, Fırsat, Özellik.
- Kategori: birden fazla seçilir, sayı rozeti güncellenir.
- Özellik: Renk = Siyah seç; kaydet.
- Varyant: Özellik sekmesinde varyant oluştur (ör. Siyah / Beyaz), her birine kod, barkod, fiyat, miktar ver; kaydet. Yenileyince durur.

### 6.3 Düzenleme / kopya
Ürün listesinde satıra çift tıkla (telefonda Düzenle) → alanlar dolu gelir. Bir şey değiştirip başka ürüne geçmeye çalış: "Kaydedilmemiş değişiklik" sorar. **Kopya** ile açınca yeni kayıt olarak açılır.
"Sonraki ürün" çubuğunda göz simgesine gelince önizleme çıkar.

## 7. Ürünler listesi (`/uygulama/urunler`)
| Ne yap | Beklenen |
|---|---|
| Arama kutusuna `zebra` yaz | Ad, kod, marka ya da barkoda göre süzülür |
| Süzgeç → Kategori/Marka/Stok/Satış/Fiyat aralığı | Canlı sayı "N Ürünü Göster" değişir; Sıfırla çalışır |
| Seçim modu → birkaç ürün seç → Toplu: Stok takibi aç/kapat, Satışa aç/kapat | Uygulanır, F5'te durur |
| Toplu → Sil | Onay sorar, siler |
| Stok Takibi / Satış anahtarı (tek ürün) | Anında değişir |
| Resmin üstüne gel (masaüstü) | Büyük önizleme yanında açılır |
| 10'dan çok ürün varsa sayfa düğmeleri | Sayfalar arası geçilir |

## 8. Excel (CSV) ile yükleme
Ürünler ekranında Excel düğmesi. Aşağıdakini `urunler.csv` olarak kaydet (UTF-8):

```
Stok Kodu,Ürün Adı,Fiyat 1,Fiyat 2,Fiyat 3,Kategori,Marka,KDV,Stok
EP-200,Epson Fiş Yazıcı,4200,4000,3800,Yazıcılar,Epson,20,30
ZB-300,Zebra Barkod Okuyucu,2100,2000,1900,Barkod Okuyucular,Zebra,20,45
HATALI-1,,100,,,,,20,5
```

Beklenen: önizlemede 2 satır "Yeni ürün", 1 satır hata ("Ürün adı boş"); onaylayınca iki ürün eklenir; aynı dosyayı tekrar yükleyince "Mevcut ürün, güncellenecek" der. Fiyat 1/2/3 ilk üç listeye yazılır.

## 9. Toplu Görsel (Ürünler → Toplu Görsel)
1. Bilgisayarında dosya adı ürün kodunu içeren birkaç resim hazırla: `FP-503.jpg`, `ZB-100.png`, ve eşleşmeyecek bir `rastgele.jpg`.
2. Yükle → **Eşleştir ve Onayla** adımı.

Beklenen:
- "N ürün eşleşti" ve "1 eşleşmeyen" çipleri.
- Eşleşmeyen dosyada **Ürün seç** ile elle eşleştir ya da X ile kaldır.
- Küçük resmin üstüne gelince büyük önizleme.
- "Mevcut görselleri değiştir" kapalıyken yeniler sona eklenir, açıkken eskiler silinir.
- **Yükle** → ürün listesinde resimler görünür; ilk resim vitrin.

## 10. Telefon özel kontroller
- Alt çubuk: Ürünler, Kategoriler, +, Markalar, Özellikler.
- Ürün satırına dokun → açılır; Stok Takibi/Satışta anahtarları, Düzenle / Kopya / Diğer.
- Resmin köşesindeki büyüteç → resmi büyütür.
- Yan panel sekmeleri ve fiyat sekmeleri taşmadan kaydırılır.

## 11. Genel kontrol
- Koyu temada tüm ekranlar okunur mu?
- İnternet kesilince hata mesajı + "Tekrar Dene" çıkıyor mu?
- Çok ürün olunca (yüzlerce) liste yavaşlıyor mu? Süreyi not et.
- Çıkış yapıp tekrar girince veriler duruyor mu?

## Hata bildirirken
Ekran görüntüsü + hangi sayfa + ne yaptığın + ne olmasını beklediğin yeterli. Tarayıcıda F12 → Console'daki kırmızı hata varsa onu da ekle.
