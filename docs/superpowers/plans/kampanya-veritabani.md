# Kampanya ekranları için kalıcı API ve veritabanı

## Tasarım

Sepet indirimi ve ücretsiz kargo aynı `kampanyalar` ana tablosunda iki ayrı tür olur. Her işletme sahibinin her tür için bir genel kuralı bulunur; özel kurallar ayrı satırlarda saklanır. Özel kuralın kategori ve marka kapsamı ilişki tablolarıyla tutulur; cari tipi/fiyat listesi seçimleri JSON dizisi olur. API mevcut ekran sözleşmesini ve `cart`/`shipping` ayrımını korur. Ücretsiz kargoda kullanılmayan indirim kolonları boş kalır. Kampanya ekranında zaman aralığı yok; tarih/süre alanı eklenmez.

## Uygulama

1. GET varsayılanları ve özel kural kaydı için başarısız API testlerini ekle.
2. Prisma modelleri ve eski veriyi etkilemeyen ileri migration ekle.
3. İşletme sahibine göre kapsamlı, yetki kontrollü kampanya API'sini yazıp ekrana bağla.
4. Kampanya kaydı, kategori/marka sahipliği ve iki kampanya türünün davranışını test et; typecheck çalıştır.

## Doğrulama odağı

- Sepet ve kargo ayarları birbirinden bağımsız kalmalı.
- Özel kurallar yalnızca oturum sahibinin kampanyasına yazılmalı.
- Kategori/marka seçimleri başka kullanıcıya ait kayıtlara bağlanamamalı.
- `durum`, para, JSON seçimleri ve tarih alanları UI ile aynı sözleşmeyi korumalı.
