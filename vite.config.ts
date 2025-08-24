/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import commonjs from '@rollup/plugin-commonjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({ 
      jsxRuntime: 'automatic',
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
        include: [
          'react', 
          'react-dom', 
          'react-router-dom'
        ],
        exclude: ['spark-md5', 'vuvuzela', 'pouchdb', 'pouchdb-adapter-idb', 'pouchdb-replication', 'pouchdb-adapter-memory', 'pouchdb-browser'],
        force: true
      },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },

  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    jsx: 'automatic'
  },
  resolve: {
    alias: {
      'spark-md5': 'spark-md5/spark-md5.js',
      'vuvuzela': 'vuvuzela/index.js'
    },
    dedupe: ['react', 'react-dom'],
    conditions: ['import', 'module', 'node', 'browser', 'default']
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'THIS_IS_UNDEFINED') return
        if (warning.code === 'MISSING_EXPORT') return
        if (warning.code === 'UNRESOLVED_IMPORT') return
        if (warning.code === 'CIRCULAR_DEPENDENCY') return
        warn(warning)
      }
    }
  },
  base: './', // Important for Electron to find assets
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
