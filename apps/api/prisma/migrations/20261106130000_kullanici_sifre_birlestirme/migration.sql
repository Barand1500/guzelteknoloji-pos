-- API durdurulmuşken uygulanır. Mevcut Argon2id özetleri ve tarihler aynen taşınır.
ALTER TABLE `kullanicilar`
  ADD COLUMN `sifre_ozeti` VARCHAR(255) NULL,
  ADD COLUMN `sifre_olusturma_zamani` DATETIME(3) NULL,
  ADD COLUMN `sifre_guncelleme_zamani` DATETIME(3) NULL;

UPDATE `kullanicilar` AS k
INNER JOIN `sifre_bilgileri` AS s ON s.`kullanici_kimligi` = k.`kimlik`
SET k.`sifre_ozeti` = s.`sifre_ozeti`,
    k.`sifre_olusturma_zamani` = s.`olusturma_zamani`,
    k.`sifre_guncelleme_zamani` = s.`guncelleme_zamani`;

DROP TABLE `sifre_bilgileri`;
