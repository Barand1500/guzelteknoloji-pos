ALTER TABLE `site_sayfalari`
  ADD COLUMN `seo_basligi` VARCHAR(250) NOT NULL DEFAULT '',
  ADD COLUMN `seo_aciklamasi` VARCHAR(1000) NOT NULL DEFAULT '';
