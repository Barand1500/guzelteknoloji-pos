-- Eski UUID kimlikleri yeni sayisal kimliklere eslestirilir. API durdurulmus olmalidir.

-- Once yedek alin. Eski tablolar, yeni baglantilar kuruluncaya kadar korunur.

CREATE TABLE `__gt_id_map` (`tablo` VARCHAR(64) NOT NULL, `eski` CHAR(36) NOT NULL, `yeni` INT NOT NULL, PRIMARY KEY (`tablo`, `eski`), UNIQUE KEY `tablo_yeni` (`tablo`, `yeni`));

INSERT INTO `__gt_id_map` (`tablo`, `eski`, `yeni`) SELECT 'kullanicilar', `kimlik`, ROW_NUMBER() OVER (ORDER BY `kimlik`) FROM `kullanicilar`;

INSERT INTO `__gt_id_map` (`tablo`, `eski`, `yeni`) SELECT 'giris_kimlikleri', `kimlik`, ROW_NUMBER() OVER (ORDER BY `kimlik`) FROM `giris_kimlikleri`;

INSERT INTO `__gt_id_map` (`tablo`, `eski`, `yeni`) SELECT 'oturumlar', `kimlik`, ROW_NUMBER() OVER (ORDER BY `kimlik`) FROM `oturumlar`;

INSERT INTO `__gt_id_map` (`tablo`, `eski`, `yeni`) SELECT 'stok_secenekleri', `kimlik`, ROW_NUMBER() OVER (ORDER BY `kimlik`) FROM `stok_secenekleri`;

INSERT INTO `__gt_id_map` (`tablo`, `eski`, `yeni`) SELECT 'markalar', `kimlik`, ROW_NUMBER() OVER (ORDER BY `kimlik`) FROM `markalar`;

INSERT INTO `__gt_id_map` (`tablo`, `eski`, `yeni`) SELECT 'stok_kartlari', `kimlik`, ROW_NUMBER() OVER (ORDER BY `kimlik`) FROM `stok_kartlari`;

INSERT INTO `__gt_id_map` (`tablo`, `eski`, `yeni`) SELECT 'stok_fiyat_listeleri', `kimlik`, ROW_NUMBER() OVER (ORDER BY `kimlik`) FROM `stok_fiyat_listeleri`;

INSERT INTO `__gt_id_map` (`tablo`, `eski`, `yeni`) SELECT 'stok_birimleri', `kimlik`, ROW_NUMBER() OVER (ORDER BY `kimlik`) FROM `stok_birimleri`;

INSERT INTO `__gt_id_map` (`tablo`, `eski`, `yeni`) SELECT 'stok_fiyatlari', `kimlik`, ROW_NUMBER() OVER (ORDER BY `kimlik`) FROM `stok_fiyatlari`;

INSERT INTO `__gt_id_map` (`tablo`, `eski`, `yeni`) SELECT 'stok_ek_fiyatlari', `kimlik`, ROW_NUMBER() OVER (ORDER BY `kimlik`) FROM `stok_ek_fiyatlari`;

INSERT INTO `__gt_id_map` (`tablo`, `eski`, `yeni`) SELECT 'stok_barkodlari', `kimlik`, ROW_NUMBER() OVER (ORDER BY `kimlik`) FROM `stok_barkodlari`;

CREATE TABLE `__yeni_kullanicilar` (
    `kimlik` INTEGER NOT NULL AUTO_INCREMENT,
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
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `__yeni_kullanicilar` (`kimlik`, `eposta`, `eposta_dogrulama_zamani`, `gorunen_ad`, `profil_resmi_adresi`, `durum`, `olusturma_zamani`, `guncelleme_zamani`, `son_giris_yontemi`, `son_giris_zamani`, `sifre_hash`, `sifre_olusturma_zamani`, `sifre_guncelleme_zamani`) SELECT (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'kullanicilar' AND m.`eski` = t.`kimlik`), t.`eposta`, t.`eposta_dogrulama_zamani`, t.`gorunen_ad`, t.`profil_resmi_adresi`, t.`durum`, t.`olusturma_zamani`, t.`guncelleme_zamani`, t.`son_giris_yontemi`, t.`son_giris_zamani`, t.`sifre_hash`, t.`sifre_olusturma_zamani`, t.`sifre_guncelleme_zamani` FROM `kullanicilar` t;

CREATE TABLE `__yeni_giris_kimlikleri` (
    `kimlik` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_kimligi` INTEGER NOT NULL,
    `saglayici` ENUM('GOOGLE', 'APPLE') NOT NULL,
    `saglayici_kullanici_kimligi` VARCHAR(255) NOT NULL,
    `eposta` VARCHAR(254) NULL,
    `son_kullanim_zamani` DATETIME(3) NULL,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `guncelleme_zamani` DATETIME(3) NOT NULL,

    INDEX `giris_kimlikleri_kullanici_indeks`(`kullanici_kimligi`),
    UNIQUE INDEX `giris_kimlikleri_saglayici_kullanici_tekil`(`saglayici`, `saglayici_kullanici_kimligi`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `__yeni_giris_kimlikleri` (`kimlik`, `kullanici_kimligi`, `saglayici`, `saglayici_kullanici_kimligi`, `eposta`, `son_kullanim_zamani`, `olusturma_zamani`, `guncelleme_zamani`) SELECT (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'giris_kimlikleri' AND m.`eski` = t.`kimlik`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'kullanicilar' AND m.`eski` = t.`kullanici_kimligi`), t.`saglayici`, t.`saglayici_kullanici_kimligi`, t.`eposta`, t.`son_kullanim_zamani`, t.`olusturma_zamani`, t.`guncelleme_zamani` FROM `giris_kimlikleri` t;

CREATE TABLE `__yeni_oturumlar` (
    `kimlik` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_kimligi` INTEGER NOT NULL,
    `giris_yontemi` ENUM('EMAIL', 'GOOGLE', 'APPLE') NULL,
    `oturum_anahtari_hash` CHAR(64) NOT NULL,
    `gecerlilik_bitis_zamani` DATETIME(3) NOT NULL,
    `son_gorulme_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `iptal_zamani` DATETIME(3) NULL,
    `ip_adresi` VARCHAR(45) NULL,
    `istemci_bilgisi` VARCHAR(512) NULL,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `oturumlar_anahtar_hash_tekil`(`oturum_anahtari_hash`),
    INDEX `oturumlar_kullanici_indeks`(`kullanici_kimligi`),
    INDEX `oturumlar_gecerlilik_indeks`(`gecerlilik_bitis_zamani`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `__yeni_oturumlar` (`kimlik`, `kullanici_kimligi`, `giris_yontemi`, `oturum_anahtari_hash`, `gecerlilik_bitis_zamani`, `son_gorulme_zamani`, `iptal_zamani`, `ip_adresi`, `istemci_bilgisi`, `olusturma_zamani`) SELECT (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'oturumlar' AND m.`eski` = t.`kimlik`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'kullanicilar' AND m.`eski` = t.`kullanici_kimligi`), t.`giris_yontemi`, t.`oturum_anahtari_hash`, t.`gecerlilik_bitis_zamani`, t.`son_gorulme_zamani`, t.`iptal_zamani`, t.`ip_adresi`, t.`istemci_bilgisi`, t.`olusturma_zamani` FROM `oturumlar` t;

CREATE TABLE `__yeni_stok_secenekleri` (
    `kimlik` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_kimligi` INTEGER NOT NULL,
    `liste_turu` VARCHAR(30) NOT NULL,
    `secenek_kodu` VARCHAR(100) NOT NULL,
    `secenek_adi` VARCHAR(120) NOT NULL,
    `ad_hash` CHAR(64) NOT NULL,
    `silinebilir` BOOLEAN NOT NULL DEFAULT false,
    `etkin` BOOLEAN NOT NULL DEFAULT true,
    `sira` INTEGER NOT NULL DEFAULT 0,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `stok_secenekleri_kod_tekil`(`kullanici_kimligi`, `liste_turu`, `secenek_kodu`),
    UNIQUE INDEX `stok_secenekleri_ad_tekil`(`kullanici_kimligi`, `liste_turu`, `ad_hash`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `__yeni_stok_secenekleri` (`kimlik`, `kullanici_kimligi`, `liste_turu`, `secenek_kodu`, `secenek_adi`, `ad_hash`, `silinebilir`, `etkin`, `sira`, `olusturma_zamani`) SELECT (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_secenekleri' AND m.`eski` = t.`kimlik`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'kullanicilar' AND m.`eski` = t.`kullanici_kimligi`), t.`liste_turu`, t.`secenek_kodu`, t.`secenek_adi`, t.`ad_hash`, t.`silinebilir`, t.`etkin`, t.`sira`, t.`olusturma_zamani` FROM `stok_secenekleri` t;

CREATE TABLE `__yeni_markalar` (
    `kimlik` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_kimligi` INTEGER NOT NULL,
    `marka_kodu` VARCHAR(100) NOT NULL,
    `marka_adi` VARCHAR(120) NOT NULL,
    `ad_hash` CHAR(64) NOT NULL,
    `etkin` BOOLEAN NOT NULL DEFAULT true,
    `sira` INTEGER NOT NULL DEFAULT 0,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `aciklama` TEXT NOT NULL,
    `logo_verisi` MEDIUMBLOB NULL,
    `logo_hash` CHAR(64) NULL,
    `seo_basligi` VARCHAR(250) NOT NULL,
    `seo_aciklamasi` VARCHAR(1000) NOT NULL,
    `guncelleme_zamani` DATETIME(3) NOT NULL,

    UNIQUE INDEX `markalar_kod_tekil`(`kullanici_kimligi`, `marka_kodu`),
    UNIQUE INDEX `markalar_ad_tekil`(`kullanici_kimligi`, `ad_hash`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `__yeni_markalar` (`kimlik`, `kullanici_kimligi`, `marka_kodu`, `marka_adi`, `ad_hash`, `etkin`, `sira`, `olusturma_zamani`, `aciklama`, `logo_verisi`, `logo_hash`, `seo_basligi`, `seo_aciklamasi`, `guncelleme_zamani`) SELECT (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'markalar' AND m.`eski` = t.`kimlik`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'kullanicilar' AND m.`eski` = t.`kullanici_kimligi`), t.`marka_kodu`, t.`marka_adi`, t.`ad_hash`, t.`etkin`, t.`sira`, t.`olusturma_zamani`, t.`aciklama`, t.`logo_verisi`, t.`logo_hash`, t.`seo_basligi`, t.`seo_aciklamasi`, t.`guncelleme_zamani` FROM `markalar` t;

CREATE TABLE `__yeni_stok_kartlari` (
    `kimlik` INTEGER NOT NULL AUTO_INCREMENT,
    `kullanici_kimligi` INTEGER NOT NULL,
    `kayit_istegi_kimligi` CHAR(36) NOT NULL,
    `kayit_istegi_hash` CHAR(64) NOT NULL,
    `stok_kodu` VARCHAR(100) NULL,
    `stok_adi` VARCHAR(250) NULL,
    `stok_tipi_kimligi` INTEGER NOT NULL,
    `stok_nevi_kimligi` INTEGER NOT NULL,
    `marka_kimligi` INTEGER NULL,
    `kdv_departmani_kimligi` INTEGER NULL,
    `diger_vergi_kimligi` INTEGER NULL,
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

INSERT INTO `__yeni_stok_kartlari` (`kimlik`, `kullanici_kimligi`, `kayit_istegi_kimligi`, `kayit_istegi_hash`, `stok_kodu`, `stok_adi`, `stok_tipi_kimligi`, `stok_nevi_kimligi`, `marka_kimligi`, `kdv_departmani_kimligi`, `diger_vergi_kimligi`, `envanter_takibi`, `alt_limit`, `ust_limit`, `seri_no_zorunlu`, `seri_no_oneki`, `lot_zorunlu`, `skt_takibi`, `lot_oneki`, `skt_zorunlu`, `raf_omru_gun`, `risk_suresi_gun`, `gtip_kodu`, `mensei`, `olusturma_zamani`, `guncelleme_zamani`) SELECT (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_kartlari' AND m.`eski` = t.`kimlik`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'kullanicilar' AND m.`eski` = t.`kullanici_kimligi`), t.`kayit_istegi_kimligi`, t.`kayit_istegi_hash`, t.`stok_kodu`, t.`stok_adi`, (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_secenekleri' AND m.`eski` = t.`stok_tipi_kimligi`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_secenekleri' AND m.`eski` = t.`stok_nevi_kimligi`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'markalar' AND m.`eski` = t.`marka_kimligi`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_secenekleri' AND m.`eski` = t.`kdv_departmani_kimligi`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_secenekleri' AND m.`eski` = t.`diger_vergi_kimligi`), t.`envanter_takibi`, t.`alt_limit`, t.`ust_limit`, t.`seri_no_zorunlu`, t.`seri_no_oneki`, t.`lot_zorunlu`, t.`skt_takibi`, t.`lot_oneki`, t.`skt_zorunlu`, t.`raf_omru_gun`, t.`risk_suresi_gun`, t.`gtip_kodu`, t.`mensei`, t.`olusturma_zamani`, t.`guncelleme_zamani` FROM `stok_kartlari` t;

CREATE TABLE `__yeni_stok_fiyat_listeleri` (
    `kimlik` INTEGER NOT NULL AUTO_INCREMENT,
    `stok_karti_kimligi` INTEGER NOT NULL,
    `fiyat_listesi_kimligi` INTEGER NOT NULL,
    `sira` INTEGER NOT NULL,

    UNIQUE INDEX `stok_fiyat_listeleri_kart_liste_tekil`(`stok_karti_kimligi`, `fiyat_listesi_kimligi`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `__yeni_stok_fiyat_listeleri` (`kimlik`, `stok_karti_kimligi`, `fiyat_listesi_kimligi`, `sira`) SELECT (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_fiyat_listeleri' AND m.`eski` = t.`kimlik`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_kartlari' AND m.`eski` = t.`stok_karti_kimligi`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_secenekleri' AND m.`eski` = t.`fiyat_listesi_kimligi`), t.`sira` FROM `stok_fiyat_listeleri` t;

CREATE TABLE `__yeni_stok_birimleri` (
    `kimlik` INTEGER NOT NULL AUTO_INCREMENT,
    `stok_fiyat_listesi_kimligi` INTEGER NOT NULL,
    `birim_kimligi` INTEGER NOT NULL,
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

INSERT INTO `__yeni_stok_birimleri` (`kimlik`, `stok_fiyat_listesi_kimligi`, `birim_kimligi`, `sira`, `carpan`, `ana_birim`, `varsayilan_birim`, `agirlik`, `agirlik_birimi`, `hacim_desi`, `aciklama`) SELECT (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_birimleri' AND m.`eski` = t.`kimlik`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_fiyat_listeleri' AND m.`eski` = t.`stok_fiyat_listesi_kimligi`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_secenekleri' AND m.`eski` = t.`birim_kimligi`), t.`sira`, t.`carpan`, t.`ana_birim`, t.`varsayilan_birim`, t.`agirlik`, t.`agirlik_birimi`, t.`hacim_desi`, t.`aciklama` FROM `stok_birimleri` t;

CREATE TABLE `__yeni_stok_fiyatlari` (
    `kimlik` INTEGER NOT NULL AUTO_INCREMENT,
    `stok_birimi_kimligi` INTEGER NOT NULL,
    `fiyat_yonu` VARCHAR(5) NOT NULL,
    `girilen_fiyat` DECIMAL(18, 6) NULL,
    `para_birimi` CHAR(3) NOT NULL,
    `iskonto_orani` DECIMAL(18, 6) NULL,
    `kdv_orani` DECIMAL(18, 6) NULL,
    `kdv_dahil_girildi` BOOLEAN NOT NULL,

    UNIQUE INDEX `stok_fiyatlari_birim_yon_tekil`(`stok_birimi_kimligi`, `fiyat_yonu`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `__yeni_stok_fiyatlari` (`kimlik`, `stok_birimi_kimligi`, `fiyat_yonu`, `girilen_fiyat`, `para_birimi`, `iskonto_orani`, `kdv_orani`, `kdv_dahil_girildi`) SELECT (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_fiyatlari' AND m.`eski` = t.`kimlik`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_birimleri' AND m.`eski` = t.`stok_birimi_kimligi`), t.`fiyat_yonu`, t.`girilen_fiyat`, t.`para_birimi`, t.`iskonto_orani`, t.`kdv_orani`, t.`kdv_dahil_girildi` FROM `stok_fiyatlari` t;

CREATE TABLE `__yeni_stok_ek_fiyatlari` (
    `kimlik` INTEGER NOT NULL AUTO_INCREMENT,
    `stok_fiyati_kimligi` INTEGER NOT NULL,
    `sira` INTEGER NOT NULL,
    `aciklama` VARCHAR(250) NULL,
    `tutar` DECIMAL(18, 6) NULL,
    `iskonto_orani` DECIMAL(18, 6) NULL,
    `para_birimi` CHAR(3) NOT NULL,

    INDEX `stok_ek_fiyatlari_fiyat_indeks`(`stok_fiyati_kimligi`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `__yeni_stok_ek_fiyatlari` (`kimlik`, `stok_fiyati_kimligi`, `sira`, `aciklama`, `tutar`, `iskonto_orani`, `para_birimi`) SELECT (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_ek_fiyatlari' AND m.`eski` = t.`kimlik`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_fiyatlari' AND m.`eski` = t.`stok_fiyati_kimligi`), t.`sira`, t.`aciklama`, t.`tutar`, t.`iskonto_orani`, t.`para_birimi` FROM `stok_ek_fiyatlari` t;

CREATE TABLE `__yeni_stok_barkodlari` (
    `kimlik` INTEGER NOT NULL AUTO_INCREMENT,
    `stok_birimi_kimligi` INTEGER NOT NULL,
    `barkod_turu` VARCHAR(10) NOT NULL,
    `barkod` VARCHAR(128) NOT NULL,

    INDEX `stok_barkodlari_kod_indeks`(`barkod`),
    UNIQUE INDEX `stok_barkodlari_birim_kod_tekil`(`stok_birimi_kimligi`, `barkod`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `__yeni_stok_barkodlari` (`kimlik`, `stok_birimi_kimligi`, `barkod_turu`, `barkod`) SELECT (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_barkodlari' AND m.`eski` = t.`kimlik`), (SELECT m.`yeni` FROM `__gt_id_map` m WHERE m.`tablo` = 'stok_birimleri' AND m.`eski` = t.`stok_birimi_kimligi`), t.`barkod_turu`, t.`barkod` FROM `stok_barkodlari` t;

ALTER TABLE `giris_kimlikleri` DROP FOREIGN KEY `giris_kimlikleri_kullanici_baglantisi`;

ALTER TABLE `oturumlar` DROP FOREIGN KEY `oturumlar_kullanici_baglantisi`;

ALTER TABLE `stok_secenekleri` DROP FOREIGN KEY `stok_secenekleri_kullanici_baglantisi`;

ALTER TABLE `markalar` DROP FOREIGN KEY `markalar_kullanici_baglantisi`;

ALTER TABLE `stok_kartlari` DROP FOREIGN KEY `stok_kartlari_kullanici_baglantisi`;

ALTER TABLE `stok_kartlari` DROP FOREIGN KEY `stok_kartlari_tip_baglantisi`;

ALTER TABLE `stok_kartlari` DROP FOREIGN KEY `stok_kartlari_nevi_baglantisi`;

ALTER TABLE `stok_kartlari` DROP FOREIGN KEY `stok_kartlari_marka_baglantisi`;

ALTER TABLE `stok_kartlari` DROP FOREIGN KEY `stok_kartlari_departman_baglantisi`;

ALTER TABLE `stok_kartlari` DROP FOREIGN KEY `stok_kartlari_vergi_baglantisi`;

ALTER TABLE `stok_fiyat_listeleri` DROP FOREIGN KEY `stok_fiyat_listeleri_kart_baglantisi`;

ALTER TABLE `stok_fiyat_listeleri` DROP FOREIGN KEY `stok_fiyat_listeleri_secenek_baglantisi`;

ALTER TABLE `stok_birimleri` DROP FOREIGN KEY `stok_birimleri_liste_baglantisi`;

ALTER TABLE `stok_birimleri` DROP FOREIGN KEY `stok_birimleri_secenek_baglantisi`;

ALTER TABLE `stok_fiyatlari` DROP FOREIGN KEY `stok_fiyatlari_birim_baglantisi`;

ALTER TABLE `stok_ek_fiyatlari` DROP FOREIGN KEY `stok_ek_fiyatlari_fiyat_baglantisi`;

ALTER TABLE `stok_barkodlari` DROP FOREIGN KEY `stok_barkodlari_birim_baglantisi`;

RENAME TABLE `kullanicilar` TO `__eski_kullanicilar`,
  `__yeni_kullanicilar` TO `kullanicilar`,
  `giris_kimlikleri` TO `__eski_giris_kimlikleri`,
  `__yeni_giris_kimlikleri` TO `giris_kimlikleri`,
  `oturumlar` TO `__eski_oturumlar`,
  `__yeni_oturumlar` TO `oturumlar`,
  `stok_secenekleri` TO `__eski_stok_secenekleri`,
  `__yeni_stok_secenekleri` TO `stok_secenekleri`,
  `markalar` TO `__eski_markalar`,
  `__yeni_markalar` TO `markalar`,
  `stok_kartlari` TO `__eski_stok_kartlari`,
  `__yeni_stok_kartlari` TO `stok_kartlari`,
  `stok_fiyat_listeleri` TO `__eski_stok_fiyat_listeleri`,
  `__yeni_stok_fiyat_listeleri` TO `stok_fiyat_listeleri`,
  `stok_birimleri` TO `__eski_stok_birimleri`,
  `__yeni_stok_birimleri` TO `stok_birimleri`,
  `stok_fiyatlari` TO `__eski_stok_fiyatlari`,
  `__yeni_stok_fiyatlari` TO `stok_fiyatlari`,
  `stok_ek_fiyatlari` TO `__eski_stok_ek_fiyatlari`,
  `__yeni_stok_ek_fiyatlari` TO `stok_ek_fiyatlari`,
  `stok_barkodlari` TO `__eski_stok_barkodlari`,
  `__yeni_stok_barkodlari` TO `stok_barkodlari`;

ALTER TABLE `giris_kimlikleri` ADD CONSTRAINT `giris_kimlikleri_kullanici_baglantisi` FOREIGN KEY (`kullanici_kimligi`) REFERENCES `kullanicilar`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `oturumlar` ADD CONSTRAINT `oturumlar_kullanici_baglantisi` FOREIGN KEY (`kullanici_kimligi`) REFERENCES `kullanicilar`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `stok_secenekleri` ADD CONSTRAINT `stok_secenekleri_kullanici_baglantisi` FOREIGN KEY (`kullanici_kimligi`) REFERENCES `kullanicilar`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `markalar` ADD CONSTRAINT `markalar_kullanici_baglantisi` FOREIGN KEY (`kullanici_kimligi`) REFERENCES `kullanicilar`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_kullanici_baglantisi` FOREIGN KEY (`kullanici_kimligi`) REFERENCES `kullanicilar`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_tip_baglantisi` FOREIGN KEY (`stok_tipi_kimligi`) REFERENCES `stok_secenekleri`(`kimlik`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_nevi_baglantisi` FOREIGN KEY (`stok_nevi_kimligi`) REFERENCES `stok_secenekleri`(`kimlik`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_marka_baglantisi` FOREIGN KEY (`marka_kimligi`) REFERENCES `markalar`(`kimlik`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_departman_baglantisi` FOREIGN KEY (`kdv_departmani_kimligi`) REFERENCES `stok_secenekleri`(`kimlik`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `stok_kartlari` ADD CONSTRAINT `stok_kartlari_vergi_baglantisi` FOREIGN KEY (`diger_vergi_kimligi`) REFERENCES `stok_secenekleri`(`kimlik`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `stok_fiyat_listeleri` ADD CONSTRAINT `stok_fiyat_listeleri_kart_baglantisi` FOREIGN KEY (`stok_karti_kimligi`) REFERENCES `stok_kartlari`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `stok_fiyat_listeleri` ADD CONSTRAINT `stok_fiyat_listeleri_secenek_baglantisi` FOREIGN KEY (`fiyat_listesi_kimligi`) REFERENCES `stok_secenekleri`(`kimlik`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `stok_birimleri` ADD CONSTRAINT `stok_birimleri_liste_baglantisi` FOREIGN KEY (`stok_fiyat_listesi_kimligi`) REFERENCES `stok_fiyat_listeleri`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `stok_birimleri` ADD CONSTRAINT `stok_birimleri_secenek_baglantisi` FOREIGN KEY (`birim_kimligi`) REFERENCES `stok_secenekleri`(`kimlik`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `stok_fiyatlari` ADD CONSTRAINT `stok_fiyatlari_birim_baglantisi` FOREIGN KEY (`stok_birimi_kimligi`) REFERENCES `stok_birimleri`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `stok_ek_fiyatlari` ADD CONSTRAINT `stok_ek_fiyatlari_fiyat_baglantisi` FOREIGN KEY (`stok_fiyati_kimligi`) REFERENCES `stok_fiyatlari`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `stok_barkodlari` ADD CONSTRAINT `stok_barkodlari_birim_baglantisi` FOREIGN KEY (`stok_birimi_kimligi`) REFERENCES `stok_birimleri`(`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE `__eski_stok_barkodlari`;

DROP TABLE `__eski_stok_ek_fiyatlari`;

DROP TABLE `__eski_stok_fiyatlari`;

DROP TABLE `__eski_stok_birimleri`;

DROP TABLE `__eski_stok_fiyat_listeleri`;

DROP TABLE `__eski_stok_kartlari`;

DROP TABLE `__eski_markalar`;

DROP TABLE `__eski_stok_secenekleri`;

DROP TABLE `__eski_oturumlar`;

DROP TABLE `__eski_giris_kimlikleri`;

DROP TABLE `__eski_kullanicilar`;

DROP TABLE `__gt_id_map`;
