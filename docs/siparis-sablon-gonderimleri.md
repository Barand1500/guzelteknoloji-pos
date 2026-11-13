# Sipariş SMS/e-posta gönderimleri

## Kurulum

Yeni migration: `20261113200000_sablon_gonderimleri`. Sunucuda mevcut deploy akışında `npm run db:deploy` uygulanmalı, Prisma istemcisi oluşturulmalı ve API yeniden başlatılmalı. Bu çalışma sırasında veritabanına migration uygulanmadı.

## Kullanım

1. İşletmenin SMS veya SMTP bağlantısını yapılandırıp aktif edin. Otomatik sipariş mesajları yalnızca o işletmenin açıkça aktif edilmiş kendi bağlantısını kullanır; ortak SMTP bilgisiyle tamamlanmaz.
2. SMS/E-posta Şablonları ekranında şablon ekleyin veya düzenleyin.
3. **Gönderim Olayı** seçin. Seçilmezse otomatik gönderilmez. Eski şablonlarda da seçim başlangıçta kapalı kalır.
4. Konu/içerik içine gösterilen değişkenleri ekleyin. Müşteri adı, sipariş numarası/tutarı/tarihi/durumu ve işletme adı desteklenir. İade tutarı yalnızca iade/değişim olaylarında kullanılabilir.
5. Şablon Değişkenleri ekranındaki Siparişler/Sistem modülleri, doğru kanal ve desteklenen kaynak sütunuyla eşleştirilmişse editörde ek değişken olarak görünür. Parola, doğrulama kodu veya keyfi veritabanı sütunu okunmaz.
6. Sipariş/ödeme/iade işlemi tamamlandığında gönderim aynı transaction içinde kuyruğa yazılır. Ağ üzerinden gönderim API işçisi tarafından yaklaşık 10 saniyelik aralıklarla işlenir. Demo kullanıcı gerçek gönderim yapmaz.
7. **Gönderim Geçmişi** son 50 kaydın sonucunu gösterir. Alıcı adresi ve mesaj içeriği burada listelenmez.

## Sonuçlar

- Bekliyor: Henüz işlenmedi.
- Gönderiliyor: Bir işçi atomik olarak sahiplendi.
- Gönderildi: SMTP/SMS sağlayıcısı kabul etti; alıcının okuduğu veya cihazına teslim edildiği anlamına gelmez.
- Başarısız: Şablon verisi/yapılandırma geçersiz veya sağlayıcı açıkça reddetti.
- Sonuç belirsiz: Ağ kesintisi/süreç kapanması sırasında sağlayıcının kabul edip etmediği kesin değil. Çift gönderimi önlemek için otomatik tekrar yapılmaz. Sağlayıcı panelinden kontrol edilmelidir.
- Atlandı: Alıcı eksik/uygunsuz veya gönderimden önce bağlantı kapatılmış.

Kayıt anahtarı işletme + işlem olayı + kanala göre tektir. Aynı sipariş isteğinin tekrarı ikinci mesaj oluşturmaz. Kuyruk satırı satış kaydıyla birlikte kalıcılaşır; SMTP/Netgsm hatası tamamlanmış satışın sonucunu değiştirmez. Geçmişteki siparişlere geriye dönük toplu mesaj gönderilmez.

## Sınırlar ve kapsam

E-posta içeriği başına 64.000, toplam şablon JSON'u için 250.000 karakter; SMS içeriği başına 4.000 ve toplam JSON için 20.000 karakter. E-posta şu an düz metin gönderilir; görsel HTML tasarım editörü eklenmedi.

ERP adaptörü, sanal POS/BIN işlem akışı ve mağaza vitrini bu değişikliğe dahil değildir. Widget düzen ve veri seçimleri kaydedilir; vitrin oluşturulurken bu kayıtları okuyup düzenleri çizen bölüm de bağlanmalıdır. Mevcut uygulama giriş kodu e-postaları değiştirilmedi.
