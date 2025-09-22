# DashUp

Modern, offline-first restaurant management system built with React, TypeScript, and Vite. DashUp runs as a fast single‑page app (SPA) with local persistence and background synchronization to your backend, so your POS and back office remain usable even when the network is unreliable.

## Highlights

- Offline‑first UX with local persistence and background sync
- POS, Inventory, Reports, KDS, Customers, and Admin modules
- Accessible, responsive UI with reusable components and design tokens
- Strict TypeScript, clear logging, and production‑ready build pipeline

## Tech Stack

- React 19, React Router 6 (v7 future flags enabled)
- TypeScript, Vite 7
- Local persistence: IndexedDB/PouchDB (Electron preferred)
- State and utilities: Zustand and lightweight custom modules

## Requirements

- Node.js 18+ (LTS recommended)
- pnpm 9+

## Quick Start (Development)

```bash
# Clone
git clone <your-repo-url>
cd dashup

# Install deps
pnpm install

# Start dev server
pnpm dev
```

By default the app will run with a local-first store. To use your real backend in development, set `VITE_API_BASE` (no trailing slash):

```bash
VITE_API_BASE=https://api.yourdomain.com pnpm dev
```

## Configuration (.env)

Create `.env` (or `.env.local`, `.env.production`, etc.). The most important variables are:

```dotenv
# Required in production (no trailing slash)
VITE_API_BASE=https://api.yourdomain.com

# Optional: disable service worker in production
# VITE_DISABLE_SW=1

# Optional: tune logging in dev (debug|info|warn|error)
# VITE_LOG_LEVEL=info
# VITE_CONSOLE_LOGGING=false
```

## Production Build & Hosting (Vite)

1) Build

```bash
pnpm build
```

This outputs a static site in `dist/`.

2) Preview locally (optional)

```bash
pnpm preview
```

3) Host the `dist/` directory on any static host (Nginx shown):

```nginx
server {
    listen 80;
    server_name dashup.example.com;

    root /var/www/dashup/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Notes
- Ensure your API allows CORS from your app origin
- Use HTTPS in production (TLS) and correct `VITE_API_BASE`
- Service Worker: enabled by default in production; set `VITE_DISABLE_SW=1` to opt out

## Backend Integration

DashUp calls your API under the `/api/...` prefix. The base URL is taken from `VITE_API_BASE`.

Minimum expectations:
- REST endpoints for app features (inventory, menu, users, branches, reports, etc.)
- Event endpoints for offline sync (recommended but optional)
  - `GET /api/events?since=<timestamp>` → returns an array of events
  - `POST /api/events` with `{ events: [...] }` to ingest new events

If you already expose REST routes under `/api/*`, point `VITE_API_BASE` to that server and the app will use them directly.

## Scripts

```bash
pnpm dev           # Start Vite dev server
pnpm build         # Production build (dist/)
pnpm preview       # Serve built site locally

pnpm typecheck     # TypeScript project check
pnpm lint          # ESLint
pnpm test          # Tests (vitest)
pnpm test:coverage # Coverage

pnpm electron:build  # Optional: build desktop app
```

## Project Structure (high level)

```
src/
  api/            # API helpers (base URL, JSON utilities)
  bootstrap/      # App initialization and persistence bootstrap
  components/     # Reusable UI components
  contexts/       # React contexts (auth, etc.)
  data/           # Remote client and sync helpers
  db/             # Local database adapters and sync manager
  events/         # Optimized event store and queries
  hooks/          # React hooks (analytics, API, etc.)
  inventory/      # Inventory domain modules
  menu/           # Menu domain modules
  pages/          # Page-level routes
  services/       # Domain service wrappers (users, branches, categories)
  shared/         # Logger and shared utilities
  sw/             # Service worker integration
```

## Development Tips

- Use `VITE_API_BASE` during development to hit your real backend
- Keep `dist/` and caches out of source control (see `.gitignore`)
- Run `pnpm typecheck` and `pnpm lint` before commits/PRs

## Accessibility & UI

The UI is built with reusable components, global styles, and design tokens, aiming for accessible interactions (roles, focus management, keyboard navigation). Overlays and dismissible layers share consistent behavior.

## Troubleshooting

- React Router future flags warnings: already enabled in code
- Double logs in dev: React StrictMode can invoke effects twice; this does not affect production
- Service worker caching: Disable with `VITE_DISABLE_SW=1` if your environment requires it

## License

MIT (c) DashUp. See `LICENSE`.