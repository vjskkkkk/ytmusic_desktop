import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, 'src/renderer');

export default defineConfig({
  root,
  base: './',
  plugins: [svelte()],
  server: { port: 5173, strictPort: true },
  build: {
    outDir: resolve(import.meta.dirname, 'dist-renderer'),
    emptyOutDir: true,
    target: 'chrome140',
    // Webamp alone is ~940 kB. The app loads from local files, so bundle size doesn't matter here.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        app: resolve(root, 'app/index.html'),
        'mini-modern': resolve(root, 'mini-modern/index.html'),
        'mini-classic': resolve(root, 'mini-classic/index.html'),
      },
    },
  },
  test: {
    root: import.meta.dirname,
    include: ['test/**/*.test.js'],
  },
});
