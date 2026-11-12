-- Tanımlamalar › Para Birimleri

CREATE TABLE `para_birimleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `ad` VARCHAR(60) NOT NULL,
    `kisa_ad` VARCHAR(5) NOT NULL,
    `sembol` VARCHAR(8) NOT NULL,
    `ana_mi` BOOLEAN NOT NULL DEFAULT false,
    `kur_tipi` VARCHAR(20) NOT NULL,
    `otomatik` BOOLEAN NOT NULL DEFAULT false,
    `kur` DECIMAL(18, 6) NOT NULL DEFAULT 1,
    `api_url` VARCHAR(300) NOT NULL DEFAULT '',
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `sira` INTEGER NOT NULL DEFAULT 0,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_zamani` DATETIME(3) NOT NULL,

    UNIQUE INDEX `para_birimleri_kod_tekil`(`isletme_id`, `kisa_ad`),
    INDEX `para_birimleri_isletme_sira_indeks`(`isletme_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tanımlamalar › Kargo firmaları

CREATE TABLE `kargo_firmalari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `ad` VARCHAR(120) NOT NULL,
    `kisa_ad` VARCHAR(12) NOT NULL,
    `api_url` VARCHAR(300) NOT NULL DEFAULT '',
    `kdv_orani` INTEGER NOT NULL DEFAULT 20,
    `sira` INTEGER NOT NULL DEFAULT 0,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_zamani` DATETIME(3) NOT NULL,

    UNIQUE INDEX `kargo_firmalari_ad_tekil`(`isletme_id`, `ad`),
    INDEX `kargo_firmalari_isletme_sira_indeks`(`isletme_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kargo_fiyat_basamaklari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `firma_id` INTEGER NOT NULL,
    `tur` VARCHAR(10) NOT NULL,
    `sira` INTEGER NOT NULL DEFAULT 0,
    `ust_sinir` INTEGER NULL,
    `fiyat` DECIMAL(12, 2) NOT NULL,
    `birim_basi` BOOLEAN NOT NULL DEFAULT false,

    INDEX `kargo_fiyat_firma_tur_sira_indeks`(`firma_id`, `tur`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kargo_lokasyonlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `ust_id` INTEGER NULL,
    `ad` VARCHAR(120) NOT NULL,
    `seviye` INTEGER NOT NULL DEFAULT 0,
    `sira` INTEGER NOT NULL DEFAULT 0,

    INDEX `kargo_lokasyon_isletme_ust_sira_indeks`(`isletme_id`, `ust_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kargo_tanimlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `liste` VARCHAR(30) NOT NULL,
    `baslik` VARCHAR(120) NOT NULL,
    `kisa_ad` VARCHAR(60) NOT NULL DEFAULT '',
    `metin` TEXT NOT NULL,
    `sira` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `kargo_tanimlari_baslik_tekil`(`isletme_id`, `liste`, `baslik`),
    INDEX `kargo_tanimlari_liste_sira_indeks`(`isletme_id`, `liste`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys
ALTER TABLE `para_birimleri` ADD CONSTRAINT `para_birimleri_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `kargo_firmalari` ADD CONSTRAINT `kargo_firmalari_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `kargo_fiyat_basamaklari` ADD CONSTRAINT `kargo_fiyat_basamaklari_firma_id_fkey` FOREIGN KEY (`firma_id`) REFERENCES `kargo_firmalari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `kargo_lokasyonlari` ADD CONSTRAINT `kargo_lokasyonlari_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `kargo_lokasyonlari` ADD CONSTRAINT `kargo_lokasyonlari_ust_id_fkey` FOREIGN KEY (`ust_id`) REFERENCES `kargo_lokasyonlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `kargo_tanimlari` ADD CONSTRAINT `kargo_tanimlari_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;