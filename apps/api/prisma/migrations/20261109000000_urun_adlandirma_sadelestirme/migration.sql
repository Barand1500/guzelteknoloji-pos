-- Yeni ürün ekranıyla uyum. Ürünler ve ilişkileri yeniden adlandırılır; ID ve bağlantılar korunur.

-- Kaldırılan alanlar: KDV departmanı, ürün nevi, GTIP, birim açıklaması ve ek fiyatlar.

ALTER TABLE `stok_secenekleri` DROP FOREIGN KEY `stok_secenekleri_kullanici_baglantisi`;

ALTER TABLE `stok_kartlari` DROP FOREIGN KEY `stok_kartlari_kullanici_baglantisi`;

ALTER TABLE `stok_kartlari` DROP FOREIGN KEY `stok_kartlari_tip_baglantisi`;

ALTER TABLE `stok_kartlari` DROP FOREIGN KEY `stok_kartlari_nevi_baglantisi`;

ALTER TABLE `stok_kartlari` DROP FOREIGN KEY `stok_kartlari_marka_baglantisi`;

ALTER TABLE `stok_kartlari` DROP FOREIGN KEY `stok_kartlari_departman_baglantisi`;

ALTER TABLE `stok_kartlari` DROP FOREIGN KEY `stok_kartlari_vergi_baglantisi`;

ALTER TABLE `stok_gorselleri` DROP FOREIGN KEY `stok_gorselleri_stok_karti_id_fkey`;

ALTER TABLE `stok_karti_kategorileri` DROP FOREIGN KEY `stok_karti_kategorileri_stok_karti_id_fkey`;

ALTER TABLE `stok_karti_kategorileri` DROP FOREIGN KEY `stok_karti_kategorileri_kategori_id_fkey`;

ALTER TABLE `stok_firsatlari` DROP FOREIGN KEY `stok_firsatlari_stok_karti_id_fkey`;

ALTER TABLE `stok_firsatlari` DROP FOREIGN KEY `stok_firsatlari_firsat_id_fkey`;

ALTER TABLE `stok_ozellik_degerleri` DROP FOREIGN KEY `stok_ozellik_degerleri_stok_karti_id_fkey`;

ALTER TABLE `stok_ozellik_degerleri` DROP FOREIGN KEY `stok_ozellik_degerleri_deger_id_fkey`;

ALTER TABLE `stok_varyantlari` DROP FOREIGN KEY `stok_varyantlari_stok_karti_id_fkey`;

ALTER TABLE `stok_varyant_degerleri` DROP FOREIGN KEY `stok_varyant_degerleri_varyant_id_fkey`;

ALTER TABLE `stok_varyant_degerleri` DROP FOREIGN KEY `stok_varyant_degerleri_deger_id_fkey`;

ALTER TABLE `stok_birimleri` DROP FOREIGN KEY `stok_birimleri_kart_baglantisi`;

ALTER TABLE `stok_birimleri` DROP FOREIGN KEY `stok_birimleri_secenek_baglantisi`;

ALTER TABLE `stok_fiyatlari` DROP FOREIGN KEY `stok_fiyatlari_birim_baglantisi`;

ALTER TABLE `stok_fiyatlari` DROP FOREIGN KEY `stok_fiyatlari_liste_baglantisi`;

ALTER TABLE `stok_ek_fiyatlari` DROP FOREIGN KEY `stok_ek_fiyatlari_fiyat_baglantisi`;

ALTER TABLE `stok_barkodlari` DROP FOREIGN KEY `stok_barkodlari_birim_baglantisi`;

DROP TABLE `stok_ek_fiyatlari`;

RENAME TABLE `stok_kartlari` TO `urunler`,
  `stok_secenekleri` TO `urun_secenekleri`,
  `stok_birimleri` TO `urun_birimleri`,
  `stok_barkodlari` TO `urun_barkodlari`,
  `stok_fiyatlari` TO `urun_fiyatlari`,
  `stok_gorselleri` TO `urun_gorselleri`,
  `stok_karti_kategorileri` TO `urun_kategorileri`,
  `stok_firsatlari` TO `urun_firsatlari`,
  `stok_ozellik_degerleri` TO `urun_ozellik_degerleri`,
  `stok_varyantlari` TO `urun_varyantlari`,
  `stok_varyant_degerleri` TO `urun_varyant_degerleri`;

ALTER TABLE `urunler` RENAME INDEX `stok_kartlari_kullanici_kod_tekil` TO `urunler_kullanici_kod_tekil`;

ALTER TABLE `urunler` RENAME INDEX `stok_kartlari_kayit_istegi_tekil` TO `urunler_kayit_istegi_tekil`;

ALTER TABLE `urunler` CHANGE COLUMN `stok_kodu` `urun_kodu` VARCHAR(100) NULL;

ALTER TABLE `urunler` CHANGE COLUMN `stok_adi` `urun_adi` VARCHAR(250) NULL;

ALTER TABLE `urunler` CHANGE COLUMN `stok_tipi_id` `urun_tipi_id` INTEGER NOT NULL;

ALTER TABLE `urunler` DROP COLUMN `stok_nevi_id`;

ALTER TABLE `urunler` DROP COLUMN `kdv_departmani_id`;

ALTER TABLE `urunler` DROP COLUMN `gtip_kodu`;

ALTER TABLE `urun_secenekleri` RENAME INDEX `stok_secenekleri_kod_tekil` TO `urun_secenekleri_kod_tekil`;

ALTER TABLE `urun_secenekleri` RENAME INDEX `stok_secenekleri_ad_tekil` TO `urun_secenekleri_ad_tekil`;

ALTER TABLE `urun_birimleri` RENAME INDEX `stok_birimleri_kart_indeks` TO `urun_birimleri_kart_indeks`;

ALTER TABLE `urun_birimleri` CHANGE COLUMN `stok_karti_id` `urun_id` INTEGER NOT NULL;

ALTER TABLE `urun_birimleri` DROP COLUMN `aciklama`;

ALTER TABLE `urun_barkodlari` RENAME INDEX `stok_barkodlari_kod_indeks` TO `urun_barkodlari_kod_indeks`;

ALTER TABLE `urun_barkodlari` RENAME INDEX `stok_barkodlari_birim_kod_tekil` TO `urun_barkodlari_birim_kod_tekil`;

ALTER TABLE `urun_barkodlari` CHANGE COLUMN `stok_birimi_id` `urun_birimi_id` INTEGER NOT NULL;

ALTER TABLE `urun_fiyatlari` RENAME INDEX `stok_fiyatlari_birim_liste_yon_tekil` TO `urun_fiyatlari_birim_liste_yon_tekil`;

ALTER TABLE `urun_fiyatlari` CHANGE COLUMN `stok_birimi_id` `urun_birimi_id` INTEGER NOT NULL;

ALTER TABLE `urun_gorselleri` RENAME INDEX `stok_gorselleri_dosya_adi_key` TO `urun_gorselleri_dosya_adi_key`;

ALTER TABLE `urun_gorselleri` RENAME INDEX `stok_gorselleri_stok_karti_id_sira_idx` TO `urun_gorselleri_urun_id_sira_idx`;

ALTER TABLE `urun_gorselleri` CHANGE COLUMN `stok_karti_id` `urun_id` INTEGER NOT NULL;

ALTER TABLE `urun_kategorileri` CHANGE COLUMN `stok_karti_id` `urun_id` INTEGER NOT NULL;

ALTER TABLE `urun_firsatlari` CHANGE COLUMN `stok_karti_id` `urun_id` INTEGER NOT NULL;

ALTER TABLE `urun_ozellik_degerleri` CHANGE COLUMN `stok_karti_id` `urun_id` INTEGER NOT NULL;

ALTER TABLE `urun_varyantlari` RENAME INDEX `stok_varyantlari_stok_karti_id_idx` TO `urun_varyantlari_urun_id_idx`;

ALTER TABLE `urun_varyantlari` RENAME INDEX `stok_varyantlari_stok_karti_id_kod_key` TO `urun_varyantlari_urun_id_kod_key`;

ALTER TABLE `urun_varyantlari` CHANGE COLUMN `stok_karti_id` `urun_id` INTEGER NOT NULL;

DELETE FROM `urun_secenekleri` WHERE `liste_turu` IN ('vatDepartments', 'stockKinds');

ALTER TABLE `urun_secenekleri` ADD CONSTRAINT `urun_secenekleri_kullanici_baglantisi` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `urunler` ADD CONSTRAINT `urunler_kullanici_baglantisi` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `urunler` ADD CONSTRAINT `urunler_tip_baglantisi` FOREIGN KEY (`urun_tipi_id`) REFERENCES `urun_secenekleri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `urunler` ADD CONSTRAINT `urunler_marka_baglantisi` FOREIGN KEY (`marka_id`) REFERENCES `markalar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `urunler` ADD CONSTRAINT `urunler_vergi_baglantisi` FOREIGN KEY (`diger_vergi_id`) REFERENCES `urun_secenekleri`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `urun_gorselleri` ADD CONSTRAINT `urun_gorselleri_urun_id_fkey` FOREIGN KEY (`urun_id`) REFERENCES `urunler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `urun_kategorileri` ADD CONSTRAINT `urun_kategorileri_urun_id_fkey` FOREIGN KEY (`urun_id`) REFERENCES `urunler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `urun_kategorileri` ADD CONSTRAINT `urun_kategorileri_kategori_id_fkey` FOREIGN KEY (`kategori_id`) REFERENCES `kategoriler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `urun_firsatlari` ADD CONSTRAINT `urun_firsatlari_urun_id_fkey` FOREIGN KEY (`urun_id`) REFERENCES `urunler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `urun_firsatlari` ADD CONSTRAINT `urun_firsatlari_firsat_id_fkey` FOREIGN KEY (`firsat_id`) REFERENCES `firsatlar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `urun_ozellik_degerleri` ADD CONSTRAINT `urun_ozellik_degerleri_urun_id_fkey` FOREIGN KEY (`urun_id`) REFERENCES `urunler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `urun_ozellik_degerleri` ADD CONSTRAINT `urun_ozellik_degerleri_deger_id_fkey` FOREIGN KEY (`deger_id`) REFERENCES `ozellik_degerleri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `urun_varyantlari` ADD CONSTRAINT `urun_varyantlari_urun_id_fkey` FOREIGN KEY (`urun_id`) REFERENCES `urunler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `urun_varyant_degerleri` ADD CONSTRAINT `urun_varyant_degerleri_varyant_id_fkey` FOREIGN KEY (`varyant_id`) REFERENCES `urun_varyantlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `urun_varyant_degerleri` ADD CONSTRAINT `urun_varyant_degerleri_deger_id_fkey` FOREIGN KEY (`deger_id`) REFERENCES `ozellik_degerleri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `urun_birimleri` ADD CONSTRAINT `urun_birimleri_kart_baglantisi` FOREIGN KEY (`urun_id`) REFERENCES `urunler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `urun_birimleri` ADD CONSTRAINT `urun_birimleri_secenek_baglantisi` FOREIGN KEY (`birim_id`) REFERENCES `urun_secenekleri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `urun_fiyatlari` ADD CONSTRAINT `urun_fiyatlari_birim_baglantisi` FOREIGN KEY (`urun_birimi_id`) REFERENCES `urun_birimleri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `urun_fiyatlari` ADD CONSTRAINT `urun_fiyatlari_liste_baglantisi` FOREIGN KEY (`fiyat_listesi_id`) REFERENCES `urun_secenekleri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `urun_barkodlari` ADD CONSTRAINT `urun_barkodlari_birim_baglantisi` FOREIGN KEY (`urun_birimi_id`) REFERENCES `urun_birimleri`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
