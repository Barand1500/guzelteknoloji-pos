# İşletme ayarlarını bölüm bazlı JSON saklama

## Tasarım

`isletme_ayarlari` tablosunda her işletme ve bölüm için tek satır bulunur. Bölüm alanları aynı JSON nesnesinde saklanır; entegrasyonlar (`google`, `whatsapp`, `smtp`, `imap`, `cloudflare`, `recaptcha`) ve `sms` birbirinden ayrı bölüm/JSON değerleridir. Mevcut API'nin ayar alanları string tabanlı okuma/yazma sözleşmesi korunur. Gizli değerler JSON'a yazılmadan önce mevcut AES-GCM şifrelemesinden geçer. Migration, mevcut `(işletme, bölüm, alan)` satırlarını bölüm bazında JSON nesnesine dönüştürür; değerleri ve şifreli sırları aynen korur.

## Uygulama adımları

1. Bölüm JSON'unu okuma ve mevcut ayar davranışını koruma testlerini ekle; başarısız olduklarını gör.
2. Prisma modelini `(businessId, section)` anahtarlı `Json` alanına geçir ve eski kayıtları gruplandıran ileri migration ekle.
3. Ayar okuma/kaydetme, entegrasyon karşılıklı dışlama, Google OAuth token yazma ve bağlantı ayırma kodlarını bölüm JSON'u kullanacak şekilde güncelle.
4. İlgili API testlerini ve API typecheck'i çalıştır.

## Kapsam notu

SMS sağlayıcısı ve alanları henüz belirlenmediğinden UI/entegrasyon alanları icat edilmeyecek. Şema herhangi bir bölüm anahtarını JSON nesnesi olarak saklayabildiğinden `sms` de aynı depolama modelini kullanabilir.

## Doğrulama odağı

- Gizli JSON alanları normal API yanıtında görünmemeli; yetkili iç okumada şifresi çözülmeli.
- Bir alan güncellenirken aynı bölümdeki diğer alanlar korunmalı.
- İki captcha sağlayıcısının aynı anda etkinleşmesi engellenmeye devam etmeli.
- Google token callback/ayırma işlemleri bölümün kalan JSON değerlerini bozmamalı.
- Migration eski anahtarları ve değerleri bölüm JSON'una kayıpsız taşımalı.
