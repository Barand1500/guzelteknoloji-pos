-- Tanımlamalar › Ödeme Şekilleri ve Resmi Tatil Günleri

CREATE TABLE `odeme_sekilleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `ad` VARCHAR(120) NOT NULL,
    `simge` VARCHAR(20) NULL,
    `gorsel_adi` VARCHAR(120) NULL,
    `varsayilan` BOOLEAN NOT NULL DEFAULT false,
    `fiyat_listesi` VARCHAR(120) NOT NULL DEFAULT '',
    `kargo_yok` BOOLEAN NOT NULL DEFAULT false,
    `duzenlemeye_acik` BOOLEAN NOT NULL DEFAULT false,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `sira` INTEGER NOT NULL DEFAULT 0,

    INDEX `odeme_sekilleri_isletme_sira_indeks`(`isletme_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ozel_tatiller` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `ad` VARCHAR(120) NOT NULL,
    `baslangic` DATE NOT NULL,
    `bitis` DATE NOT NULL,

    INDEX `ozel_tatiller_isletme_tarih_indeks`(`isletme_id`, `baslangic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `odeme_sekilleri` ADD CONSTRAINT `odeme_sekilleri_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ozel_tatiller` ADD CONSTRAINT `ozel_tatiller_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
