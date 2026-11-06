CREATE TABLE `stok_gorselleri` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `stok_karti_id` INTEGER NOT NULL,
  `dosya_adi` VARCHAR(255) NOT NULL,
  `sira` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `stok_gorselleri_dosya_adi_key` (`dosya_adi`),
  INDEX `stok_gorselleri_stok_karti_id_sira_idx` (`stok_karti_id`, `sira`),
  CONSTRAINT `stok_gorselleri_stok_karti_id_fkey` FOREIGN KEY (`stok_karti_id`) REFERENCES `stok_kartlari` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
