-- CreateTable
CREATE TABLE `firsatlar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_id` INTEGER NOT NULL,
    `ad` VARCHAR(120) NOT NULL,
    `ikon_dosyasi` VARCHAR(255) NULL,
    `etkin` BOOLEAN NOT NULL DEFAULT true,
    `resimde_goster` BOOLEAN NOT NULL,
    `konum` VARCHAR(10) NOT NULL,
    `boyut` VARCHAR(10) NOT NULL,
    `seo_basligi` VARCHAR(250) NOT NULL,
    `seo_aciklamasi` VARCHAR(1000) NOT NULL,
    `sira` INTEGER NOT NULL DEFAULT 0,

    INDEX `firsatlar_kullanici_id_sira_idx`(`kullanici_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_firsatlari` (
    `stok_karti_id` INTEGER NOT NULL,
    `firsat_id` INTEGER NOT NULL,

    PRIMARY KEY (`stok_karti_id`, `firsat_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ozellik_sablonlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_id` INTEGER NOT NULL,
    `ad` VARCHAR(120) NOT NULL,
    `tum_urunler` BOOLEAN NOT NULL DEFAULT false,
    `sira` INTEGER NOT NULL DEFAULT 0,

    INDEX `ozellik_sablonlari_kullanici_id_sira_idx`(`kullanici_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ozellik_sablon_kategorileri` (
    `sablon_id` INTEGER NOT NULL,
    `kategori_id` INTEGER NOT NULL,

    PRIMARY KEY (`sablon_id`, `kategori_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ozellik_gruplari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sablon_id` INTEGER NOT NULL,
    `ad` VARCHAR(120) NOT NULL,
    `tur` VARCHAR(10) NOT NULL,
    `filtre` BOOLEAN NOT NULL DEFAULT false,
    `coklu` BOOLEAN NOT NULL DEFAULT false,
    `varyant` BOOLEAN NOT NULL DEFAULT false,
    `resimde_goster` BOOLEAN NOT NULL DEFAULT false,
    `konum` VARCHAR(10) NOT NULL,
    `boyut` VARCHAR(10) NOT NULL,
    `sira` INTEGER NOT NULL DEFAULT 0,

    INDEX `ozellik_gruplari_sablon_id_sira_idx`(`sablon_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ozellik_degerleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grup_id` INTEGER NOT NULL,
    `kod` VARCHAR(120) NOT NULL,
    `ad` VARCHAR(120) NOT NULL,
    `renk` VARCHAR(7) NULL,
    `gorsel_dosyasi` VARCHAR(255) NULL,
    `sira` INTEGER NOT NULL DEFAULT 0,

    INDEX `ozellik_degerleri_grup_id_sira_idx`(`grup_id`, `sira`),
    UNIQUE INDEX `ozellik_degerleri_grup_id_kod_key`(`grup_id`, `kod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `firsatlar` ADD CONSTRAINT `firsatlar_kullanici_id_fkey` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_firsatlari` ADD CONSTRAINT `stok_firsatlari_stok_karti_id_fkey` FOREIGN KEY (`stok_karti_id`) REFERENCES `stok_kartlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_firsatlari` ADD CONSTRAINT `stok_firsatlari_firsat_id_fkey` FOREIGN KEY (`firsat_id`) REFERENCES `firsatlar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ozellik_sablonlari` ADD CONSTRAINT `ozellik_sablonlari_kullanici_id_fkey` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ozellik_sablon_kategorileri` ADD CONSTRAINT `ozellik_sablon_kategorileri_sablon_id_fkey` FOREIGN KEY (`sablon_id`) REFERENCES `ozellik_sablonlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ozellik_sablon_kategorileri` ADD CONSTRAINT `ozellik_sablon_kategorileri_kategori_id_fkey` FOREIGN KEY (`kategori_id`) REFERENCES `kategoriler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ozellik_gruplari` ADD CONSTRAINT `ozellik_gruplari_sablon_id_fkey` FOREIGN KEY (`sablon_id`) REFERENCES `ozellik_sablonlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ozellik_degerleri` ADD CONSTRAINT `ozellik_degerleri_grup_id_fkey` FOREIGN KEY (`grup_id`) REFERENCES `ozellik_gruplari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
