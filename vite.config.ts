/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

const resolveProjectPath = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url))

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
      manifest: false, // because we provide public/manifest.webmanifest
      injectRegister: 'auto'
    })
  ],
  optimizeDeps: {
        include: [
          'react', 
          'react-dom', 
          'react-router-dom',
          // Include CommonJS modules so our polyfills can import them
          'spark-md5',
          'vuvuzela',
          'vuvuzela-original',
          'events',
          'level-codec',
          'ltgt',
          'readable-stream',
          'double-ended-queue',
          'levelup',
          'through2',
          'memdown',
          'assert',
          'util'
        ],
        exclude: [
          // Exclude all PouchDB modules to prevent ES module import conflicts
          'pouchdb', 
          'pouchdb-adapter-idb', 
          'pouchdb-replication', 
          'pouchdb-adapter-memory', 
          'pouchdb-browser',
          'pouchdb-md5',
          'pouchdb-core',
          'pouchdb-utils',
          'pouchdb-json',
          'pouchdb-adapter-leveldb-core',
          'sublevel-pouchdb',
          'pouchdb-find',
          'pouchdb-mapreduce-utils'
        ],
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
    alias: [
      { find: '@/components', replacement: resolveProjectPath('./src/components') },
      { find: '@/pages', replacement: resolveProjectPath('./src/pages') },
      { find: '@/utils', replacement: resolveProjectPath('./src/utils') },
      { find: '@/hooks', replacement: resolveProjectPath('./src/hooks') },
      { find: '@/api', replacement: resolveProjectPath('./src/api') },
      { find: '@/types', replacement: resolveProjectPath('./src/types') },
      { find: '@', replacement: resolveProjectPath('./src') },
      { find: 'shared', replacement: resolveProjectPath('./src/shared') },
      // Polyfill CommonJS modules for PouchDB ES modules
      { find: /^spark-md5$/, replacement: resolveProjectPath('./src/lib/spark-md5-polyfill.js') },
      { find: /^vuvuzela$/, replacement: resolveProjectPath('./src/lib/vuvuzela-polyfill.js') },
      { find: /^vuvuzela-original$/, replacement: resolveProjectPath('./node_modules/vuvuzela/index.js') },
      { find: /^level-codec$/, replacement: resolveProjectPath('./src/lib/level-codec-polyfill.js') },
      { find: /^ltgt$/, replacement: resolveProjectPath('./src/lib/ltgt-polyfill.js') },
      { find: /^readable-stream$/, replacement: resolveProjectPath('./src/lib/readable-stream-polyfill.js') },
      { find: /^double-ended-queue$/, replacement: resolveProjectPath('./src/lib/double-ended-queue-polyfill.js') },
      { find: /^levelup$/, replacement: resolveProjectPath('./src/lib/levelup-polyfill.js') },
      { find: /^through2$/, replacement: resolveProjectPath('./src/lib/through2-polyfill.js') },
      { find: /^memdown$/, replacement: resolveProjectPath('./src/lib/memdown-polyfill.js') },
      { find: /^events$/, replacement: resolveProjectPath('./src/lib/events-polyfill.js') },
      { find: /^assert$/, replacement: resolveProjectPath('./node_modules/assert/build/assert.js') },
      { find: /^util$/, replacement: resolveProjectPath('./node_modules/util/util.js') }
    ],
    dedupe: ['react', 'react-dom'],
    conditions: ['require', 'node', 'import', 'module', 'browser', 'default']
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2020',
    minify: 'esbuild',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      external: (_id) => {
        // Let spark-md5 be bundled but handle it carefully
        return false
      },
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
    server: {
      deps: {
        inline: ['msw']
      }
    },
    typecheck: {
      tsconfig: './tsconfig.vitest.json'
    }
  },
})





