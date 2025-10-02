import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  output: {
    target: 'node',
    module: true,
    assetPrefix: './',
  },
  dev: {
    assetPrefix: './',
  },
  server: {
    open: false,
  },
});
