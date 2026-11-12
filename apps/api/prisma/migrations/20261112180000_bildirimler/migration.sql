-- Bildirimler › Mobil Bildirimler

CREATE TABLE `bildirimler` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `baslik` VARCHAR(60) NOT NULL,
    `metin` VARCHAR(240) NOT NULL,
    `gonderim_zamani` DATETIME(3) NOT NULL,
    `durum` VARCHAR(12) NOT NULL DEFAULT 'scheduled',
    `otomatik` BOOLEAN NOT NULL DEFAULT false,
    `tum_musteriler` BOOLEAN NOT NULL DEFAULT true,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_zamani` DATETIME(3) NOT NULL,

    INDEX `bildirimler_isletme_zaman_indeks`(`isletme_id`, `gonderim_zamani`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `bildirim_musterileri` (
    `bildirim_id` INTEGER NOT NULL,
    `musteri_id` INTEGER NOT NULL,

    INDEX `bildirim_musterileri_musteri_indeks`(`musteri_id`),
    PRIMARY KEY (`bildirim_id`, `musteri_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `bildirimler` ADD CONSTRAINT `bildirimler_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `bildirim_musterileri` ADD CONSTRAINT `bildirim_musterileri_bildirim_id_fkey` FOREIGN KEY (`bildirim_id`) REFERENCES `bildirimler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `bildirim_musterileri` ADD CONSTRAINT `bildirim_musterileri_musteri_id_fkey` FOREIGN KEY (`musteri_id`) REFERENCES `musteriler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;