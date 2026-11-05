# Veritabani adlari

Uygulama tablolari ve sutunlari Turkce, kucuk harf ve alt cizgi ile adlandirilir. Tasima ve arac uyumu icin Turkce karakter kullanilmaz. Prisma @map/@@map sayesinde kodun kullandigi alanlar ayni kalir.

- User: kullanicilar
- PasswordCredential: sifre_bilgileri
- AuthIdentity: giris_kimlikleri
- Session: oturumlar
- EmailLoginCode: eposta_giris_kodlari

_prisma_migrations, Prisma'nin yonettigi teknik migration tablosudur; adi ve sutunlari degistirilmez. GOOGLE/APPLE gibi saglayici degerleri ve mevcut enum degerleri korunur.

## Canliya uygulama

Veritabanini yedekleyin. Guncel kodu ve Prisma istemcisini derledikten sonra API'yi durdurun, npm run db:deploy calistirin ve API'yi yeniden baslatin. Eski kod yeni adlarla calisamaz; bu nedenle migration API durdurulmusken uygulanmalidir. Tablo/sutun silinmez, veriler tasinmaz; RENAME ile korunur. MySQL DDL islemleri transaction ile geri alinamaz. Migration basarisizsa API'yi baslatmadan once durum incelenmelidir.
