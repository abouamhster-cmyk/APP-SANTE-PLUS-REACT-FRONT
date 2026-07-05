// 📁 vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'masked-icon.svg',
        'firebase-messaging-sw.js', 
        'notification.mp3',           
      ],
      manifest: {
        name: 'Santé Plus Services',
        short_name: 'Santé Plus',
        description: 'Accompagnement humain et coordination à domicile',
        theme_color: '#1a4a3a',
        background_color: '#f5f0e8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
          { src: '/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
          { src: '/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
          { src: '/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
          { src: '/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,mp3}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://app-react-back.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
