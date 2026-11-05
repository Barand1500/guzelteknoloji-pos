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
    baseURL: 'http://localhost:5175',
    channel: process.env.PW_CHANNEL ?? 'msedge',
    locale: 'tr-TR',
  },
  webServer: {
    env: { VITE_SUPPORT_FORM_URL: 'https://destek.guzelteknoloji.com/form/test' },
    command: 'npm run dev -- --strictPort --port 5175',
    url: 'http://localhost:5175/login',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
