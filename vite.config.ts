import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/unfolding-drawing/' : '/',
  cacheDir: '.vite',
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm', 'kysely', '@evolu/web'],
  },
  plugins: [solid(), tailwindcss()],
}));
