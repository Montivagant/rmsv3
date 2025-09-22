# Real API Integration Guide

This document explains how to set up and test RMS v3 with a real API backend instead of mock data.

## Environment Configuration

### Development with Real API

Create a `.env.local` file in the project root:

```bash
# Real API Configuration
VITE_API_BASE=https://your-api-server.com/api

# Disable mocks when using real API
VITE_USE_MSW=0

# Optional: Enhanced logging for debugging
VITE_LOG_LEVEL=debug
VITE_DEBUG_EVENTS=true
VITE_DEBUG_SYNC=true
```

### Expected API Endpoints

The system expects the following REST API endpoints:

#### Event Management
- `POST /events` - Submit events to server
- `GET /events?since={timestamp}&limit={number}` - Fetch events since timestamp
- `GET /events/{id}` - Get specific event by ID

#### CouchDB/PouchDB Sync (Optional)
- `GET /_db/rmsv3_events` - Database info
- `GET /_db/rmsv3_events/_changes` - Changes feed
- `POST /_db/rmsv3_events/_bulk_docs` - Bulk document operations

#### Health Check
- `GET /health` - API health status
- `GET /version` - API version information

## Quick Test Server Setup

For testing purposes, you can set up a minimal compatible server:

### Option 1: CouchDB/PouchDB Server

```bash
# Install CouchDB or use PouchDB Server
npm install -g pouchdb-server

# Start server
pouchdb-server --host 0.0.0.0 --port 5984

# Set environment
VITE_API_BASE=http://localhost:5984
```

### Option 2: Mock API Server

```javascript
// test-server.js
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Events endpoint
app.post('/events', (req, res) => {
  console.log('Received event:', req.body);
  res.json({ success: true, id: `event_${Date.now()}` });
});

app.get('/events', (req, res) => {
  const since = req.query.since || 0;
  const limit = req.query.limit || 100;
  
  // Return empty events array for testing
  res.json({ 
    events: [], 
    since: parseInt(since), 
    limit: parseInt(limit),
    hasMore: false 
  });
});

app.listen(3001, () => {
  console.log('Test API server running on http://localhost:3001');
});
```

Then run:
```bash
node test-server.js
VITE_API_BASE=http://localhost:3001/api pnpm dev
```

## Testing Real API Integration

### 1. Verify API Connection

When the app starts with `VITE_API_BASE` set, check the browser console for:
```
✅ Sync manager auto-started successfully
✅ Optimized event store ready (PouchDB canonical persistence)
```

### 2. Test Event Synchronization

1. Perform any data operation (create customer, add menu item, etc.)
2. Check browser Network tab for API calls
3. Verify events are sent to your API endpoint

### 3. Test Offline/Online Behavior

1. Start with internet connection
2. Perform operations (should sync immediately)
3. Disconnect internet
4. Perform more operations (should queue locally)
5. Reconnect internet
6. Verify queued operations sync automatically

### 4. Monitor Sync Status

The app provides hooks for monitoring sync:

```typescript
import { useStorageMetrics } from '../db/compaction';

function SyncMonitor() {
  const { metrics, loading } = useStorageMetrics();
  
  if (loading) return <div>Loading metrics...</div>;
  
  return (
    <div>
      <p>Documents: {metrics?.docCount}</p>
      <p>Disk Size: {(metrics?.diskSize || 0) / 1024 / 1024} MB</p>
      <p>Last Compaction: {metrics?.lastCompactionAt ? new Date(metrics.lastCompactionAt).toLocaleString() : 'Never'}</p>
    </div>
  );
}
```

## Architecture Overview

When `VITE_API_BASE` is configured, the system operates as follows:

1. **Local-First Writes**: All operations are immediately persisted to PouchDB
2. **Background Sync**: Changes are automatically pushed to the remote server
3. **Conflict Resolution**: PouchDB handles conflicts with Last-Write-Wins strategy
4. **Offline Resilience**: App continues working when network is unavailable
5. **Automatic Recovery**: Sync resumes when network is restored

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure your API server has CORS configured
   - Check browser console for CORS-related errors

2. **Authentication Errors**
   - The system doesn't yet implement authentication
   - Ensure your API endpoints don't require auth, or add auth middleware

3. **Sync Not Working**
   - Check network connectivity
   - Verify `VITE_API_BASE` is correctly set
   - Look for error messages in browser console

4. **Database Conflicts**
   - Monitor for conflict resolution messages
   - Use database admin tools to inspect conflict documents

### Debug Commands

```bash
# Enable all debugging
VITE_LOG_LEVEL=debug VITE_DEBUG_EVENTS=true VITE_DEBUG_SYNC=true pnpm dev

# Check database status
# Open browser DevTools Console and run:
# window.__RMS_DEBUG_DB_STATUS()
```

## Production Considerations

1. **API Performance**: Ensure your API can handle the expected event volume
2. **Database Scaling**: Plan for event log growth over time
3. **Monitoring**: Implement proper logging and monitoring on the API side
4. **Security**: Add authentication and authorization as needed
5. **Backup**: Regular backups of the event store database

## Next Steps

1. Set up your API server following the expected endpoints
2. Configure the environment variables
3. Test the integration thoroughly
4. Monitor logs and performance
5. Implement additional features as needed (auth, real-time notifications, etc.)
