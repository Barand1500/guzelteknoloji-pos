CREATE TABLE `kampanyalar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_id` INTEGER NOT NULL,
    `tur` ENUM('SEPET_INDIRIMI', 'UCRETSIZ_KARGO') NOT NULL,
    `durum` BOOLEAN NOT NULL DEFAULT false,
    `cari_tipleri` JSON NOT NULL,
    `fiyat_listeleri` JSON NOT NULL,
    `minimum_sepet` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `indirim_turu` ENUM('YUZDE', 'TUTAR') NULL,
    `indirim_degeri` DECIMAL(18, 2) NULL,
    `olusturma_tarihi` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_tarihi` DATETIME(3) NOT NULL,
    UNIQUE INDEX `kampanyalar_kullanici_tur_tekil`(`kullanici_id`, `tur`),
    PRIMARY KEY (`id`),
    CONSTRAINT `kampanyalar_kullanici_id_fkey`
      FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kampanya_kurallari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kampanya_id` INTEGER NOT NULL,
    `durum` BOOLEAN NOT NULL DEFAULT true,
    `cari_tipleri` JSON NOT NULL,
    `fiyat_listeleri` JSON NOT NULL,
    `minimum_sepet` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `indirim_turu` ENUM('YUZDE', 'TUTAR') NULL,
    `indirim_degeri` DECIMAL(18, 2) NULL,
    `olusturma_tarihi` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_tarihi` DATETIME(3) NOT NULL,
    INDEX `kampanya_kurallari_kampanya_indeks`(`kampanya_id`, `id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `kampanya_kurallari_kampanya_id_fkey`
      FOREIGN KEY (`kampanya_id`) REFERENCES `kampanyalar`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kampanya_kural_kategorileri` (
    `kural_id` INTEGER NOT NULL,
    `kategori_id` INTEGER NOT NULL,
    INDEX `kampanya_kural_kategorileri_kategori_indeks`(`kategori_id`),
    PRIMARY KEY (`kural_id`, `kategori_id`),
    CONSTRAINT `kampanya_kural_kategorileri_kural_id_fkey`
      FOREIGN KEY (`kural_id`) REFERENCES `kampanya_kurallari`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `kampanya_kural_kategorileri_kategori_id_fkey`
      FOREIGN KEY (`kategori_id`) REFERENCES `kategoriler`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kampanya_kural_markalari` (
    `kural_id` INTEGER NOT NULL,
    `marka_id` INTEGER NOT NULL,
    INDEX `kampanya_kural_markalari_marka_indeks`(`marka_id`),
    PRIMARY KEY (`kural_id`, `marka_id`),
    CONSTRAINT `kampanya_kural_markalari_kural_id_fkey`
      FOREIGN KEY (`kural_id`) REFERENCES `kampanya_kurallari`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `kampanya_kural_markalari_marka_id_fkey`
      FOREIGN KEY (`marka_id`) REFERENCES `markalar`(`id`)
      ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
