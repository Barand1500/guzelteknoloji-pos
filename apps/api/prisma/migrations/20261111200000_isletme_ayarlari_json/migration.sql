-- Eski satır bazlı ayarları bölüm başına JSON nesnesine kayıpsız dönüştür.
-- Gizli değerler önceden şifreli metin olduğundan içerikleri değiştirilmeden taşınır.
CREATE TABLE `isletme_ayarlari_json_gecis` (
    `isletme_id` INTEGER NOT NULL,
    `bolum` VARCHAR(30) NOT NULL,
    `degerler` JSON NOT NULL,
    PRIMARY KEY (`isletme_id`, `bolum`),
    CONSTRAINT `isletme_ayarlari_json_gecis_isletme_id_fkey`
      FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `isletme_ayarlari_json_gecis` (`isletme_id`, `bolum`, `degerler`)
SELECT `isletme_id`, `bolum`, JSON_OBJECTAGG(`alan`, `deger`)
FROM `isletme_ayarlari`
GROUP BY `isletme_id`, `bolum`;

DROP TABLE `isletme_ayarlari`;
RENAME TABLE `isletme_ayarlari_json_gecis` TO `isletme_ayarlari`;
