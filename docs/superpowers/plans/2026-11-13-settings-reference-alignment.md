# Ayar ekranlarını referansa uyarlama

Kullanıcı uygulama istedi. Mevcut veriler korunur; migration/deploy çalıştırılmaz.

- Genel Ayarlar: sistem adı/adresi, web adresi, B2C/B2B/Katalog, açılış tarihi, BIN listesi linki ve bayi sözleşmesi PDF. Eski iletişim alanları ekrandan kalkar, veritabanından silinmez.
- PDF işletme kapsamlı uploads/belgeler altında; yalnızca yetkili kullanıcı okuyabilir/yükleyebilir. Ayarlara dosya adı yazılır, Base64 saklanmaz.
- Sistem sayfasından ziyaretçi istatistikleri kartı kaldırılır. Varsayılan stok gösterimi üç seçenek olur. İletişimde vergi dairesi işletmenin kayıtlı listesinden seçilir.
- SMTP kartında SMS ile aynı oklarla e-posta şablonlarına geçilir. Liste adı/konu/içerik kaydı, arama, sayfalama, CSV, ekleme/düzenleme; mevcut işletme JSON ayarları kullanılır. Otomatik gönderim eklenmez.
- Menü ve widget yalnızca incelenir, değiştirilmez. Menü blok başlığı eksikliği ve widget'ın görsel seçimi ile gerçek düzen/veri seçimi farkı kullanıcıya bildirilir.
- İlgili ekran ve kayıt testleri, PDF işletme sınırı testi, API/web tip kontrolleri.
