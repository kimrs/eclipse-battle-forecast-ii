import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/eclipse-battle-forecast-ii/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
