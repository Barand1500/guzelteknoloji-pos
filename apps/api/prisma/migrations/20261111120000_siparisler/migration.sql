-- CreateTable
CREATE TABLE `siparisler` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `siparis_no` VARCHAR(40) NOT NULL,
    `tarih` DATETIME(3) NOT NULL,
    `kaynak` VARCHAR(20) NOT NULL,
    `musteri_adi` VARCHAR(160) NOT NULL,
    `toplam` DECIMAL(18, 2) NOT NULL,
    `kdv_dahil_toplam` DECIMAL(18, 2) NOT NULL,
    `odendi` BOOLEAN NOT NULL DEFAULT false,
    `odeme_yontemi` VARCHAR(40) NOT NULL,
    `durum` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `adres` VARCHAR(500) NOT NULL,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_zamani` DATETIME(3) NOT NULL,

    UNIQUE INDEX `siparisler_isletme_no_tekil`(`isletme_id`, `siparis_no`),
    INDEX `siparisler_isletme_tarih_indeks`(`isletme_id`, `tarih`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `siparis_satirlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `siparis_id` INTEGER NOT NULL,
    `urun_id` INTEGER NULL,
    `ad` VARCHAR(250) NOT NULL,
    `kod` VARCHAR(100) NOT NULL,
    `adet` DECIMAL(18, 3) NOT NULL,
    `birim_fiyat` DECIMAL(18, 2) NOT NULL,
    `birim_maliyet` DECIMAL(18, 2) NULL,
    `sira` INTEGER NOT NULL DEFAULT 0,

    INDEX `siparis_satirlari_siparis_indeks`(`siparis_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iade_talepleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `musteri_adi` VARCHAR(160) NOT NULL,
    `siparis_no` VARCHAR(40) NOT NULL,
    `tur` VARCHAR(20) NOT NULL,
    `urun_adedi` INTEGER NOT NULL,
    `tarih` DATETIME(3) NOT NULL,
    `durum` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `sebep` VARCHAR(500) NOT NULL,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_zamani` DATETIME(3) NOT NULL,

    INDEX `iade_talepleri_isletme_tarih_indeks`(`isletme_id`, `tarih`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `siparisler` ADD CONSTRAINT `siparisler_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `siparis_satirlari` ADD CONSTRAINT `siparis_satirlari_siparis_id_fkey` FOREIGN KEY (`siparis_id`) REFERENCES `siparisler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iade_talepleri` ADD CONSTRAINT `iade_talepleri_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
