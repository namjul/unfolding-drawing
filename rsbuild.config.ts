import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSolid } from '@rsbuild/plugin-solid';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
  plugins: [
    pluginBabel({
      include: /\.(?:jsx|tsx)$/,
    }),
    pluginSolid(),
  ],
  tools: {
    postcss: {
      postcssOptions: {
        plugins: [
          tailwindcss(),
        ],
      },

    }
  },
  html: {
    template: './index.html',
  },
});
