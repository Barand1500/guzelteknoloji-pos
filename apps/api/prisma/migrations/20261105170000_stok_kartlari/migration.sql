-- CreateTable
CREATE TABLE `stok_secenekleri` (
    `kimlik` CHAR(36) NOT NULL,
    `kullanici_kimligi` CHAR(36) NOT NULL,
    `liste_turu` VARCHAR(30) NOT NULL,
    `secenek_kodu` VARCHAR(100) NOT NULL,
    `secenek_adi` VARCHAR(120) NOT NULL,
    `ad_ozeti` CHAR(64) NOT NULL,
    `silinebilir` BOOLEAN NOT NULL DEFAULT false,
    `etkin` BOOLEAN NOT NULL DEFAULT true,
    `sira` INTEGER NOT NULL DEFAULT 0,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `stok_secenekleri_kod_tekil`(`kullanici_kimligi`, `liste_turu`, `secenek_kodu`),
    UNIQUE INDEX `stok_secenekleri_ad_tekil`(`kullanici_kimligi`, `liste_turu`, `ad_ozeti`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_kartlari` (
    `kimlik` CHAR(36) NOT NULL,
    `kullanici_kimligi` CHAR(36) NOT NULL,
    `kayit_istegi_kimligi` CHAR(36) NOT NULL,
    `kayit_istegi_ozeti` CHAR(64) NOT NULL,
    `stok_kodu` VARCHAR(100) NULL,
    `stok_adi` VARCHAR(250) NULL,
    `stok_tipi_kimligi` CHAR(36) NOT NULL,
    `stok_nevi_kimligi` CHAR(36) NOT NULL,
    `marka_kimligi` CHAR(36) NULL,
    `kdv_departmani_kimligi` CHAR(36) NULL,
    `diger_vergi_kimligi` CHAR(36) NULL,
    `envanter_takibi` VARCHAR(10) NOT NULL,
    `alt_limit` DECIMAL(18, 6) NULL,
    `ust_limit` DECIMAL(18, 6) NULL,
    `seri_no_zorunlu` BOOLEAN NOT NULL DEFAULT false,
    `seri_no_oneki` VARCHAR(100) NULL,
    `lot_zorunlu` BOOLEAN NOT NULL DEFAULT false,
    `skt_takibi` BOOLEAN NOT NULL DEFAULT false,
    `lot_oneki` VARCHAR(100) NULL,
    `skt_zorunlu` BOOLEAN NOT NULL DEFAULT false,
    `raf_omru_gun` INTEGER NULL,
    `risk_suresi_gun` INTEGER NULL,
    `gtip_kodu` VARCHAR(32) NULL,
    `mensei` VARCHAR(40) NULL,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_zamani` DATETIME(3) NOT NULL,

    UNIQUE INDEX `stok_kartlari_kullanici_kod_tekil`(`kullanici_kimligi`, `stok_kodu`),
    UNIQUE INDEX `stok_kartlari_kayit_istegi_tekil`(`kullanici_kimligi`, `kayit_istegi_kimligi`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_fiyat_listeleri` (
    `kimlik` CHAR(36) NOT NULL,
    `stok_karti_kimligi` CHAR(36) NOT NULL,
    `fiyat_listesi_kimligi` CHAR(36) NOT NULL,
    `sira` INTEGER NOT NULL,

    UNIQUE INDEX `stok_fiyat_listeleri_kart_liste_tekil`(`stok_karti_kimligi`, `fiyat_listesi_kimligi`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_birimleri` (
    `kimlik` CHAR(36) NOT NULL,
    `stok_fiyat_listesi_kimligi` CHAR(36) NOT NULL,
    `birim_kimligi` CHAR(36) NOT NULL,
    `sira` INTEGER NOT NULL,
    `carpan` DECIMAL(18, 6) NOT NULL,
    `ana_birim` BOOLEAN NOT NULL,
    `varsayilan_birim` BOOLEAN NOT NULL,
    `agirlik` DECIMAL(18, 6) NULL,
    `agirlik_birimi` VARCHAR(2) NOT NULL,
    `hacim_desi` DECIMAL(18, 6) NULL,
    `aciklama` VARCHAR(1000) NULL,

    INDEX `stok_birimleri_liste_indeks`(`stok_fiyat_listesi_kimligi`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_fiyatlari` (
    `kimlik` CHAR(36) NOT NULL,
    `stok_birimi_kimligi` CHAR(36) NOT NULL,
    `fiyat_yonu` VARCHAR(5) NOT NULL,
    `girilen_fiyat` DECIMAL(18, 6) NULL,
    `para_birimi` CHAR(3) NOT NULL,
    `iskonto_orani` DECIMAL(18, 6) NULL,
    `kdv_orani` DECIMAL(18, 6) NULL,
    `kdv_dahil_girildi` BOOLEAN NOT NULL,
    `net_fiyat` DECIMAL(24, 6) NULL,
    `kdv_haric_fiyat` DECIMAL(24, 6) NULL,
    `kdv_dahil_fiyat` DECIMAL(24, 6) NULL,

    UNIQUE INDEX `stok_fiyatlari_birim_yon_tekil`(`stok_birimi_kimligi`, `fiyat_yonu`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_ek_fiyatlari` (
    `kimlik` CHAR(36) NOT NULL,
    `stok_fiyati_kimligi` CHAR(36) NOT NULL,
    `sira` INTEGER NOT NULL,
    `aciklama` VARCHAR(250) NULL,
    `tutar` DECIMAL(18, 6) NULL,
    `iskonto_orani` DECIMAL(18, 6) NULL,
    `para_birimi` CHAR(3) NOT NULL,

    INDEX `stok_ek_fiyatlari_fiyat_indeks`(`stok_fiyati_kimligi`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_barkodlari` (
    `kimlik` CHAR(36) NOT NULL,
    `stok_birimi_kimligi` CHAR(36) NOT NULL,
    `barkod_turu` VARCHAR(10) NOT NULL,
    `barkod` VARCHAR(128) NOT NULL,

    INDEX `stok_barkodlari_kod_indeks`(`barkod`),
    UNIQUE INDEX `stok_barkodlari_birim_kod_tekil`(`stok_birimi_kimligi`, `barkod`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stok_secenekleri` ADD CONSTRAINT `stok_secenekleri_kullanici_baglantisi` FOREIGN KEY (`kullanici_kimligi`) REFERENCES `kullanicilar`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_kullanici_baglantisi` FOREIGN KEY (`kullanici_kimligi`) REFERENCES `kullanicilar`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_tip_baglantisi` FOREIGN KEY (`stok_tipi_kimligi`) REFERENCES `stok_secenekleri`(`kimlik`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_nevi_baglantisi` FOREIGN KEY (`stok_nevi_kimligi`) REFERENCES `stok_secenekleri`(`kimlik`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_marka_baglantisi` FOREIGN KEY (`marka_kimligi`) REFERENCES `stok_secenekleri`(`kimlik`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_departman_baglantisi` FOREIGN KEY (`kdv_departmani_kimligi`) REFERENCES `stok_secenekleri`(`kimlik`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_vergi_baglantisi` FOREIGN KEY (`diger_vergi_kimligi`) REFERENCES `stok_secenekleri`(`kimlik`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_fiyat_listeleri` ADD CONSTRAINT `stok_fiyat_listeleri_kart_baglantisi` FOREIGN KEY (`stok_karti_kimligi`) REFERENCES `stok_kartlari`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_fiyat_listeleri` ADD CONSTRAINT `stok_fiyat_listeleri_secenek_baglantisi` FOREIGN KEY (`fiyat_listesi_kimligi`) REFERENCES `stok_secenekleri`(`kimlik`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_birimleri` ADD CONSTRAINT `stok_birimleri_liste_baglantisi` FOREIGN KEY (`stok_fiyat_listesi_kimligi`) REFERENCES `stok_fiyat_listeleri`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_birimleri` ADD CONSTRAINT `stok_birimleri_secenek_baglantisi` FOREIGN KEY (`birim_kimligi`) REFERENCES `stok_secenekleri`(`kimlik`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_fiyatlari` ADD CONSTRAINT `stok_fiyatlari_birim_baglantisi` FOREIGN KEY (`stok_birimi_kimligi`) REFERENCES `stok_birimleri`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_ek_fiyatlari` ADD CONSTRAINT `stok_ek_fiyatlari_fiyat_baglantisi` FOREIGN KEY (`stok_fiyati_kimligi`) REFERENCES `stok_fiyatlari`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_barkodlari` ADD CONSTRAINT `stok_barkodlari_birim_baglantisi` FOREIGN KEY (`stok_birimi_kimligi`) REFERENCES `stok_birimleri`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;
