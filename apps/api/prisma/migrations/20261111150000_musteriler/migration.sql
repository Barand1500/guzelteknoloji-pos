-- CreateTable
CREATE TABLE `musteriler` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `musteri_kodu` VARCHAR(40) NOT NULL DEFAULT '',
    `ad` VARCHAR(160) NOT NULL,
    `tur` VARCHAR(20) NOT NULL DEFAULT 'real',
    `vergi_kimligi` VARCHAR(20) NOT NULL DEFAULT '',
    `telefon` VARCHAR(30) NOT NULL,
    `eposta` VARCHAR(254) NOT NULL,
    `fiyat_listesi` VARCHAR(40) NOT NULL,
    `cari_tipi` VARCHAR(40) NOT NULL,
    `odeme_sekilleri` TEXT NOT NULL,
    `kart_anlasmasi` VARCHAR(80) NOT NULL DEFAULT '',
    `etkin` BOOLEAN NOT NULL DEFAULT true,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_zamani` DATETIME(3) NOT NULL,

    INDEX `musteriler_isletme_ad_indeks`(`isletme_id`, `ad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `musteri_kullanicilari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `musteri_id` INTEGER NOT NULL,
    `ad` VARCHAR(160) NOT NULL,
    `eposta` VARCHAR(254) NOT NULL,
    `etkin` BOOLEAN NOT NULL DEFAULT true,
    `son_giris` DATETIME(3) NULL,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `musteri_kullanicilari_musteri_indeks`(`musteri_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `musteri_adresleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `musteri_id` INTEGER NOT NULL,
    `baslik` VARCHAR(60) NOT NULL,
    `adres` VARCHAR(300) NOT NULL,
    `varsayilan` BOOLEAN NOT NULL DEFAULT false,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_zamani` DATETIME(3) NOT NULL,

    INDEX `musteri_adresleri_musteri_indeks`(`musteri_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `musteri_hareketleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `musteri_id` INTEGER NOT NULL,
    `tarih` DATETIME(3) NOT NULL,
    `referans` VARCHAR(100) NOT NULL DEFAULT '',
    `borc` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `alacak` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `musteri_hareketleri_musteri_tarih_indeks`(`musteri_id`, `tarih`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `siparisler` ADD COLUMN `musteri_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `iade_talepleri` ADD COLUMN `musteri_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `siparisler_musteri_indeks` ON `siparisler`(`musteri_id`);

-- CreateIndex
CREATE INDEX `iade_talepleri_musteri_indeks` ON `iade_talepleri`(`musteri_id`);

-- AddForeignKey
ALTER TABLE `musteriler` ADD CONSTRAINT `musteriler_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `musteri_kullanicilari` ADD CONSTRAINT `musteri_kullanicilari_musteri_id_fkey` FOREIGN KEY (`musteri_id`) REFERENCES `musteriler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `musteri_adresleri` ADD CONSTRAINT `musteri_adresleri_musteri_id_fkey` FOREIGN KEY (`musteri_id`) REFERENCES `musteriler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `musteri_hareketleri` ADD CONSTRAINT `musteri_hareketleri_musteri_id_fkey` FOREIGN KEY (`musteri_id`) REFERENCES `musteriler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `siparisler` ADD CONSTRAINT `siparisler_musteri_id_fkey` FOREIGN KEY (`musteri_id`) REFERENCES `musteriler`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iade_talepleri` ADD CONSTRAINT `iade_talepleri_musteri_id_fkey` FOREIGN KEY (`musteri_id`) REFERENCES `musteriler`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
