-- Seo Ayarlari ekraninin verisi: urunler tablosuna SEO kolonlari (kategori/marka/firsat
-- zaten kendi kolonlarinda tasir) ve 301 yonlendirmeleri tablosu. Mevcut satirlarda
-- SEO alanlari bos ('') baslar; kayit silinmez, veri tasinmaz.

ALTER TABLE `urunler` ADD COLUMN `seo_basligi` VARCHAR(250) NOT NULL DEFAULT '',
  ADD COLUMN `seo_aciklamasi` VARCHAR(1000) NOT NULL DEFAULT '';

CREATE TABLE `seo_yonlendirmeleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isletme_id` INTEGER NOT NULL,
    `tur` VARCHAR(20) NOT NULL,
    `kaynak_id` INTEGER NULL,
    `eski_adres` VARCHAR(300) NOT NULL,
    `seo_basligi` VARCHAR(250) NOT NULL DEFAULT '',
    `seo_aciklamasi` VARCHAR(1000) NOT NULL DEFAULT '',
    `olusturma_tarihi` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `seo_yonlendirmeleri_adres_tekil`(`isletme_id`, `tur`, `eski_adres`),
    INDEX `seo_yonlendirmeleri_hedef_indeks`(`isletme_id`, `tur`, `kaynak_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `seo_yonlendirmeleri` ADD CONSTRAINT `seo_yonlendirmeleri_isletme_id_fkey` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
