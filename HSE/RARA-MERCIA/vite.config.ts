import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Publié sur GitHub Pages sous /agenceelite/hse-rara-mercia/ ; BASE_PATH permet de changer d'adresse sans toucher au code.
const base = process.env.BASE_PATH ?? '/agenceelite/hse-rara-mercia/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone.svg'],
      manifest: {
        name: 'HSE RARA Mercia',
        short_name: 'HSE Mercia',
        description: 'Pilotage HSE du site de Kundji',
        lang: 'fr',
        theme_color: '#0f2a4a',
        background_color: '#f4f6fb',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, navigateFallback: null },
    }),
  ],
  build: { chunkSizeWarningLimit: 2000 },
})
