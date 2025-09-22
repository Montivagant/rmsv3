/**
 * Optimized Event Store with Indexing and Caching
 * 
 * Performance improvements:
 * - Event type indexing for O(1) type-based queries
 * - Date range indexing for efficient reporting
 * - Aggregate indexing for customer/ticket queries
 * - Computed value caching with invalidation
 * - Memory management with configurable retention
 */

import type { Event, EventStore, AppendOptions, AppendResult } from './types';
import { generateEventId, stableHash } from './hash';
import { logEvent } from './log';
import { dispatchOutboxEvent } from '../data/sync/outboxBridge';
import { environment } from '../lib/environment';
import { processIncomingEvent, EventValidationError, type VersionedEvent } from './validation';
import { logger } from '../shared/logger';

export interface OptimizedStoreConfig {
  maxEventsInMemory?: number;
  cacheExpiry?: number; // milliseconds
  enableMetrics?: boolean;
}

interface EventIndex {
  byType: Map<string, Set<string>>; // type -> Set<eventId>
  byAggregate: Map<string, Set<string>>; // aggregateId -> Set<eventId>
  byDate: Map<string, Set<string>>; // YYYY-MM-DD -> Set<eventId>
  byHour: Map<string, Set<string>>; // YYYY-MM-DD-HH -> Set<eventId>
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  dependencies: Set<string>; // Event IDs this cache depends on
}

interface PerformanceMetrics {
  queriesExecuted: number;
  cacheHits: number;
  cacheMisses: number;
  averageQueryTime: number;
  indexUsage: Record<string, number>;
}

export class OptimizedEventStore implements EventStore {
  private events: Map<string, Event> = new Map();
  private eventArray: Event[] = []; // Maintain order for compatibility
  private indexes: EventIndex;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private idempotencyIndex = new Map<string, { eventId: string; paramsHash: string }>();
  private sequenceCounter = 0;
  private config: OptimizedStoreConfig;
  private metrics: PerformanceMetrics;

  constructor(config: OptimizedStoreConfig = {}) {
    this.config = {
      maxEventsInMemory: 10000,
      cacheExpiry: 5 * 60 * 1000, // 5 minutes
      enableMetrics: true,
      ...config
    };

    this.indexes = {
      byType: new Map(),
      byAggregate: new Map(),
      byDate: new Map(),
      byHour: new Map()
    };

    this.metrics = {
      queriesExecuted: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0,
      indexUsage: {}
    };

    // Periodic cache cleanup
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupExpiredCache(), 60000); // Every minute
    }
  }

  append(type: string, payload: any, opts: AppendOptions): AppendResult {
    const startTime = performance.now();
    
    const paramsHash = stableHash(opts.params);
    
    // Check for existing idempotency key
    const existing = this.idempotencyIndex.get(opts.key);
    
    if (existing) {
      const existingEvent = this.events.get(existing.eventId);
      
      if (!existingEvent) {
        throw new Error(`Event ${existing.eventId} not found in index`);
      }
      
      // Same params hash - return existing event (deduped)
      if (existing.paramsHash === paramsHash) {
        return {
          event: existingEvent,
          deduped: true,
          isNew: false
        };
      }
      
      // Different params hash - conflict
      throw new Error(`Idempotency conflict for key '${opts.key}': params hash mismatch`);
    }
    
    // Create new event with version support
    const eventCandidate = {
      id: generateEventId(),
      seq: ++this.sequenceCounter,
      type,
      at: Date.now(),
      version: 1, // Default version for new events
      aggregate: opts.aggregate,
      payload
    };

    // Validate event before storing
    let event: Event & VersionedEvent;
    try {
      event = processIncomingEvent(eventCandidate) as Event & VersionedEvent;
    } catch (error) {
      if (error instanceof EventValidationError) {
        logger.error(`Event validation failed for ${type}`, {
          eventType: type,
          version: error.version,
          validationErrors: error.issues
        });
        throw new Error(`Invalid event payload: ${error.message}`);
      }
      throw error;
    }
    
    // Store event
    this.events.set(event.id, event);
    this.eventArray.push(event);
    
    // Update indexes
    this.updateIndexes(event);
    
    // Index for idempotency
    this.idempotencyIndex.set(opts.key, {
      eventId: event.id,
      paramsHash
    });
    
    // Invalidate related caches
    this.invalidateCache(event);
    
    // Memory management
    this.enforceMemoryLimits();
    
    // Log the event
    logEvent(event);

    // Dispatch to outbox for sync
    dispatchOutboxEvent(event);

    // Persist to PouchDB/IndexedDB (fire-and-forget to not block)
    this.persistEventToPouchDB(event).catch(error => {
      logger.warn('Failed to persist event to PouchDB', { 
        eventId: event.id, 
        eventType: event.type,
        error: (error as Error).message
      });
    });

    // Update metrics
    if (this.config.enableMetrics) {
      const duration = performance.now() - startTime;
      this.updateMetrics(duration);
    }
    
    return {
      event,
      deduped: false,
      isNew: true
    };
  }

  getAll(): Event[] {
    return [...this.eventArray];
  }

  query(filter?: any): Event[] {
    if (!filter) {
      return this.getAll();
    }
    
    const startTime = performance.now();
    
    // Use optimized indexes when possible
    if (filter.type && !filter.aggregateId && !filter.aggregateType) {
      return this.getEventsByType(filter.type);
    }
    
    if (filter.aggregateId && !filter.type && !filter.aggregateType) {
      return this.getEventsForAggregate(filter.aggregateId);
    }
    
    // Fallback to filtering all events
    const events = this.eventArray.filter(event => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.aggregateId && event.aggregate?.id !== filter.aggregateId) return false;
      if (filter.aggregateType && event.aggregate?.type !== filter.aggregateType) return false;
      return true;
    });
    
    if (this.config.enableMetrics) {
      this.updateMetrics(performance.now() - startTime);
    }
    
    return events;
  }

  /**
   * Get events by type with O(1) index lookup
   */
  getEventsByType<T extends Event['type']>(type: T): Extract<Event, { type: T }>[] {
    const startTime = performance.now();
    const cacheKey = `type:${type}`;
    
    // Check cache first
    const cached = this.getFromCache<Event[]>(cacheKey);
    if (cached) {
      if (this.config.enableMetrics) {
        this.metrics.cacheHits++;
        this.updateMetrics(performance.now() - startTime);
      }
      return cached as Extract<Event, { type: T }>[];
    }

    // Use index for fast lookup
    const eventIds = this.indexes.byType.get(type) || new Set();
    const events = Array.from(eventIds)
      .map(id => this.events.get(id))
      .filter(Boolean) as Extract<Event, { type: T }>[];

    // Sort by sequence to maintain order
    events.sort((a, b) => a.seq - b.seq);

    // Cache result
    this.setCache(cacheKey, events, Array.from(eventIds));

    if (this.config.enableMetrics) {
      this.metrics.cacheMisses++;
      this.metrics.indexUsage.byType = (this.metrics.indexUsage.byType || 0) + 1;
      this.updateMetrics(performance.now() - startTime);
    }

    return events;
  }

  /**
   * Get events for aggregate with O(1) index lookup
   */
  getEventsForAggregate(aggregateId: string): Event[] {
    const startTime = performance.now();
    const cacheKey = `aggregate:${aggregateId}`;
    
    // Check cache first
    const cached = this.getFromCache<Event[]>(cacheKey);
    if (cached) {
      if (this.config.enableMetrics) {
        this.metrics.cacheHits++;
        this.updateMetrics(performance.now() - startTime);
      }
      return cached;
    }

    // Use index for fast lookup
    const eventIds = this.indexes.byAggregate.get(aggregateId) || new Set();
    const events = Array.from(eventIds)
      .map(id => this.events.get(id))
      .filter(Boolean) as Event[];

    // Sort by sequence to maintain order
    events.sort((a, b) => a.seq - b.seq);

    // Cache result
    this.setCache(cacheKey, events, Array.from(eventIds));

    if (this.config.enableMetrics) {
      this.metrics.cacheMisses++;
      this.metrics.indexUsage.byAggregate = (this.metrics.indexUsage.byAggregate || 0) + 1;
      this.updateMetrics(performance.now() - startTime);
    }

    return events;
  }

  /**
   * Get events for date range with optimized indexing
   */
  getEventsByDateRange(startDate: Date, endDate: Date): Event[] {
    const startTime = performance.now();
    const cacheKey = `dateRange:${startDate.toISOString()}-${endDate.toISOString()}`;
    
    // Check cache first
    const cached = this.getFromCache<Event[]>(cacheKey);
    if (cached) {
      if (this.config.enableMetrics) {
        this.metrics.cacheHits++;
        this.updateMetrics(performance.now() - startTime);
      }
      return cached;
    }

    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    const eventIds = new Set<string>();

    // Use date indexes for faster lookup
    const startDateKey = this.getDateKey(startDate);
    const endDateKey = this.getDateKey(endDate);

    // If same day, use day index
    if (startDateKey === endDateKey) {
      const dayEvents = this.indexes.byDate.get(startDateKey) || new Set();
      dayEvents.forEach(id => eventIds.add(id));
    } else {
      // Multiple days - iterate through date range
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateKey = this.getDateKey(current);
        const dayEvents = this.indexes.byDate.get(dateKey) || new Set();
        dayEvents.forEach(id => eventIds.add(id));
        current.setDate(current.getDate() + 1);
      }
    }

    // Filter by exact timestamp and sort
    const events = Array.from(eventIds)
      .map(id => this.events.get(id))
      .filter(event => event && event.at >= startTimestamp && event.at <= endTimestamp)
      .sort((a, b) => a!.seq - b!.seq) as Event[];

    // Cache result
    this.setCache(cacheKey, events, Array.from(eventIds));

    if (this.config.enableMetrics) {
      this.metrics.cacheMisses++;
      this.metrics.indexUsage.byDate = (this.metrics.indexUsage.byDate || 0) + 1;
      this.updateMetrics(performance.now() - startTime);
    }

    return events;
  }

  /**
   * Get events for business date (optimized for reporting)
   */
  getEventsForBusinessDate(businessDate: string): Event[] {
    const startOfDay = new Date(`${businessDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${businessDate}T23:59:59.999Z`);
    return this.getEventsByDateRange(startOfDay, endOfDay);
  }

  /**
   * Direct event addition for hydration (bypasses validation)
   */
  addEventDirectly(event: Event): void {
    this.events.set(event.id, event);
    this.eventArray.push(event);
    this.updateIndexes(event);
    
    // Update sequence counter
    if (event.seq > this.sequenceCounter) {
      this.sequenceCounter = event.seq;
    }
  }

  /**
   * Reset store (clear all data)
   */
  async reset(): Promise<void> {
    this.events.clear();
    this.eventArray = [];
    this.indexes = {
      byType: new Map(),
      byAggregate: new Map(),
      byDate: new Map(),
      byHour: new Map()
    };
    this.cache.clear();
    this.idempotencyIndex.clear();
    this.sequenceCounter = 0;
    this.resetMetrics();
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Update all indexes for an event
   */
  private updateIndexes(event: Event): void {
    // Type index
    if (!this.indexes.byType.has(event.type)) {
      this.indexes.byType.set(event.type, new Set());
    }
    this.indexes.byType.get(event.type)!.add(event.id);

    // Aggregate index
    if (event.aggregate?.id) {
      if (!this.indexes.byAggregate.has(event.aggregate.id)) {
        this.indexes.byAggregate.set(event.aggregate.id, new Set());
      }
      this.indexes.byAggregate.get(event.aggregate.id)!.add(event.id);
    }

    // Date indexes
    const date = new Date(event.at);
    const dateKey = this.getDateKey(date);
    const hourKey = this.getHourKey(date);

    if (!this.indexes.byDate.has(dateKey)) {
      this.indexes.byDate.set(dateKey, new Set());
    }
    this.indexes.byDate.get(dateKey)!.add(event.id);

    if (!this.indexes.byHour.has(hourKey)) {
      this.indexes.byHour.set(hourKey, new Set());
    }
    this.indexes.byHour.get(hourKey)!.add(event.id);
  }

  /**
   * Invalidate caches that depend on this event
   */
  private invalidateCache(event: Event): void {
    const toDelete: string[] = [];

    for (const [cacheKey, entry] of this.cache.entries()) {
      if (entry.dependencies.has(event.id) || 
          this.cacheAffectedByEvent(cacheKey, event)) {
        toDelete.push(cacheKey);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Check if cache is affected by event
   */
  private cacheAffectedByEvent(cacheKey: string, event: Event): boolean {
    if (cacheKey.startsWith(`type:${event.type}`)) return true;
    if (event.aggregate?.id && cacheKey.startsWith(`aggregate:${event.aggregate.id}`)) return true;
    
    const dateKey = this.getDateKey(new Date(event.at));
    if (cacheKey.includes(dateKey)) return true;
    
    return false;
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiry
    if (Date.now() - entry.timestamp > this.config.cacheExpiry!) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  private setCache<T>(key: string, value: T, dependencies: string[] = []): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      dependencies: new Set(dependencies)
    });
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiry = this.config.cacheExpiry!;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Memory management
   */
  private enforceMemoryLimits(): void {
    if (this.eventArray.length > this.config.maxEventsInMemory!) {
      const excess = this.eventArray.length - this.config.maxEventsInMemory!;
      const oldEvents = this.eventArray.splice(0, excess);
      
      // Remove from maps and indexes
      oldEvents.forEach(event => {
        this.events.delete(event.id);
        this.removeFromIndexes(event);
      });

      console.log(`🧹 Cleaned up ${excess} old events from memory`);
    }
  }

  private removeFromIndexes(event: Event): void {
    // Type index
    this.indexes.byType.get(event.type)?.delete(event.id);

    // Aggregate index  
    if (event.aggregate?.id) {
      this.indexes.byAggregate.get(event.aggregate.id)?.delete(event.id);
    }

    // Date indexes
    const date = new Date(event.at);
    const dateKey = this.getDateKey(date);
    const hourKey = this.getHourKey(date);

    this.indexes.byDate.get(dateKey)?.delete(event.id);
    this.indexes.byHour.get(hourKey)?.delete(event.id);
  }

  /**
   * Utility methods
   */
  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getHourKey(date: Date): string {
    return date.toISOString().substring(0, 13);
  }

  private updateMetrics(duration: number): void {
    this.metrics.queriesExecuted++;
    this.metrics.averageQueryTime = 
      (this.metrics.averageQueryTime * (this.metrics.queriesExecuted - 1) + duration) / 
      this.metrics.queriesExecuted;
  }

  private resetMetrics(): void {
    this.metrics = {
      queriesExecuted: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0,
      indexUsage: {}
    };
  }

  /**
   * Persist event to PouchDB/IndexedDB (canonical persistence layer)
   */
  private async persistEventToPouchDB(event: Event): Promise<void> {
    try {
      // Dynamically import PouchDB to handle module availability
      const { openLocalDB, putEvent } = await import('../db/pouch');
      const db = await openLocalDB({ name: environment.eventStorePath });
      await putEvent(db, event);
    } catch (error) {
      // PouchDB may not be available in some environments, fail gracefully
      throw new Error(`PouchDB persistence failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
