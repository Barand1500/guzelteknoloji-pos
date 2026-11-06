-- Eski BLOB'lar API ilk baslatilirken dosyaya tasinip dogrulandiktan sonra bosaltilir.
ALTER TABLE `markalar` ADD COLUMN `logo_dosyasi` VARCHAR(255) NULL;
