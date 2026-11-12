/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // VITE_* değişkenleri kök .env dosyasından okunur (yalnızca VITE_ önekliler tarayıcıya gider).
  envDir: '../../',
  server: {
    port: 5173,
    // Geliştirmede API aynı origin'den proxy'lenir: cookie'ler first-party kalır, CORS gerekmez.
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } },
  },
  preview: {
    port: 4173,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    // Ağır jsdom testleri 55 dosya paralel koşarken 5 sn'lik varsayılanı aşabiliyordu
    // (tek başına geçen testler toplu koşuda düşüyordu). Gerçek takılmalar yine yakalanır.
    testTimeout: 15_000,
  },
});
