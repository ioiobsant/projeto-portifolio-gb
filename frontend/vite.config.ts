import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/

export default defineConfig({
  plugins: [react(), VitePWA({ 
    registerType: 'autoUpdate',
    devOptions: { enabled: true },
    manifest: {
      name: 'Genice Brandão Atelier',
      short_name: 'GB Atelier',
      description: 'Catálogo e aplicativo Genice Brandão Atelier — Estofados de Luxo.',
      theme_color: '#1a1a1a',
      background_color: '#1a1a1a',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      lang: 'pt-BR',
      categories: ['shopping', 'lifestyle'],
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
  
  
  })],
});

