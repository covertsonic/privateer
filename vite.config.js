import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  base: './', // Use relative paths for all assets
  publicDir: 'public',
  server: {
    port: 5173,
    open: true,
    cors: true
  },
  resolve: {
    alias: [
      {
        find: '/js',
        replacement: path.resolve(__dirname, 'js')
      }
    ]
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  }
});
