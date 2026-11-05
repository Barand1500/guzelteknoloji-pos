# Veritabani adlari

Uygulama tabloları, sütunları ve Prisma model/alan adları Türkçedir. Araç uyumluluğu için adlarda Türkçe karakter kullanılmaz. SQL adları `alt_cizgi`, Prisma alanları `kucukHarfleBaslayan` biçimindedir. `@map`/`@@map` mevcut SQL adlarını korur; API yanıtları repository katmanında mevcut sözleşmeye çevrilir.

- Kullanici: kullanicilar
- SifreBilgisi: sifre_bilgileri
- GirisKimligi: giris_kimlikleri
- Oturum: oturumlar
- EpostaGirisKodu: eposta_giris_kodlari
- StokSecenegi: stok_secenekleri
- StokKarti: stok_kartlari
- StokFiyatListesi: stok_fiyat_listeleri
- StokBirimi: stok_birimleri
- StokFiyati: stok_fiyatlari
- StokEkFiyati: stok_ek_fiyatlari
- StokBarkodu: stok_barkodlari

`_prisma_migrations`, Prisma'nın yönettiği teknik tablodur; adı ve sütunları değiştirilmez. Google/Apple marka adları korunur. Prisma'daki `AKTIF`, `DEVRE_DISI`, `EPOSTA` değerleri `@map` ile veritabanındaki mevcut `ACTIVE`, `DISABLED`, `EMAIL` değerlerine bağlanır.

Yalnızca Prisma adlarının Türkçeleştirilmesi yeni migration gerektirmez. Yeni kodla birlikte `npm run db:generate` çalıştırılıp API yeniden derlenir ve başlatılır. Aşağıdaki migration adımları eski İngilizce SQL tablo adlarından geçiş içindir.

## Canliya uygulama

Veritabanini yedekleyin. Guncel kodu ve Prisma istemcisini derledikten sonra API'yi durdurun, npm run db:deploy calistirin ve API'yi yeniden baslatin. Eski kod yeni adlarla calisamaz; bu nedenle migration API durdurulmusken uygulanmalidir. Tablo/sutun silinmez, veriler tasinmaz; RENAME ile korunur. MySQL DDL islemleri transaction ile geri alinamaz. Migration basarisizsa API'yi baslatmadan once durum incelenmelidir.
