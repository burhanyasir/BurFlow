import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev proxy for all API traffic. The SaaS API's dev default port is 3457
      // (engine/packages/saas-api/src/index.ts). Override with VITE_API_URL only
      // when pointing at a different backend.
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3457',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
