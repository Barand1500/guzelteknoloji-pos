-- Bu değerler girilen fiyat, iskonto, KDV oranı ve KDV dahil seçeneğinden
-- aynı Decimal hesabıyla okunurken üretilir. Asıl fiyat bilgileri korunur.
ALTER TABLE `stok_fiyatlari`
  DROP COLUMN `net_fiyat`,
  DROP COLUMN `kdv_haric_fiyat`,
  DROP COLUMN `kdv_dahil_fiyat`;
