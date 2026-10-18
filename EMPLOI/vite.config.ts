import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Publié à la racine de recrutement.agence-elite.fr (Cloudflare Pages). BASE_PATH permet une autre adresse.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1000 },
})
