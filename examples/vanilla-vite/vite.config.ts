import { defineConfig } from 'vite';
import path from 'path';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  resolve: {
    alias: {
      'listedb-sync-manager': path.resolve(__dirname, '../../src/index'),
    },
  },
});
