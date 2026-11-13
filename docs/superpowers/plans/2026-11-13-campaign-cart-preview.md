# Kayıtlı kampanyalarla gerçek ürün sepeti

Kullanıcı, migration/deploy adımlarını kendisi yapacak; mevcut yerel değişiklikler korunacak.

## Kapsam ve kararlar

- Cari tipi/fiyat listesi alanları API'de sabit ad listesiyle sınırlandırılmayacak. İşletmeye ait gerçek kimlikler doğrulanacak; eski adlar mevcut tanımlamayla eşleşirse kimliğe çevrilecek.
- Sunucu, işletmenin ana birim satış fiyatlarından TRY sepeti hesaplayacak. İstemci ürün fiyatı gönderemeyecek. Stok ve satış açıklığı kontrol edilecek.
- Aktif genel ve özel kurallar bağımsız değerlendirilecek. Özel kuraldaki kategori ve marka koşulları birlikte sağlanacak. Eşik, o kurala uyan ürünlerin toplamıdır.
- Birbiriyle çakışan sepet indirimlerinden tutarı en yüksek olanı uygulanacak; indirimler üst üste binmeyecek. Ücretsiz kargo eşiği indirim öncesi uygun ürün toplamından kontrol edilecek.
- Kargo bedeli yönetici denemesinde girilir; taşıyıcı fiyatlandırması veya ödeme tahsilatı olarak kullanılmaz.
- Ekrandaki yeni deneme alanı kaydedilmiş kuralları kullanır. Sipariş, stok veya finansal kayıt yazmaz.
- ERP ve mobil bildirim sağlayıcısı bilgileri olmadan bağlantı uydurulmayacak. Migration/deploy çalıştırılmayacak.

## Uygulama

1. `campaign-audience.ts`: API seçimlerini işletme kapsamıyla doğrula; kimlik, eski ad, başka işletme ve bilinmeyen değer testleri.
2. `campaign-calculator.ts`: ondalık hesap, uygun ürün kapsamı, en iyi indirim ve kargo koşulları için bağımsız hesaplayıcı; ilgili testler.
3. `campaign-quote.ts` ve `packages/shared/src/campaign.ts`: doğrulanan giriş, gerçek ürün/fiyat sorgusu ve önizleme JSON sözleşmesi. Mevcut kampanya router'ında `POST /hesapla` ucu, okuma yetkisiyle korunur. Geçersiz ürün/liste, sahte fiyat, stok ve para birimi kontrolü.
4. Web `CartPreview.tsx`: mevcut ürün seçicisini ve tanımlama seçeneklerini kullan; yalnızca gerçek oturumda servisle hesapla, demo oturumunda sunucuya gönderme. Kaydedilmemiş taslağın önizlemeyi etkilemediğini belirt.
5. İlgili testler, API/web tür denetimi ve diff kontrolü. Harici servis bilgisi gerektiren kalanları açıkça raporla.
