import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/unfolding-drawing/' : '/',
  plugins: [solid(), tailwindcss()],
}));
