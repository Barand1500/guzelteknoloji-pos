CREATE TABLE `urun_vergileri` (
  `urun_id` INTEGER NOT NULL,
  `vergi_id` INTEGER NOT NULL,
  `oran` DECIMAL(18,6) NULL,
  `sira` INTEGER NOT NULL,
  PRIMARY KEY (`urun_id`, `vergi_id`),
  CONSTRAINT `urun_vergileri_urun_id_fkey` FOREIGN KEY (`urun_id`) REFERENCES `urunler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `urun_vergileri_vergi_id_fkey` FOREIGN KEY (`vergi_id`) REFERENCES `urun_secenekleri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Eski tek vergi korunur; daha önce girilmeyen oran sıfır varsayılmadan boş bırakılır.
INSERT INTO `urun_vergileri` (`urun_id`, `vergi_id`, `oran`, `sira`)
SELECT `id`, `diger_vergi_id`, NULL, 0 FROM `urunler` WHERE `diger_vergi_id` IS NOT NULL;

ALTER TABLE `urunler` DROP FOREIGN KEY `urunler_vergi_baglantisi`, DROP COLUMN `diger_vergi_id`;
