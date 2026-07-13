import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Forces Vite to output JavaScript compatible with older WebKit/Safari engines
    target: ['es2020', 'safari14'],
  },
})
