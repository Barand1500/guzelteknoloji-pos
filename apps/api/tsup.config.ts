import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Ortak paket TypeScript kaynağı olarak tüketildiği için pakete gömülür.
  noExternal: ['@gt/shared'],
});
