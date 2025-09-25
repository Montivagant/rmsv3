# RMS v3 Scripts

This directory contains utility scripts for development, testing, and data seeding.

## Available Scripts

### Menu Data Seeding

```bash
pnpm seed:menu
```

Seeds test menu categories and items. This script can work in two modes:

1. **With Test API Server**: When the test API server is running, it sends events to persist data
2. **Standalone**: When API server is not running, it shows what data would be created

To persist menu data:
```bash
# Terminal 1: Start the test API server
pnpm api:test-server

# Terminal 2: Run the seed script
pnpm seed:menu

# Terminal 3: Start the app with test API
pnpm api:test
```

### Test API Server

```bash
pnpm api:test-server
```

Runs a minimal Express server on port 3001 that:
- Accepts and processes events
- Stores data in memory
- Provides API endpoints for development

### Other Scripts

- `test-offline-online.js` - Tests offline/online functionality
- `test-api-integration.js` - Tests API integration
- `style-scan.mjs` - Scans for hardcoded styles

## Notes

- The seed script creates:
  - Sample categories (Appetizers, Main Courses, etc.)
  - Menu items with proper SKUs and pricing
  - Modifier groups (Size, Extra Toppings, Cooking Style)
- All scripts use ES modules
- The test API server processes events and updates in-memory storage
- Data is not persisted between server restarts unless using the actual app with IndexedDB

## Recent Updates

- Fixed menu modifiers to use real event-driven data instead of mock data
- Removed hardcoded defaults from the repository
- Fixed accessibility warnings for duplicate button labels
- Integrated modifier groups into the seed data script
