# Sipariş, tahsilat ve iade

Sanal POS/kart sağlayıcısı kullanıcı isteğiyle sonraya bırakılmıştır. Buradaki işlemler yetkili yönetim kullanıcısı içindir; müşteri mağazası checkout'u veya banka transferi başlatan bir servis değildir.

## Ekranlar

- Gelen Siparişler → Yeni Sipariş: aktif müşteri, fiyat listesi, ödeme şekli ve ürün/miktar seçilir. Tutarı Hesapla ile sunucu fiyatı görülür, ardından Siparişi Oluştur ile sipariş, stok düşümü ve müşteri borcu birlikte kaydedilir.
- Sipariş detayı → Tahsilat ve İade: havale/nakit/kapıda ödeme gerçekten alındıktan sonra referans ve teyitle tahsilat kaydedilir. Tutar ekrandakinden değişmişse yeniden teyit gerekir.
- Sipariş detayı → Ürün Bazlı İade Talebi: yalnızca kalan satılan miktar talep edilebilir. Bir siparişte aynı anda bir açık talep tutulur; tamamlandıktan/reddedildikten sonra başka kısmi talep açılabilir.
- İade/Değişim → Onayla → Tamamla: teslim alınan ve tekrar satılabilir satırlar seçilir. Tahsilat varsa gerçekte yapılan geri ödeme teyit edilir. Tahsilat yoksa yalnızca borç azaltılır. Stok takibi kapalı satırlarda stok artışı oluşturulmaz.
- Değişim gerekiyorsa iade kaydı sonuçlandırılır, yeni ürün için ayrı sipariş oluşturulur. Ürün değiştirilmiş gibi yalnızca durum güncelleyen bir işlem yapılmaz.

## API

- `GET /api/siparisler/secenekler`: sipariş okuma yetkisiyle gerekli aktif müşteri, ürün, fiyat listesi ve ödeme şekli seçenekleri.
- `POST /api/siparisler/onizleme`: sipariş okuma yetkisiyle fiyat hesaplama, kayıt yok.
- `POST /api/siparisler`: sipariş kaydetme yetkisi; `CreateOrderInput`. Beklenen toplam (`expectedTotal`) sunucu toplamıyla aynı olmalı.
- `GET /api/siparisler/istek/:requestId`: belirsiz sonuçlanan siparişin kimliği; tarayıcıda yalnızca istek UUID'si oturum kapsamında saklanır, adres/sepet saklanmaz.
- `GET /api/siparisler/:id/islemler`: finansal hareket ve iade satırları.
- `POST /api/siparisler/:id/tahsilat`: `requestId`, `reference`, `confirmed:true`, `expectedAmount`.
- `POST /api/siparisler/:id/iade`: `requestId`, `reason`, `items:[{lineId,quantity}]`.
- `POST /api/siparisler/iade/:id/tamamla`: `requestId`, `reference`, `confirmed:true`, `expectedAmount`, `restockLineIds`. Tahsilat yoksa `expectedAmount:"0.00"`.
- Mevcut durum uçları korunur. Yeni akışta geçersiz geriye geçiş ve finansal teyitsiz iade tamamlama reddedilir.

Fiyat/indirim, müşteri cari tipi ve iade tutarı sunucudan gelir. Para hesapları Decimal/kuruş ile yapılır. Ürün indirimi yalnızca kampanyaya uygun satırlara dağıtılır; kısmi iadelerde son miktar kuruş farkını kapatır.

## İlk sürüm sınırları

Ana birim, varyantsız, ek vergisiz TRY ürünler desteklenir; diğer ürünlerde yanlış hesaplama yerine açık hata döner. Kargo tutarı yönetici tarafından KDV dahil girilir; KDV oranı ayrıca seçilir. Ürün iadesi kargo ücretini otomatik iade etmez. Kısmi tahsilat yerine kalan borcun tamamının tahsilatı kaydedilir. Kart/sanal POS entegrasyonu ve müşteri mağazası oturumu ayrı çalışmadır.

Eski siparişlerde ödeme ve stok geçmişi bilinmediğinden `akis_surumu=0` korunur; geriye dönük otomatik tahsilat/stoğa iade yapılmaz. Yeni siparişler `akis_surumu=1` ile çalışır. İade ödeme referansı, teyit eden kullanıcı ve tamamlanma tarihi saklanır.

Migration `20261113180000_siparis_tahsilat_iade` yalnızca eklemeler yapar; **çalıştırılmadı**. Kullanıcı deploy sırasında önce migration'ları uygular, sonra yeni API'yi başlatır. Gerçek MySQL bağlantısı bu ortamda olmadığından migration ve DB ile uçtan uca doğrulama deploy sonrasına kalır.

## Kontrol kaydı

Bağımsız kod incelemesinde bulunan tutar değişimi ve belirsiz ağ hatası sorunları düzeltildi: tahsilat beklenen tutarla karşılaştırılır, form tekrarları değişmez istekle gönderilir, kapanan sipariş formu UUID üzerinden mevcut kaydı sorgular. Bunların testleri eklendi. Canlı MySQL, sağlayıcı ve üretim tarayıcısı bu yerel kontrolün kapsamında doğrulanamaz.
