-- E-ticaret ayarları › Site içeriği

CREATE TABLE `site_gorselleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `tur` VARCHAR(20) NOT NULL,
    `dosya_adi` VARCHAR(120) NOT NULL,
    `hash` CHAR(64) NOT NULL,
    `mime` VARCHAR(40) NOT NULL,
    `boyut` INTEGER NOT NULL,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `site_gorselleri_isletme_indeks`(`isletme_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `site_sayfalari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `ad` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `icerik` LONGTEXT NOT NULL,
    `yasal_tur` VARCHAR(20) NOT NULL DEFAULT 'yok',
    `yayinda` BOOLEAN NOT NULL DEFAULT true,
    `sira` INTEGER NOT NULL DEFAULT 0,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_zamani` DATETIME(3) NOT NULL,

    UNIQUE INDEX `site_sayfalari_slug_tekil`(`isletme_id`, `slug`),
    INDEX `site_sayfalari_isletme_sira_indeks`(`isletme_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `site_menu_ogeleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `grup` VARCHAR(10) NOT NULL,
    `ad` VARCHAR(120) NOT NULL,
    `baglanti` VARCHAR(300) NOT NULL,
    `yeni_sekme` BOOLEAN NOT NULL DEFAULT false,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `sira` INTEGER NOT NULL DEFAULT 0,

    INDEX `site_menu_isletme_grup_sira_indeks`(`isletme_id`, `grup`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `site_sliderlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `baslik` VARCHAR(120) NOT NULL,
    `aciklama` TEXT NOT NULL,
    `baglanti` VARCHAR(300) NOT NULL DEFAULT '',
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `sira` INTEGER NOT NULL DEFAULT 0,
    `gorsel_id` INTEGER NULL,

    INDEX `site_sliderlari_isletme_sira_indeks`(`isletme_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `site_widgetlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `ad` VARCHAR(120) NOT NULL,
    `tur` VARCHAR(20) NOT NULL,
    `baslik` VARCHAR(120) NOT NULL DEFAULT '',
    `gorunur` BOOLEAN NOT NULL DEFAULT true,
    `sira` INTEGER NOT NULL DEFAULT 0,
    `ayarlar` JSON NOT NULL,

    INDEX `site_widgetlari_isletme_sira_indeks`(`isletme_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `site_sablon_degiskenleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `ad` VARCHAR(120) NOT NULL,
    `tur` VARCHAR(10) NOT NULL,
    `modul` VARCHAR(60) NOT NULL,
    `aciklama` VARCHAR(1000) NOT NULL DEFAULT '',
    `sira` INTEGER NOT NULL DEFAULT 0,

    INDEX `site_sablon_isletme_sira_indeks`(`isletme_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `site_sablon_degisken_alanlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `degisken_id` INTEGER NOT NULL,
    `db_sutun` VARCHAR(120) NOT NULL DEFAULT '',
    `degisken` VARCHAR(120) NOT NULL DEFAULT '',
    `sira` INTEGER NOT NULL DEFAULT 0,

    INDEX `site_sablon_alan_degisken_sira_indeks`(`degisken_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `site_gorselleri` ADD CONSTRAINT `site_gorselleri_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `site_sayfalari` ADD CONSTRAINT `site_sayfalari_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `site_menu_ogeleri` ADD CONSTRAINT `site_menu_ogeleri_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `site_sliderlari` ADD CONSTRAINT `site_sliderlari_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `site_sliderlari` ADD CONSTRAINT `site_sliderlari_gorsel_id_fkey` FOREIGN KEY (`gorsel_id`) REFERENCES `site_gorselleri`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `site_widgetlari` ADD CONSTRAINT `site_widgetlari_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `site_sablon_degiskenleri` ADD CONSTRAINT `site_sablon_degiskenleri_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `site_sablon_degisken_alanlari` ADD CONSTRAINT `site_sablon_degisken_alanlari_degisken_id_fkey` FOREIGN KEY (`degisken_id`) REFERENCES `site_sablon_degiskenleri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;