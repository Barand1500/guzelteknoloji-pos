import { defineConfig } from '@playwright/test';

/**
 * Duyarlı görünüm testleri. Tarayıcı indirmez: sistemde kurulu Chrome/Edge kanalını kullanır
 * (PW_CHANNEL=chrome|msedge, varsayılan msedge). API çağrıları test içinde taklit edilir,
 * bu yüzden veritabanı gerekmez.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    channel: process.env.PW_CHANNEL ?? 'msedge',
    locale: 'tr-TR',
  },
  webServer: {
    command: 'npm run dev -- --strictPort',
    url: 'http://localhost:5173/login',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
