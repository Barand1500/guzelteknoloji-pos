-- Marka adı ve ayrıntıları tek tabloda toplanır. Kullanıcı sahipliği korunur.
ALTER TABLE `markalar`
  ADD COLUMN `kullanici_kimligi` CHAR(36) NULL,
  ADD COLUMN `marka_kodu` VARCHAR(100) NULL,
  ADD COLUMN `marka_adi` VARCHAR(120) NULL,
  ADD COLUMN `ad_ozeti` CHAR(64) NULL,
  ADD COLUMN `etkin` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `sira` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
UPDATE `markalar` m JOIN `stok_secenekleri` s ON s.`kimlik` = m.`kimlik`
SET m.`kullanici_kimligi` = s.`kullanici_kimligi`, m.`marka_kodu` = s.`secenek_kodu`, m.`marka_adi` = s.`secenek_adi`, m.`ad_ozeti` = s.`ad_ozeti`, m.`etkin` = s.`etkin`, m.`sira` = s.`sira`, m.`olusturma_zamani` = s.`olusturma_zamani`;
INSERT INTO `markalar` (`kimlik`, `kullanici_kimligi`, `marka_kodu`, `marka_adi`, `ad_ozeti`, `etkin`, `sira`, `olusturma_zamani`, `aciklama`, `seo_basligi`, `seo_aciklamasi`, `guncelleme_zamani`)
SELECT s.`kimlik`, s.`kullanici_kimligi`, s.`secenek_kodu`, s.`secenek_adi`, s.`ad_ozeti`, s.`etkin`, s.`sira`, s.`olusturma_zamani`, '', '', '', CURRENT_TIMESTAMP(3)
FROM `stok_secenekleri` s LEFT JOIN `markalar` m ON m.`kimlik` = s.`kimlik` WHERE s.`liste_turu` = 'brands' AND m.`kimlik` IS NULL;
ALTER TABLE `markalar` DROP FOREIGN KEY `markalar_secenek_baglantisi`, MODIFY `kullanici_kimligi` CHAR(36) NOT NULL, MODIFY `marka_kodu` VARCHAR(100) NOT NULL, MODIFY `marka_adi` VARCHAR(120) NOT NULL, MODIFY `ad_ozeti` CHAR(64) NOT NULL,
  ADD UNIQUE INDEX `markalar_kod_tekil` (`kullanici_kimligi`, `marka_kodu`), ADD UNIQUE INDEX `markalar_ad_tekil` (`kullanici_kimligi`, `ad_ozeti`),
  ADD CONSTRAINT `markalar_kullanici_baglantisi` FOREIGN KEY (`kullanici_kimligi`) REFERENCES `kullanicilar` (`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `stok_kartlari` DROP FOREIGN KEY `stok_kartlari_marka_baglantisi`;
ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_marka_baglantisi` FOREIGN KEY (`marka_kimligi`) REFERENCES `markalar` (`kimlik`) ON DELETE SET NULL ON UPDATE CASCADE;
DELETE FROM `stok_secenekleri` WHERE `liste_turu` = 'brands';
