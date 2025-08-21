/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({ 
      babel: {
        plugins: []
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallback: '/',
        // Prevent SW from hijacking /api/* (which caused HTML to be returned)
        navigateFallbackDenylist: [/^\/api\//]
      },
      includeAssets: ['/icons/icon-192.png', '/icons/icon-512.png'],
      manifest: false // because we provide public/manifest.webmanifest
    })
  ],
  optimizeDeps: {
        exclude: ['pouchdb', 'pouchdb-adapter-idb', 'pouchdb-replication', 'pouchdb-adapter-memory', 'pouchdb-browser', 'spark-md5', 'vuvuzela'],
        force: true
      },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },

  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'THIS_IS_UNDEFINED') return
        warn(warning)
      }
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      strictRequires: true
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', './vitest.setup.ts'],
    testTimeout: 15000,
    typecheck: {
      tsconfig: './tsconfig.vitest.json'
    }
  },
})
