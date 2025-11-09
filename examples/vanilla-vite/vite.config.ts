import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'listedb-sync-manager': path.resolve(__dirname, '../../src/index'),
    },
  },
});
