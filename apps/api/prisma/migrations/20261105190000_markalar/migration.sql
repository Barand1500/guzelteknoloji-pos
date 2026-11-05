CREATE TABLE `markalar` (
  `kimlik` CHAR(36) NOT NULL,
  `aciklama` TEXT NOT NULL,
  `logo_verisi` MEDIUMBLOB NULL,
  `logo_ozeti` CHAR(64) NULL,
  `seo_basligi` VARCHAR(250) NOT NULL,
  `seo_aciklamasi` VARCHAR(1000) NOT NULL,
  `guncelleme_zamani` DATETIME(3) NOT NULL,
  PRIMARY KEY (`kimlik`),
  CONSTRAINT `markalar_secenek_baglantisi` FOREIGN KEY (`kimlik`) REFERENCES `stok_secenekleri` (`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `markalar` (`kimlik`, `aciklama`, `seo_basligi`, `seo_aciklamasi`, `guncelleme_zamani`)
SELECT `kimlik`, '', '', '', CURRENT_TIMESTAMP(3) FROM `stok_secenekleri` WHERE `liste_turu` = 'brands';
