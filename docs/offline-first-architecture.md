# Offline-First Architecture

## Overview

RMS v3 implements a complete offline-first architecture with event sourcing, allowing seamless operation with or without internet connectivity.

## Architecture Components

### 1. Event Store (PouchDB/IndexedDB)
- **Canonical Persistence**: All events stored in PouchDB/IndexedDB
- **Automatic Fallback**: IndexedDB when PouchDB unavailable
- **Cross-Platform**: Works in browser, Electron, and mobile

### 2. Outbox Pattern
- **Local-First Writes**: Events written locally immediately
- **Background Sync**: Automatic upload when online
- **Retry Logic**: Exponential backoff for failed syncs
- **Idempotent**: Safe to retry operations

### 3. Sync Manager  
- **Auto-Configuration**: Starts automatically when `VITE_API_BASE` set
- **Network Detection**: Pauses/resumes based on connectivity
- **Conflict Resolution**: Simple last-write-wins with timestamps

## Conflict Resolution Strategy

### Simple Conflict Rules
1. **Last-Write-Wins**: Event with latest timestamp takes precedence
2. **Idempotent Operations**: Events can be safely replayed
3. **Aggregate Consistency**: Events within same aggregate maintain order
4. **Manual Resolution**: Complex conflicts escalated to user interface

### Conflict Types Handled
- **Network Partitions**: Automatic merge when connectivity restored
- **Concurrent Edits**: Latest timestamp wins, audit log maintains history
- **Schema Evolution**: Event versioning allows graceful upgrades

### Implementation Details
```typescript
// Events include timestamp and sequence for ordering
interface Event {
  id: string;
  seq: number;        // Monotonic sequence within aggregate
  at: number;         // Timestamp for conflict resolution
  type: string;
  aggregate: { id: string; type: string };
  payload: any;
}
```

## Offline-First Workflow

### 1. Local-First Writes
```typescript
// All writes go to local event store first
const result = eventStore.append('sale.recorded', payload, {
  key: `sale-${ticketId}`,
  aggregate: { id: ticketId, type: 'ticket' }
});

// Event immediately available for reads
const events = eventStore.getByAggregate(ticketId);
```

### 2. Sync Triggers
- **Online Event**: Automatic sync when connectivity restored
- **Periodic Sync**: Background sync every 30 seconds when online
- **Manual Trigger**: User-initiated sync via settings panel
- **Startup Sync**: Initial data fetch on application start

### 3. Compaction Cadence
- **Automatic**: PouchDB compacts during idle periods
- **Threshold-Based**: Compaction when storage exceeds limits
- **Manual**: Available via technical console
- **Retention**: Old events archived based on business rules

## Network Resilience

### Connection States
- **Online**: Real-time bidirectional sync
- **Offline**: Local-only operation with full functionality
- **Intermittent**: Automatic retry with exponential backoff
- **Slow**: Sync continues with extended timeouts

### Data Guarantees
- **Durability**: All writes persisted to local storage
- **Consistency**: Event ordering maintained per aggregate
- **Availability**: Full functionality available offline
- **Partition Tolerance**: Automatic recovery from network splits

## Production Deployment

### Environment Variables
```bash
# Enable real API (disables MSW mocking)
VITE_API_BASE=https://api.yourserver.com

# Optional: Configure sync endpoints
VITE_SYNC_ENDPOINT=https://sync.yourserver.com
```

### Server Requirements
- **Idempotent Endpoints**: All API endpoints handle duplicate requests
- **Event Ingestion**: POST /api/events accepts batch event uploads
- **Conflict Resolution**: Server implements last-write-wins logic
- **CORS Configuration**: Allow browser clients for sync

### Performance Monitoring
- **Sync Metrics**: Track sync frequency, success rates, conflicts
- **Storage Usage**: Monitor local storage growth and compaction
- **Network Usage**: Optimize batch sizes based on connection quality
- **Error Tracking**: Log sync failures and resolution strategies

## Troubleshooting

### Common Issues
1. **Sync Failures**: Check network connectivity and server endpoints
2. **Storage Quota**: Implement compaction or data archival
3. **Conflict Loops**: Review conflict resolution logic
4. **Performance**: Monitor event store size and query performance

### Debugging Tools
- **Technical Console**: Manual sync control and status monitoring  
- **Event Inspector**: Browse local event store contents
- **Sync Status**: Real-time sync state and error reporting
- **Performance Metrics**: Query performance and cache hit rates
