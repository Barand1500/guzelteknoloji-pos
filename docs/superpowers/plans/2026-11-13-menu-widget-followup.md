# Ayar ekranlarının devamı

Kullanıcı referanslara göre uygulama istedi; mevcut kayıtlar korunur, deploy/migration yapılmaz.

- Şablon araç çubuğunda Button.leadingIcon ve yatay metin; e-posta konusu için açıklama.
- Genel Ayarlar tarih ve B2C/B2B/Katalog seçiminin gönderilme/yeniden yüklenme testi. Bunlar kayıt alanlarıdır, mağaza satış kuralları bu işin kapsamında değişmez.
- Menü blok adları ayrı site_menu JSON ayar bölümünde alt1/alt2/alt3; mevcut menü kayıtları ve sıralama değişmez. Başlıklar yüklenmeden kaydetme kapalı, hata görünür.
- Widget düzenleri mevcut settings JSON içinde duzen; yedi görsel seçim. Ürün/kategori seçimleri settings.veriTuru ve settings.veriKimlikleri içinde; API işletme sahipliğini doğrular. Görsel, bağlantı ve metin verileri yerleşime göre düzenlenir. Eski tür ve ayarlar korunur.
- İlgili ekran/kayıt/sahiplik testleri ve tip kontrolü. Vitrin render sistemi bu depoda olmadığı için mağazada görünüm eşitliği iddia edilmez.
