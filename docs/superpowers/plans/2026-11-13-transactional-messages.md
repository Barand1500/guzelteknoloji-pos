# Sipariş şablonlarını gönderime bağlama

Kullanıcı önem sırasıyla uygulama istedi. Mevcut çalışma alanındaki demo şablon düzeltmeleri korunur. Canlı veri/migration/deploy çalıştırılmaz.

1. shared/message-templates.ts: olay kataloğu, güvenli değişken kaynakları, şablon doğrulaması ve kapasite sınırları. Eski şablonlar olay seçilene kadar otomatik gönderilmez.
2. Şablon editörü: olay seçimi, ortak ve işletmeye tanımlı desteklenen değişkenleri ekleme, geniş e-posta metni. Keyfi DB alanı/SQL çalıştırılmaz.
3. Sipariş/iade transaction'larına isteğe bağlı olay kaydedici enjekte edilir. Üretim app hem lifecycle hem status store yollarını bağlar. Gönderim kaydı satışla aynı transaction'dadır, ağ çağrısı dışındadır.
4. sablon_gonderimleri: işleme/kanala göre tek kayıt; pending/sending/sent/failed/uncertain/skipped durumu. Aktif bağlantı ve açıkça olaya bağlanmış şablon varsa kayıt oluşur. Alıcı/snapshot sadece ilgili işletmeden. Tek atomik claim; hata veya belirsizlikte otomatik yeniden gönderim yok. Başarısız SMS satışa hata döndürmez.
5. Sunucuda arka plan işçisi; mevcut SMTP ve Netgsm katmanı, işletme ayarları. Genel SMTP üzerinden farklı işletme bilgisiyle sessiz tamamlama yok. Kapanışta işçi durur. Migration dosyası hazırlanır, kullanıcı uygular.
6. Şablon ekranından işletmeye özel gönderim geçmişi; içerik/alıcı gösterilmez. Eski e-posta giriş kodu akışı korunur.
7. İlgili token, kapsam, tekrar/idempotency, worker hata ve lifecycle testleri; tip kontrolü/build. ERP sağlayıcı ve sanal POS/BIN bilgisi olmadan adaptör uydurulmaz. Vitrin bu işte oluşturulmaz.
