import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true
  },
  build: {
    rollupOptions: {
      external: ['jszip', 'web-tree-sitter']
    }
  },
  logLevel: 'info',
  assetsInclude: ['**/*.wasm'],
  plugins: [
    {
      name: 'wasm-fix',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
          }
          next();
        });
      }
    }
  ]
});