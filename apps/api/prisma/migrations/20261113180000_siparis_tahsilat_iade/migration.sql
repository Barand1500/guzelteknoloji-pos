-- Yalnızca eklemeli: geçmiş siparişler akis_surumu=0 olarak korunur.
ALTER TABLE `siparisler`
  ADD COLUMN `akis_surumu` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `istek_id` CHAR(36) NULL,
  ADD COLUMN `istek_hash` CHAR(64) NULL,
  ADD COLUMN `odeme_turu` VARCHAR(30) NULL,
  ADD COLUMN `indirim_tutari` DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN `kargo_tutari` DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN `kargo_kdv_orani` INTEGER NOT NULL DEFAULT 20,
  ADD UNIQUE INDEX `siparisler_isletme_istek_tekil` (`isletme_id`, `istek_id`);
ALTER TABLE `siparis_satirlari`
  ADD COLUMN `satis_tutari` DECIMAL(18,2) NULL,
  ADD COLUMN `net_tutar` DECIMAL(18,2) NULL,
  ADD COLUMN `stok_islendi` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `iade_talepleri`
  ADD COLUMN `siparis_id` INTEGER NULL,
  ADD COLUMN `istek_id` CHAR(36) NULL,
  ADD COLUMN `istek_hash` CHAR(64) NULL,
  ADD COLUMN `iade_tutari` DECIMAL(18,2) NULL,
  ADD COLUMN `tamamlama_hash` CHAR(64) NULL,
  ADD COLUMN `tamamlama_referansi` VARCHAR(160) NULL,
  ADD COLUMN `tamamlayan_id` INTEGER NULL,
  ADD COLUMN `tamamlanma_tarihi` DATETIME(3) NULL,
  ADD UNIQUE INDEX `iadeler_isletme_istek_tekil` (`isletme_id`, `istek_id`),
  ADD CONSTRAINT `iade_talepleri_siparis_id_fkey` FOREIGN KEY (`siparis_id`) REFERENCES `siparisler` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE `iade_satirlari` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `iade_id` INTEGER NOT NULL,
  `siparis_satiri_id` INTEGER NOT NULL,
  `adet` DECIMAL(18,3) NOT NULL,
  `tutar` DECIMAL(18,2) NOT NULL,
  `stoga_eklendi` BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `iade_satirlari_satir_tekil` (`iade_id`, `siparis_satiri_id`),
  INDEX `iade_satirlari_siparis_indeks` (`siparis_satiri_id`),
  CONSTRAINT `iade_satirlari_iade_id_fkey` FOREIGN KEY (`iade_id`) REFERENCES `iade_talepleri` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `iade_satirlari_siparis_satiri_id_fkey` FOREIGN KEY (`siparis_satiri_id`) REFERENCES `siparis_satirlari` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `siparis_odeme_hareketleri` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `siparis_id` INTEGER NOT NULL,
  `iade_id` INTEGER NULL,
  `istek_id` CHAR(36) NOT NULL,
  `istek_hash` CHAR(64) NOT NULL,
  `tur` VARCHAR(20) NOT NULL,
  `tutar` DECIMAL(18,2) NOT NULL,
  `referans` VARCHAR(160) NOT NULL,
  `kullanici_id` INTEGER NOT NULL,
  `tarih` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `siparis_odeme_iade_tekil` (`iade_id`),
  UNIQUE INDEX `siparis_odeme_istek_tekil` (`siparis_id`, `istek_id`),
  INDEX `siparis_odeme_tarih_indeks` (`siparis_id`, `tarih`),
  CONSTRAINT `siparis_odeme_hareketleri_siparis_id_fkey` FOREIGN KEY (`siparis_id`) REFERENCES `siparisler` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `siparis_odeme_hareketleri_iade_id_fkey` FOREIGN KEY (`iade_id`) REFERENCES `iade_talepleri` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
