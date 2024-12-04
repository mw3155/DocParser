import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true
  },
  build: {
    rollupOptions: {
      external: ['jszip', 'web-tree-sitter']
    }
  }
});