import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // A developer's .env.local (VITE_API_MODE=server) must not change the tests. Tests that need
    // the server flow stub these themselves.
    env: {
      VITE_API_MODE: 'mock',
      VITE_API_BASE_URL: '',
      VITE_GOOGLE_CLIENT_ID: '',
    },
  },
})
