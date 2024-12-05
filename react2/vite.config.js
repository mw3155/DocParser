import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true
  },
  base: '/docs2txt/',  // Replace with your repository name
  build: {
    outDir: 'dist',
  },
  // Add public directory for tree-sitter wasm files
  publicDir: 'public',
})
