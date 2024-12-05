import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/docs2txt/', // Replace with your repository name
  server: {
    open: true // This will open the browser automatically
  },
  publicDir: 'public'
})
