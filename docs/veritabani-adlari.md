# Veritabani adlari

Uygulama tabloları, sütunları ve Prisma model/alan adları Türkçedir. Araç uyumluluğu için adlarda Türkçe karakter kullanılmaz. SQL adları `alt_cizgi`, Prisma alanları `kucukHarfleBaslayan` biçimindedir. `@map`/`@@map` mevcut SQL adlarını korur; API yanıtları repository katmanında mevcut sözleşmeye çevrilir.

- Kullanici: kullanicilar
- GirisKimligi: giris_kimlikleri
- Oturum: oturumlar
- StokSecenegi: stok_secenekleri
- StokKarti: stok_kartlari
- StokFiyatListesi: stok_fiyat_listeleri
- StokBirimi: stok_birimleri
- StokFiyati: stok_fiyatlari
- StokEkFiyati: stok_ek_fiyatlari
- StokBarkodu: stok_barkodlari
- Marka: markalar

`_prisma_migrations`, Prisma'nın yönettiği teknik tablodur; adı ve sütunları değiştirilmez. Google/Apple marka adları korunur. Prisma'daki `AKTIF`, `DEVRE_DISI`, `EPOSTA` değerleri `@map` ile veritabanındaki mevcut `ACTIVE`, `DISABLED`, `EMAIL` değerlerine bağlanır.

Yalnızca Prisma adlarının Türkçeleştirilmesi yeni migration gerektirmez. Yeni kodla birlikte `npm run db:generate` çalıştırılıp API yeniden derlenir ve başlatılır. Aşağıdaki migration adımları eski İngilizce SQL tablo adlarından geçiş içindir. Bağımsız marka ve hesaplanan fiyat sadeleştirmesi fiziksel migration gerektirir; marka geçişi `docs/markalar-veritabani.md` içinde açıklanır.

## Canliya uygulama

`20261106160000_sirali_sayisal_kimlikler`, mevcut kayıtların UUID birincil anahtarlarını artan sayısal kimliklerle değiştirir. Kullanıcı, oturum, marka, stok ve alt tablolar arasındaki bağlantılar eski/yeni kimlik eşleştirmesiyle korunur. Var olan kayıtların yeni sayıları eski UUID'lerin sırasına göre atanır; yeni kayıtlar otomatik artar. Silinen veya başarısız kayıtlarda numara boşluğu olabilir. API marka/stok kimliklerini sayısal metin olarak döndürür; eski UUID içeren kayıt bağlantıları değişir. Stok istek kimliği ayrı bir tekrar önleme anahtarı olarak korunur.

Bu geçiş tablo kopyaları oluşturur ve MySQL DDL transaction ile geri alınamadığından sunucu kapalıyken uygulanmalıdır. Migration öncesi doğrulanmış yedek alın ve yeterli boş disk alanı sağlayın. Herhangi bir aşama başarısız olursa API'yi başlatmadan yeni/eski tabloların ve `__gt_id_map` eşleştirmesinin durumunu inceleyin. Özel trigger veya dış sistemlerde saklanan eski ID bağlantıları varsa ayrıca uyarlama gerekir.

`20261106150000_eposta_kodlari_redis` eski `eposta_giris_kodlari` tablosunu kaldırır; `20261106180000_eposta_kodlari_mysql` aynı adlı tabloyu `eposta_hash`/`kod_hash` alanlarıyla yeniden oluşturur (Redis kullanılmaz). Bekleyen eski kodlar geçersiz olur; kullanıcı yeni kod ister. Eski migration'lar tarihsel tablo adlarını korur.

`20261106140000_hash_alan_adlari`, hash alanlarını veri değiştirmeden yeniden adlandırır: `sifre_hash`, `oturum_anahtari_hash`, `kod_hash`, `ad_hash`, `logo_hash`, `kayit_istegi_hash`. Prisma alanları da `sifreHash`, `oturumAnahtariHash`, `kodHash`, `adHash`, `logoHash`, `kayitIstegiHash` biçimindedir. Önceki migration dosyalarındaki eski adlar tarihsel olarak korunur. API durdurularak migration uygulanır ve yeni kod başlatılır.

`20261106130000_kullanici_sifre_birlestirme`, şifre hash'ini ve iki tarih alanını `kullanicilar` tablosuna taşır, ardından `sifre_bilgileri` tablosunu kaldırır. Şifresiz hesapların alanları `NULL` kalır. Bu migration öncesinde API durdurulmalı ve yedek alınmalıdır; eski API bu değişiklikten sonra çalışmaz. Kullanıcıların şifrelerini değiştirmesi gerekmez. Aşağıdaki RENAME açıklaması yalnızca eski Türkçeleştirme migration'ı içindir.

`20261112140000_zaman_tarih_adlari`, `_zamani` ile biten tüm kolon adlarını `_tarihi` olarak yeniden adlandırır (olusturma/guncelleme, son_giris, son_kullanim, son_gorulme, iptal, sifre olusturma/guncelleme, eposta dogrulama); Prisma alanları da `...Tarihi` biçimindedir. Aynı migration'da `islem_kayitlari` → `islem_loglari` ve `islem_degisiklikleri` → `islem_kayitlari_detayi` tabloları yeniden adlandırılır (Prisma: `IslemLogu`, `IslemKaydiDetayi`). Veri değişmez; indeks tanımları MySQL 8'de kolon adını otomatik izler. API durdurularak `npm run db:deploy` uygulanır.

`20261112170000_seo_ayarlari`, SEO Ayarları ekranının verisini hazırlar: `urunler` tablosuna `seo_basligi`/`seo_aciklamasi` kolonları eklenir (kategori/marka/fırsat zaten kendi kolonlarında taşır) ve 301 yönlendirmeleri için `seo_yonlendirmeleri` tablosu oluşturulur (`isletme_id`, `tur`, `kaynak_id`, `eski_adres` + kendi SEO kolonları; `kaynak_id` yabancı anahtar değildir). Mevcut satırlarda SEO alanları boş (`''`) başlar; kayıt silinmez, veri taşınmaz. Ayrıntı: `docs/seo-api.md`.

Veritabanini yedekleyin. Guncel kodu ve Prisma istemcisini derledikten sonra API'yi durdurun, npm run db:deploy calistirin ve API'yi yeniden baslatin. Eski kod yeni adlarla calisamaz; bu nedenle migration API durdurulmusken uygulanmalidir. Tablo/sutun silinmez, veriler tasinmaz; RENAME ile korunur. MySQL DDL islemleri transaction ile geri alinamaz. Migration basarisizsa API'yi baslatmadan once durum incelenmelidir.
