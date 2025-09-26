import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  output: {
    assetPrefix: './',
  },
  server: {
    open: false
  },
});
