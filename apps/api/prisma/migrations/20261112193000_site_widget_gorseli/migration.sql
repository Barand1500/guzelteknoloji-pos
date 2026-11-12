-- E-ticaret ayarları › Site içeriği: widget görseli

ALTER TABLE `site_widgetlari` ADD COLUMN `gorsel_id` INTEGER NULL;

ALTER TABLE `site_widgetlari` ADD CONSTRAINT `site_widgetlari_gorsel_id_fkey` FOREIGN KEY (`gorsel_id`) REFERENCES `site_gorselleri`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
