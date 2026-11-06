-- Yalnızca adlar değişir, mevcut hash değerleri korunur.
ALTER TABLE `kullanicilar` RENAME COLUMN `sifre_ozeti` TO `sifre_hash`;
ALTER TABLE `oturumlar`
  RENAME COLUMN `oturum_anahtari_ozeti` TO `oturum_anahtari_hash`,
  RENAME INDEX `oturumlar_anahtar_ozeti_tekil` TO `oturumlar_anahtar_hash_tekil`;
ALTER TABLE `eposta_giris_kodlari` RENAME COLUMN `kod_ozeti` TO `kod_hash`;
ALTER TABLE `stok_secenekleri` RENAME COLUMN `ad_ozeti` TO `ad_hash`;
ALTER TABLE `markalar`
  RENAME COLUMN `ad_ozeti` TO `ad_hash`,
  RENAME COLUMN `logo_ozeti` TO `logo_hash`;
ALTER TABLE `stok_kartlari` RENAME COLUMN `kayit_istegi_ozeti` TO `kayit_istegi_hash`;
