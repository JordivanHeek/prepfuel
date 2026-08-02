import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// LET OP: pas 'base' aan naar de naam van je GitHub-repo.
// Bijv. repo "prepfuel" -> base '/prepfuel/'. Voor een user/organisatie
// page (username.github.io) gebruik je base '/'.
const REPO_NAME = 'prepfuel'

export default defineConfig({
  base: `/${REPO_NAME}/`,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'PrepFuel — Meal Prep & Macros',
        short_name: 'PrepFuel',
        description: 'Meal prep en macro-tracking voor een lean bulk. Werkt offline.',
        lang: 'nl',
        theme_color: '#10b981',
        background_color: '#0b1120',
        display: 'standalone',
        orientation: 'portrait',
        start_url: `/${REPO_NAME}/`,
        scope: `/${REPO_NAME}/`,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      devOptions: { enabled: false },
    }),
  ],
})
