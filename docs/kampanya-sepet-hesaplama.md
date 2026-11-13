# Kayıtlı kampanyalarla sepet önizlemesi

`POST /api/kampanyalar/hesapla`, işletme oturumu ve `campaigns.read` yetkisiyle çalışır. Kampanyalar ekranındaki **Kayıtlı kurallarla sepet denemesi** alanı bu ucu kullanır.

Örnek istek:

```json
{
  "priceListId": "6",
  "customerTypeId": "5",
  "shippingFee": 50,
  "items": [{ "productId": "1", "quantity": 2 }]
}
```

`customerTypeId` boş (`null`) olabilir. Ürün fiyatı, KDV veya indirim tutarı istemciden alınmaz. `shippingFee`, yönetim ekranındaki deneme bedelidir; gerçek kargo fiyatlandırması veya ödeme tahsilatı kaynağı değildir.

Sunucu, tek veritabanı görüntüsü içinde ürünleri, ana birim satış fiyatlarını ve kayıtlı kuralları okur. Ürün iskontosu ve KDV fiyatın üzerine işlenir. Her kampanyada cari tipi/fiyat listesi koşulları birlikte sağlanmalıdır; özel kuralda kategori ve marka koşulları da birlikte uygulanır. Eşik yalnızca o kurala uyan ürünlerin toplamından hesaplanır. Aktif özel kurallar genel kuralın aktif olmasına bağlı değildir.

Çakışan sepet indirimlerinden en büyük tutarlı olan uygulanır. İndirim, o kurala uyan ürünlerin toplamını aşamaz. Ücretsiz kargo ayrı değerlendirilir; eşiği kampanya indirimi öncesindeki uygun ürün toplamıdır. Sonuç tutarları ondalık hesapla kuruşa yuvarlanıp string olarak döner.

Önizleme en fazla 100 farklı ürün, ana birim, üç ondalığa kadar pozitif miktar ve TRY satış fiyatını destekler. Satışa kapalı/yetersiz stoklu ürün, yanlış işletme seçimi, geçerli olmayan özel fiyat listesi veya varyant gerektiren ürün reddedilir. Aynı ürün tek satırda gönderilir.

Bu uç sipariş, stok hareketi, ödeme veya müşteri bakiyesi yazmaz. Gelecekte mağaza sepeti/sipariş akışı aynı hesaplayıcıyı sunucuda kullanabilir; önizleme yanıtı ödeme onayı olarak kabul edilmez.

Cari tipi ve fiyat listesi seçimleri artık işletmenin gerçek kayıt kimlikleriyle kaydedilir. Eski adla kayıtlı seçimler mevcut bir tanımlamayla eşleştiğinde kimliğe çevrilir; bilinmeyen seçim kayıtta sessizce kaldırılmaz, kullanıcıya doğrulama hatası döner.

Bu geliştirme yeni migration gerektirmez. Önceki SEO migration/deploy işlemleri kullanıcı tarafından uygulanacaktır.
