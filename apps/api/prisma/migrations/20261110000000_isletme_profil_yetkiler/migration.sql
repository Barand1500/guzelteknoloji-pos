-- CreateTable
CREATE TABLE `isletmeler` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ad` VARCHAR(120) NOT NULL,
    `sahip_id` INTEGER NOT NULL,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `isletmeler_sahip_id_key`(`sahip_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `isletme_uyeleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `kullanici_id` INTEGER NULL,
    `eposta` VARCHAR(254) NULL,
    `ad` VARCHAR(120) NOT NULL,
    `rol_id` INTEGER NULL,
    `etkin` BOOLEAN NOT NULL DEFAULT true,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `isletme_uyeleri_kullanici_id_key`(`kullanici_id`),
    UNIQUE INDEX `isletme_uyeleri_eposta_key`(`eposta`),
    INDEX `isletme_uyeleri_isletme_id_idx`(`isletme_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `isletme_rolleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `ad` VARCHAR(120) NOT NULL,

    UNIQUE INDEX `isletme_rolleri_isletme_id_ad_key`(`isletme_id`, `ad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rol_yetkileri` (
    `rol_id` INTEGER NOT NULL,
    `bolum` VARCHAR(30) NOT NULL,
    `goruntule` BOOLEAN NOT NULL,
    `kaydet` BOOLEAN NOT NULL,
    `sil` BOOLEAN NOT NULL,

    PRIMARY KEY (`rol_id`, `bolum`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `isletme_ayarlari` (
    `isletme_id` INTEGER NOT NULL,
    `bolum` VARCHAR(30) NOT NULL,
    `alan` VARCHAR(80) NOT NULL,
    `deger` TEXT NOT NULL,

    PRIMARY KEY (`isletme_id`, `bolum`, `alan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `islem_kayitlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `kullanici_id` INTEGER NULL,
    `kullanici_adi` VARCHAR(254) NOT NULL,
    `bolum` VARCHAR(30) NOT NULL,
    `islem` VARCHAR(80) NOT NULL,
    `kayit` VARCHAR(200) NULL,
    `sonuc` VARCHAR(20) NOT NULL,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `islem_kayitlari_isletme_id_olusturma_zamani_id_idx`(`isletme_id`, `olusturma_zamani`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `islem_degisiklikleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kayit_id` INTEGER NOT NULL,
    `alan` VARCHAR(150) NOT NULL,
    `eski_deger` TEXT NULL,
    `yeni_deger` TEXT NULL,

    INDEX `islem_degisiklikleri_kayit_id_idx`(`kayit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `isletmeler` ADD CONSTRAINT `isletmeler_sahip_id_fkey` FOREIGN KEY (`sahip_id`) REFERENCES `kullanicilar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `isletme_uyeleri` ADD CONSTRAINT `isletme_uyeleri_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `isletme_uyeleri` ADD CONSTRAINT `isletme_uyeleri_kullanici_id_fkey` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `isletme_uyeleri` ADD CONSTRAINT `isletme_uyeleri_rol_id_fkey` FOREIGN KEY (`rol_id`) REFERENCES `isletme_rolleri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `isletme_rolleri` ADD CONSTRAINT `isletme_rolleri_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rol_yetkileri` ADD CONSTRAINT `rol_yetkileri_rol_id_fkey` FOREIGN KEY (`rol_id`) REFERENCES `isletme_rolleri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `isletme_ayarlari` ADD CONSTRAINT `isletme_ayarlari_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `islem_kayitlari` ADD CONSTRAINT `islem_kayitlari_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `islem_kayitlari` ADD CONSTRAINT `islem_kayitlari_kullanici_id_fkey` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `islem_degisiklikleri` ADD CONSTRAINT `islem_degisiklikleri_kayit_id_fkey` FOREIGN KEY (`kayit_id`) REFERENCES `islem_kayitlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Eski hesapların katalog sahipliği değişmez; her hesap kendi işletmesinin sahibidir.
INSERT INTO `isletmeler` (`ad`, `sahip_id`)
SELECT LEFT(COALESCE(NULLIF(`gorunen_ad`, ''), 'İşletmem'),120), `id` FROM `kullanicilar`;
INSERT INTO `isletme_uyeleri` (`isletme_id`, `kullanici_id`, `eposta`, `ad`, `etkin`)
SELECT i.`id`, k.`id`, k.`eposta`, LEFT(COALESCE(k.`gorunen_ad`, k.`eposta`, 'İşletme Sahibi'),120), true
FROM `isletmeler` i JOIN `kullanicilar` k ON k.`id`=i.`sahip_id`;
