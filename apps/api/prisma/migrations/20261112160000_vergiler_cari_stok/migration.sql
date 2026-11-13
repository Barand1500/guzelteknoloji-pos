-- Tanımlamalar › Vergiler

CREATE TABLE `vergi_turleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `ad` VARCHAR(60) NOT NULL,
    `kisa_ad` VARCHAR(12) NOT NULL,
    `sira` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `vergi_turleri_ad_tekil`(`isletme_id`, `ad`),
    INDEX `vergi_turleri_isletme_sira_indeks`(`isletme_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `vergi_oranlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tur_id` INTEGER NOT NULL,
    `oran` DECIMAL(6, 2) NOT NULL,
    `sira` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `vergi_oranlari_tur_oran_tekil`(`tur_id`, `oran`),
    INDEX `vergi_oranlari_tur_sira_indeks`(`tur_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `vergi_daireleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `ad` VARCHAR(120) NOT NULL,
    `yerlesik` BOOLEAN NOT NULL DEFAULT false,
    `sira` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `vergi_daireleri_ad_tekil`(`isletme_id`, `ad`),
    INDEX `vergi_daireleri_isletme_sira_indeks`(`isletme_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tanımlamalar › Cari ve Stok Tanımları

CREATE TABLE `cari_tipleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `ad` VARCHAR(120) NOT NULL,
    `sira` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `cari_tipleri_ad_tekil`(`isletme_id`, `ad`),
    INDEX `cari_tipleri_isletme_sira_indeks`(`isletme_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `fiyat_listesi_ayarlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `secenek_id` INTEGER NOT NULL,
    `tur` VARCHAR(10) NOT NULL DEFAULT 'general',
    `baslangic` DATE NULL,
    `bitis` DATE NULL,
    `varsayilan` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `fiyat_listesi_ayarlari_secenek_id_key`(`secenek_id`),
    INDEX `fiyat_listesi_ayarlari_isletme_indeks`(`isletme_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys
ALTER TABLE `vergi_turleri` ADD CONSTRAINT `vergi_turleri_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `vergi_oranlari` ADD CONSTRAINT `vergi_oranlari_tur_id_fkey` FOREIGN KEY (`tur_id`) REFERENCES `vergi_turleri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `vergi_daireleri` ADD CONSTRAINT `vergi_daireleri_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `cari_tipleri` ADD CONSTRAINT `cari_tipleri_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `fiyat_listesi_ayarlari` ADD CONSTRAINT `fiyat_listesi_ayarlari_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `fiyat_listesi_ayarlari` ADD CONSTRAINT `fiyat_listesi_ayarlari_secenek_id_fkey` FOREIGN KEY (`secenek_id`) REFERENCES `urun_secenekleri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
