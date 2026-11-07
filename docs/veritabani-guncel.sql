-- CreateTable
CREATE TABLE `kullanicilar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eposta` VARCHAR(254) NULL,
    `eposta_dogrulama_zamani` DATETIME(3) NULL,
    `gorunen_ad` VARCHAR(120) NULL,
    `profil_resmi_adresi` VARCHAR(2048) NULL,
    `durum` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_zamani` DATETIME(3) NOT NULL,
    `son_giris_yontemi` ENUM('EMAIL', 'GOOGLE', 'APPLE') NULL,
    `son_giris_zamani` DATETIME(3) NULL,
    `sifre_hash` VARCHAR(255) NULL,
    `sifre_olusturma_zamani` DATETIME(3) NULL,
    `sifre_guncelleme_zamani` DATETIME(3) NULL,

    UNIQUE INDEX `kullanicilar_eposta_tekil`(`eposta`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `giris_kimlikleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_id` INTEGER NOT NULL,
    `saglayici` ENUM('GOOGLE', 'APPLE') NOT NULL,
    `saglayici_kullanici_id` VARCHAR(255) NOT NULL,
    `eposta` VARCHAR(254) NULL,
    `son_kullanim_zamani` DATETIME(3) NULL,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_zamani` DATETIME(3) NOT NULL,

    INDEX `giris_kimlikleri_kullanici_indeks`(`kullanici_id`),
    UNIQUE INDEX `giris_kimlikleri_saglayici_kullanici_tekil`(`saglayici`, `saglayici_kullanici_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oturumlar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_id` INTEGER NOT NULL,
    `giris_yontemi` ENUM('EMAIL', 'GOOGLE', 'APPLE') NULL,
    `oturum_anahtari_hash` CHAR(64) NOT NULL,
    `gecerlilik_bitis_zamani` DATETIME(3) NOT NULL,
    `son_gorulme_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `iptal_zamani` DATETIME(3) NULL,
    `ip_adresi` VARCHAR(45) NULL,
    `istemci_bilgisi` VARCHAR(512) NULL,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `oturumlar_anahtar_hash_tekil`(`oturum_anahtari_hash`),
    INDEX `oturumlar_kullanici_indeks`(`kullanici_id`),
    INDEX `oturumlar_gecerlilik_indeks`(`gecerlilik_bitis_zamani`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `eposta_giris_kodlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eposta_hash` CHAR(64) NOT NULL,
    `kod_hash` CHAR(64) NOT NULL,
    `gecerlilik_bitis_zamani` DATETIME(3) NOT NULL,
    `deneme_sayisi` INTEGER NOT NULL DEFAULT 0,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `eposta_kodlari_eposta_olusturma_indeks`(`eposta_hash`, `olusturma_zamani`),
    INDEX `eposta_kodlari_olusturma_indeks`(`olusturma_zamani`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_secenekleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_id` INTEGER NOT NULL,
    `liste_turu` VARCHAR(30) NOT NULL,
    `secenek_kodu` VARCHAR(100) NOT NULL,
    `secenek_adi` VARCHAR(120) NOT NULL,
    `ad_hash` CHAR(64) NOT NULL,
    `silinebilir` BOOLEAN NOT NULL DEFAULT false,
    `etkin` BOOLEAN NOT NULL DEFAULT true,
    `sira` INTEGER NOT NULL DEFAULT 0,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `stok_secenekleri_kod_tekil`(`kullanici_id`, `liste_turu`, `secenek_kodu`),
    UNIQUE INDEX `stok_secenekleri_ad_tekil`(`kullanici_id`, `liste_turu`, `ad_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `markalar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_id` INTEGER NOT NULL,
    `marka_kodu` VARCHAR(100) NOT NULL,
    `marka_adi` VARCHAR(120) NOT NULL,
    `ad_hash` CHAR(64) NOT NULL,
    `etkin` BOOLEAN NOT NULL DEFAULT true,
    `sira` INTEGER NOT NULL DEFAULT 0,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `aciklama` TEXT NOT NULL,
    `logo_verisi` MEDIUMBLOB NULL,
    `logo_dosyasi` VARCHAR(255) NULL,
    `logo_hash` CHAR(64) NULL,
    `seo_basligi` VARCHAR(250) NOT NULL,
    `seo_aciklamasi` VARCHAR(1000) NOT NULL,
    `guncelleme_zamani` DATETIME(3) NOT NULL,

    UNIQUE INDEX `markalar_kod_tekil`(`kullanici_id`, `marka_kodu`),
    UNIQUE INDEX `markalar_ad_tekil`(`kullanici_id`, `ad_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_kartlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_id` INTEGER NOT NULL,
    `kayit_istegi_id` CHAR(36) NOT NULL,
    `kayit_istegi_hash` CHAR(64) NOT NULL,
    `stok_kodu` VARCHAR(100) NULL,
    `stok_adi` VARCHAR(250) NULL,
    `stok_tipi_id` INTEGER NOT NULL,
    `stok_nevi_id` INTEGER NOT NULL,
    `marka_id` INTEGER NULL,
    `satisa_acik` BOOLEAN NOT NULL DEFAULT true,
    `stok_miktari` DECIMAL(18, 6) NOT NULL DEFAULT 0,
    `kdv_departmani_id` INTEGER NULL,
    `diger_vergi_id` INTEGER NULL,
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

    UNIQUE INDEX `stok_kartlari_kullanici_kod_tekil`(`kullanici_id`, `stok_kodu`),
    UNIQUE INDEX `stok_kartlari_kayit_istegi_tekil`(`kullanici_id`, `kayit_istegi_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_gorselleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stok_karti_id` INTEGER NOT NULL,
    `dosya_adi` VARCHAR(255) NOT NULL,
    `sira` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `stok_gorselleri_dosya_adi_key`(`dosya_adi`),
    INDEX `stok_gorselleri_stok_karti_id_sira_idx`(`stok_karti_id`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kategoriler` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_id` INTEGER NOT NULL,
    `ust_kategori_id` INTEGER NULL,
    `ad` VARCHAR(120) NOT NULL,
    `aciklama` TEXT NOT NULL,
    `gorsel_dosyasi` VARCHAR(255) NULL,
    `etkin` BOOLEAN NOT NULL DEFAULT true,
    `gizli` BOOLEAN NOT NULL DEFAULT false,
    `seo_basligi` VARCHAR(250) NOT NULL,
    `seo_aciklamasi` VARCHAR(1000) NOT NULL,
    `sira` INTEGER NOT NULL DEFAULT 0,

    INDEX `kategoriler_kullanici_id_ust_kategori_id_idx`(`kullanici_id`, `ust_kategori_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_karti_kategorileri` (
    `stok_karti_id` INTEGER NOT NULL,
    `kategori_id` INTEGER NOT NULL,

    PRIMARY KEY (`stok_karti_id`, `kategori_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `stok_ozellik_degerleri` (
    `stok_karti_id` INTEGER NOT NULL,
    `deger_id` INTEGER NOT NULL,

    PRIMARY KEY (`stok_karti_id`, `deger_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_varyantlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stok_karti_id` INTEGER NOT NULL,
    `kod` VARCHAR(100) NOT NULL,
    `barkod` VARCHAR(100) NULL,
    `fiyat` DECIMAL(18, 6) NOT NULL,
    `miktar` DECIMAL(18, 6) NOT NULL,

    INDEX `stok_varyantlari_stok_karti_id_idx`(`stok_karti_id`),
    UNIQUE INDEX `stok_varyantlari_stok_karti_id_kod_key`(`stok_karti_id`, `kod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_varyant_degerleri` (
    `varyant_id` INTEGER NOT NULL,
    `deger_id` INTEGER NOT NULL,

    PRIMARY KEY (`varyant_id`, `deger_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_birimleri` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stok_karti_id` INTEGER NOT NULL,
    `birim_id` INTEGER NOT NULL,
    `sira` INTEGER NOT NULL,
    `carpan` DECIMAL(18, 6) NOT NULL,
    `ana_birim` BOOLEAN NOT NULL,
    `varsayilan_birim` BOOLEAN NOT NULL,
    `agirlik` DECIMAL(18, 6) NULL,
    `agirlik_birimi` VARCHAR(2) NOT NULL,
    `hacim_desi` DECIMAL(18, 6) NULL,
    `aciklama` VARCHAR(1000) NULL,

    INDEX `stok_birimleri_kart_indeks`(`stok_karti_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_fiyatlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stok_birimi_id` INTEGER NOT NULL,
    `fiyat_listesi_id` INTEGER NOT NULL,
    `fiyat_yonu` VARCHAR(5) NOT NULL,
    `girilen_fiyat` DECIMAL(18, 6) NULL,
    `para_birimi` CHAR(3) NOT NULL,
    `iskonto_orani` DECIMAL(18, 6) NULL,
    `kdv_orani` DECIMAL(18, 6) NULL,
    `kdv_dahil_girildi` BOOLEAN NOT NULL,

    UNIQUE INDEX `stok_fiyatlari_birim_liste_yon_tekil`(`stok_birimi_id`, `fiyat_listesi_id`, `fiyat_yonu`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_ek_fiyatlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stok_fiyati_id` INTEGER NOT NULL,
    `sira` INTEGER NOT NULL,
    `aciklama` VARCHAR(250) NULL,
    `tutar` DECIMAL(18, 6) NULL,
    `iskonto_orani` DECIMAL(18, 6) NULL,
    `para_birimi` CHAR(3) NOT NULL,

    INDEX `stok_ek_fiyatlari_fiyat_indeks`(`stok_fiyati_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stok_barkodlari` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `stok_birimi_id` INTEGER NOT NULL,
    `barkod_turu` VARCHAR(10) NOT NULL,
    `barkod` VARCHAR(128) NOT NULL,

    INDEX `stok_barkodlari_kod_indeks`(`barkod`),
    UNIQUE INDEX `stok_barkodlari_birim_kod_tekil`(`stok_birimi_id`, `barkod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `giris_kimlikleri` ADD CONSTRAINT `giris_kimlikleri_kullanici_baglantisi` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oturumlar` ADD CONSTRAINT `oturumlar_kullanici_baglantisi` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_secenekleri` ADD CONSTRAINT `stok_secenekleri_kullanici_baglantisi` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `markalar` ADD CONSTRAINT `markalar_kullanici_baglantisi` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_kullanici_baglantisi` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_tip_baglantisi` FOREIGN KEY (`stok_tipi_id`) REFERENCES `stok_secenekleri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_nevi_baglantisi` FOREIGN KEY (`stok_nevi_id`) REFERENCES `stok_secenekleri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_marka_baglantisi` FOREIGN KEY (`marka_id`) REFERENCES `markalar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_departman_baglantisi` FOREIGN KEY (`kdv_departmani_id`) REFERENCES `stok_secenekleri`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_vergi_baglantisi` FOREIGN KEY (`diger_vergi_id`) REFERENCES `stok_secenekleri`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_gorselleri` ADD CONSTRAINT `stok_gorselleri_stok_karti_id_fkey` FOREIGN KEY (`stok_karti_id`) REFERENCES `stok_kartlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kategoriler` ADD CONSTRAINT `kategoriler_kullanici_id_fkey` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kategoriler` ADD CONSTRAINT `kategoriler_ust_kategori_id_fkey` FOREIGN KEY (`ust_kategori_id`) REFERENCES `kategoriler`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_karti_kategorileri` ADD CONSTRAINT `stok_karti_kategorileri_stok_karti_id_fkey` FOREIGN KEY (`stok_karti_id`) REFERENCES `stok_kartlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_karti_kategorileri` ADD CONSTRAINT `stok_karti_kategorileri_kategori_id_fkey` FOREIGN KEY (`kategori_id`) REFERENCES `kategoriler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `stok_ozellik_degerleri` ADD CONSTRAINT `stok_ozellik_degerleri_stok_karti_id_fkey` FOREIGN KEY (`stok_karti_id`) REFERENCES `stok_kartlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_ozellik_degerleri` ADD CONSTRAINT `stok_ozellik_degerleri_deger_id_fkey` FOREIGN KEY (`deger_id`) REFERENCES `ozellik_degerleri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_varyantlari` ADD CONSTRAINT `stok_varyantlari_stok_karti_id_fkey` FOREIGN KEY (`stok_karti_id`) REFERENCES `stok_kartlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_varyant_degerleri` ADD CONSTRAINT `stok_varyant_degerleri_varyant_id_fkey` FOREIGN KEY (`varyant_id`) REFERENCES `stok_varyantlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_varyant_degerleri` ADD CONSTRAINT `stok_varyant_degerleri_deger_id_fkey` FOREIGN KEY (`deger_id`) REFERENCES `ozellik_degerleri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_birimleri` ADD CONSTRAINT `stok_birimleri_kart_baglantisi` FOREIGN KEY (`stok_karti_id`) REFERENCES `stok_kartlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_birimleri` ADD CONSTRAINT `stok_birimleri_secenek_baglantisi` FOREIGN KEY (`birim_id`) REFERENCES `stok_secenekleri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_fiyatlari` ADD CONSTRAINT `stok_fiyatlari_birim_baglantisi` FOREIGN KEY (`stok_birimi_id`) REFERENCES `stok_birimleri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_fiyatlari` ADD CONSTRAINT `stok_fiyatlari_liste_baglantisi` FOREIGN KEY (`fiyat_listesi_id`) REFERENCES `stok_secenekleri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_ek_fiyatlari` ADD CONSTRAINT `stok_ek_fiyatlari_fiyat_baglantisi` FOREIGN KEY (`stok_fiyati_id`) REFERENCES `stok_fiyatlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stok_barkodlari` ADD CONSTRAINT `stok_barkodlari_birim_baglantisi` FOREIGN KEY (`stok_birimi_id`) REFERENCES `stok_birimleri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
