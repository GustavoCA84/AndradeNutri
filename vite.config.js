import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'AndradeNutri',
        short_name: 'AndradeNutri',
        description: 'Sistema de gestão para nutricionistas — AndradeNutri',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Estratégia NetworkFirst para chamadas à API do Neon
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.neon\.tech\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'neon-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hora
              },
            },
          },
        ],
        // Cache dos assets estáticos do app
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        enabled: true, // Permite testar o PWA em modo dev
      },
    }),
  ],
})
