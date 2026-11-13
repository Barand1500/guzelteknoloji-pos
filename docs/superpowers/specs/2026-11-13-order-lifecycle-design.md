# Sipariş, tahsilat ve ürün bazlı iade

Kullanıcının onayı: önceki mesajda anlatılan sipariş–ödeme–stok bağlantısını mevcut yapıyı bozmadan uygulama talebi. Migration ve deploy kullanıcıda kalır. Mevcut kirli çalışma ağacındaki değişiklikler korunur.

## Yaklaşım

Mevcut Express/Prisma yönetim API'si ve sipariş ekranları genişletilir. Ayrı bir mağaza uygulaması veya seçilmemiş bir kart kuruluşu icat edilmez. Yönetimden gerçek sipariş oluşturma, havale/nakit/kapıda ödeme tahsilatını açıkça kaydetme ve ürün bazlı iade yapılabilir. Kartla tahsilat/iade ancak gerçek kuruluş adaptörü seçilip doğrulanınca kullanılabilir; manuel işlem kart işlemi diye sunulmaz.

## Kurallar

- Fiyatlar/kampanyalar sunucudan; müşteri, ödeme şekli ve ürünler işletme kapsamlıdır. Ana birim, varyantsız TRY ürünlerle mevcut hesaplama motoru kullanılır; desteklenmeyen ürün açıkça reddedilir.
- Sipariş, satır tutarları, cari borç ve stok düşümü tek transaction'da. Tekrarlanan istek aynı sonucu döndürür; aynı anahtarla farklı içerik reddedilir. Stok koşullu güncellemeyle eksiye düşmez.
- Yeni siparişler yönetilen akış olarak işaretlenir. Eski siparişlerin finansal geçmişi uydurulmaz. Tahsilat ve iadeler bağımsız hareket kayıtlarıdır.
- Tahsilat açık bir kullanıcı teyidi ve harici referans gerektirir. Ekran yalnızca kaydı tutar; banka transferi başlatmaz. Fazla/çift tahsilat engellenir.
- İade satırları gerçek sipariş satırlarına bağlı; miktarlar satılandan fazla olamaz. İade ürün tutarı kampanya sonrası satırdan hesaplanır. Kargo iadesi otomatik yapılmaz.
- İade talebinde ürünün teslim alınıp satılabilir olduğu her satır için açıkça belirtilir. Tamamlama stoğu bir kez artırır; finansal iade ayrı ve açık teyitli kayıttır. Ödenmiş siparişte iade ödemesi kaydı olmadan talep tamamlanmaz.
- İptal: kargolanmamış ve tahsil edilmemiş yeni sipariş için stok/cari borç geri alınır; ödenmiş/kargolanmış sipariş iadeden ilerler. Tamamlanmış işlemler geri açılmaz.
- Geçmiş, ürün silinse de korunur; stok iadesinde eksik ürün hata verir. Finansal tutarlar Decimal/kuruş ile hesaplanır.

## Harici bağımlılık

Kullanıcı sanal POS bağlantısını sonraya bırakmayı seçti. Sağlayıcı olmadan gerçek karttan para çekildi/iade edildi iddiası yapılmaz. Genel mağaza oturumu ve müşteri checkout'u bu yönetim akışından ayrı kimlik doğrulaması gerektirir; yetkili API halka açılmaz. İlk sürüm kalan borcun tam tahsilatını ve kargo hariç ürün iadesini destekler. Değişim, iadenin ardından yeni sipariş olarak işlenir.
