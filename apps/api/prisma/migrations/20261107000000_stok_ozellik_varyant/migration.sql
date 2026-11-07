CREATE TABLE `stok_ozellik_degerleri` (
 `stok_karti_id` INTEGER NOT NULL, `deger_id` INTEGER NOT NULL,
 PRIMARY KEY (`stok_karti_id`, `deger_id`),
 CONSTRAINT `stok_ozellik_degerleri_stok_karti_id_fkey` FOREIGN KEY (`stok_karti_id`) REFERENCES `stok_kartlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `stok_ozellik_degerleri_deger_id_fkey` FOREIGN KEY (`deger_id`) REFERENCES `ozellik_degerleri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `stok_varyantlari` (
 `id` INTEGER NOT NULL AUTO_INCREMENT, `stok_karti_id` INTEGER NOT NULL,
 `kod` VARCHAR(100) NOT NULL, `barkod` VARCHAR(100) NULL,
 `fiyat` DECIMAL(18,6) NOT NULL, `miktar` DECIMAL(18,6) NOT NULL,
 PRIMARY KEY (`id`), UNIQUE INDEX `stok_varyantlari_stok_karti_id_kod_key` (`stok_karti_id`,`kod`),
 INDEX `stok_varyantlari_stok_karti_id_idx` (`stok_karti_id`),
 CONSTRAINT `stok_varyantlari_stok_karti_id_fkey` FOREIGN KEY (`stok_karti_id`) REFERENCES `stok_kartlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `stok_varyant_degerleri` (
 `varyant_id` INTEGER NOT NULL, `deger_id` INTEGER NOT NULL,
 PRIMARY KEY (`varyant_id`,`deger_id`),
 CONSTRAINT `stok_varyant_degerleri_varyant_id_fkey` FOREIGN KEY (`varyant_id`) REFERENCES `stok_varyantlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `stok_varyant_degerleri_deger_id_fkey` FOREIGN KEY (`deger_id`) REFERENCES `ozellik_degerleri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
