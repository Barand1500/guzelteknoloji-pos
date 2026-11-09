-- Önceki migration canlıda uygulandı; mevcut kullanıcı seçeneklerini bir kez tamamla.
-- Pasif veya aynı adla kayıtlı seçenekleri yeniden oluşturma/etkinleştirme.
INSERT INTO `urun_secenekleri`
  (`kullanici_id`, `liste_turu`, `secenek_kodu`, `secenek_adi`, `ad_hash`, `silinebilir`, `etkin`, `sira`, `olusturma_zamani`)
SELECT u.`id`, 'otherTaxes', v.kod, v.ad, SHA2(v.normalize_ad, 256), false, true, v.sira, CURRENT_TIMESTAMP(3)
FROM `kullanicilar` u
CROSS JOIN (
  SELECT 'mtv' AS kod, 'MTV' AS ad, 'mtv' AS normalize_ad, 100 AS sira
  UNION ALL SELECT 'alis-otv', 'Alış ÖTV', 'alış ötv', 101
  UNION ALL SELECT 'satis-otv', 'Satış ÖTV', 'satış ötv', 102
) v
WHERE NOT EXISTS (
  SELECT 1 FROM `urun_secenekleri` s
  WHERE s.`kullanici_id` = u.`id` AND s.`liste_turu` = 'otherTaxes'
    AND (s.`secenek_kodu` = v.kod OR s.`ad_hash` = SHA2(v.normalize_ad, 256))
);
