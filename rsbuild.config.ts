import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  output: {
    assetPrefix: './',
  },
  dev: {
    assetPrefix: './',
  },
  server: {
    open: false,
  },
});
