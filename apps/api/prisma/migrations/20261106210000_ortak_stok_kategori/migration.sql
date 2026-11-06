-- Test verisinde ilk listenin birimleri esas alınır; eşleşen diğer liste fiyatları korunur.
-- İlk listede karşılığı olmayan test birimleri/barkodları ve fiyatları kaldırılır.
ALTER TABLE `stok_kartlari` ADD COLUMN `satisa_acik` BOOLEAN NOT NULL DEFAULT true, ADD COLUMN `stok_miktari` DECIMAL(18,6) NOT NULL DEFAULT 0;
ALTER TABLE `stok_birimleri` ADD COLUMN `stok_karti_id` INTEGER NULL;
ALTER TABLE `stok_fiyatlari` ADD COLUMN `fiyat_listesi_id` INTEGER NULL;
UPDATE `stok_birimleri` b JOIN `stok_fiyat_listeleri` l ON l.`id`=b.`stok_fiyat_listesi_id` SET b.`stok_karti_id`=l.`stok_karti_id`;
UPDATE `stok_fiyatlari` f JOIN `stok_birimleri` b ON b.`id`=f.`stok_birimi_id` JOIN `stok_fiyat_listeleri` l ON l.`id`=b.`stok_fiyat_listesi_id` SET f.`fiyat_listesi_id`=l.`fiyat_listesi_id`;

CREATE TABLE `__ortak_ilk_listeler` AS SELECT `id`, `stok_karti_id`, ROW_NUMBER() OVER (PARTITION BY `stok_karti_id` ORDER BY `sira`, `id`) AS `sira_no` FROM `stok_fiyat_listeleri`;
CREATE TABLE `__ortak_birim_siralari` AS SELECT b.`id`, b.`stok_fiyat_listesi_id`, b.`stok_karti_id`, b.`birim_id`, ROW_NUMBER() OVER (PARTITION BY b.`stok_fiyat_listesi_id`, b.`birim_id` ORDER BY b.`sira`, b.`id`) AS `sira_no` FROM `stok_birimleri` b;
CREATE TABLE `__ortak_birim_esleme` AS SELECT kaynak.`id` AS `eski_id`, hedef.`id` AS `ortak_id` FROM `__ortak_birim_siralari` kaynak JOIN `__ortak_ilk_listeler` ilk ON ilk.`stok_karti_id`=kaynak.`stok_karti_id` AND ilk.`sira_no`=1 JOIN `__ortak_birim_siralari` hedef ON hedef.`stok_fiyat_listesi_id`=ilk.`id` AND hedef.`birim_id`=kaynak.`birim_id` AND hedef.`sira_no`=kaynak.`sira_no`;
CREATE UNIQUE INDEX `stok_fiyatlari_birim_liste_yon_tekil` ON `stok_fiyatlari`(`stok_birimi_id`,`fiyat_listesi_id`,`fiyat_yonu`);
DROP INDEX `stok_fiyatlari_birim_yon_tekil` ON `stok_fiyatlari`;
UPDATE `stok_fiyatlari` f JOIN `__ortak_birim_esleme` e ON e.`eski_id`=f.`stok_birimi_id` SET f.`stok_birimi_id`=e.`ortak_id`;
DELETE b FROM `stok_birimleri` b JOIN `__ortak_ilk_listeler` l ON l.`id`=b.`stok_fiyat_listesi_id` WHERE l.`sira_no`<>1;
ALTER TABLE `stok_birimleri` DROP FOREIGN KEY `stok_birimleri_liste_baglantisi`;
DROP INDEX `stok_birimleri_liste_indeks` ON `stok_birimleri`;
ALTER TABLE `stok_birimleri` DROP COLUMN `stok_fiyat_listesi_id`, MODIFY `stok_karti_id` INTEGER NOT NULL;
ALTER TABLE `stok_fiyatlari` MODIFY `fiyat_listesi_id` INTEGER NOT NULL;
CREATE INDEX `stok_birimleri_kart_indeks` ON `stok_birimleri`(`stok_karti_id`);
ALTER TABLE `stok_birimleri` ADD CONSTRAINT `stok_birimleri_kart_baglantisi` FOREIGN KEY (`stok_karti_id`) REFERENCES `stok_kartlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `stok_fiyatlari` ADD CONSTRAINT `stok_fiyatlari_liste_baglantisi` FOREIGN KEY (`fiyat_listesi_id`) REFERENCES `stok_secenekleri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
DROP TABLE `stok_fiyat_listeleri`;
DROP TABLE `__ortak_birim_esleme`;
DROP TABLE `__ortak_birim_siralari`;
DROP TABLE `__ortak_ilk_listeler`;

CREATE TABLE `kategoriler` (
 `id` INTEGER NOT NULL AUTO_INCREMENT,
 `kullanici_id` INTEGER NOT NULL,
 `ust_kategori_id` INTEGER NULL,
 `ad` VARCHAR(120) NOT NULL,
 `aciklama` TEXT NOT NULL,
 `gorsel_dosyasi` VARCHAR(255) NULL,
 `etkin` BOOLEAN NOT NULL DEFAULT true,
 `gizli` BOOLEAN NOT NULL DEFAULT false,
 `sira` INTEGER NOT NULL DEFAULT 0,
 `seo_basligi` VARCHAR(250) NOT NULL,
 `seo_aciklamasi` VARCHAR(1000) NOT NULL,
 PRIMARY KEY (`id`),
 INDEX `kategoriler_kullanici_id_ust_kategori_id_idx`(`kullanici_id`,`ust_kategori_id`),
 CONSTRAINT `kategoriler_kullanici_id_fkey` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `kategoriler_ust_kategori_id_fkey` FOREIGN KEY (`ust_kategori_id`) REFERENCES `kategoriler`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `stok_karti_kategorileri` (
 `stok_karti_id` INTEGER NOT NULL,
 `kategori_id` INTEGER NOT NULL,
 PRIMARY KEY (`stok_karti_id`,`kategori_id`),
 CONSTRAINT `stok_karti_kategorileri_stok_karti_id_fkey` FOREIGN KEY (`stok_karti_id`) REFERENCES `stok_kartlari`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `stok_karti_kategorileri_kategori_id_fkey` FOREIGN KEY (`kategori_id`) REFERENCES `kategoriler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
