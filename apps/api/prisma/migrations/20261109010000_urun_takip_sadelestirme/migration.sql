-- Yeni arayüzde takip yalnızca Evet/Hayır. Önceden takip edilen ürünlerin takibi açık kalır.
UPDATE `urunler` SET `envanter_takibi` = 'normal'
WHERE `envanter_takibi` IN ('seri', 'lot', 'omur');

ALTER TABLE `urunler`
  DROP COLUMN `seri_no_zorunlu`,
  DROP COLUMN `seri_no_oneki`,
  DROP COLUMN `lot_zorunlu`,
  DROP COLUMN `skt_takibi`,
  DROP COLUMN `lot_oneki`,
  DROP COLUMN `skt_zorunlu`,
  DROP COLUMN `raf_omru_gun`,
  DROP COLUMN `risk_suresi_gun`;

DELETE FROM `urun_secenekleri`
WHERE `liste_turu` = 'inventoryTracking' AND `secenek_kodu` IN ('seri', 'lot', 'omur');

UPDATE `urun_secenekleri` SET `secenek_adi` = 'Hayır',
  `ad_hash` = SHA2('hayır', 256)
WHERE `liste_turu` = 'inventoryTracking' AND `secenek_kodu` = 'yok';

UPDATE `urun_secenekleri` SET `secenek_adi` = 'Evet',
  `ad_hash` = SHA2('evet', 256)
WHERE `liste_turu` = 'inventoryTracking' AND `secenek_kodu` = 'normal';
