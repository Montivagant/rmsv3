/**
 * PouchDB Compaction and Storage Management
 * Provides automatic compaction, storage monitoring, and cleanup operations
 */

import { useState, useEffect } from 'react';
import { logger } from '../shared/logger';
import { environment } from '../lib/environment';

export interface CompactionConfig {
  enabled: boolean;
  intervalMs: number; // How often to check for compaction needs
  thresholdMB: number; // Compact when DB size exceeds this
  maxRetries: number;
  retryDelayMs: number;
}

export interface StorageMetrics {
  totalSize: number;
  documentCount: number;
  deletedCount: number;
  updateSeq: number;
  compactRunning: boolean;
  lastCompactionAt?: number;
  fragmentationRatio: number; // deleted/total ratio
}

export interface CompactionResult {
  success: boolean;
  beforeSize: number;
  afterSize: number;
  spaceSaved: number;
  duration: number;
  error?: string;
}

class CompactionManager {
  private config: CompactionConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isCompacting = false;
  private lastCompaction = 0;

  constructor(config: Partial<CompactionConfig> = {}) {
    this.config = {
      enabled: true,
      intervalMs: 30 * 60 * 1000, // 30 minutes
      thresholdMB: 50, // Compact when DB > 50MB
      maxRetries: 3,
      retryDelayMs: 5 * 60 * 1000, // 5 minutes
      ...config
    };

    // Adjust defaults based on environment
    if (environment.isElectron) {
      // Desktop apps can handle more frequent compaction
      this.config.intervalMs = 15 * 60 * 1000; // 15 minutes
      this.config.thresholdMB = 100; // Higher threshold for desktop
    }
  }

  /**
   * Start automatic compaction monitoring
   */
  start(): void {
    if (!this.config.enabled || this.intervalId) return;

    logger.info('Starting PouchDB compaction manager', {
      intervalMs: this.config.intervalMs,
      thresholdMB: this.config.thresholdMB
    });

    this.intervalId = setInterval(() => {
      this.checkAndCompact().catch(error => {
        logger.error('Compaction check failed', { error: error.message });
      });
    }, this.config.intervalMs);

    // Run initial check after a short delay
    setTimeout(() => {
      this.checkAndCompact().catch(() => {
        // Ignore initial check failures
      });
    }, 30000); // 30 seconds
  }

  /**
   * Stop automatic compaction
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped PouchDB compaction manager');
    }
  }

  /**
   * Check if compaction is needed and run if necessary
   */
  private async checkAndCompact(): Promise<void> {
    if (this.isCompacting) return;

    try {
      const { openLocalDB } = await import('./pouch');
      const db = await openLocalDB({ name: environment.eventStorePath });
      const metrics = await this.getStorageMetrics(db);

      // Check if compaction is needed
      const needsCompaction = this.shouldCompact(metrics);
      
      if (needsCompaction) {
        logger.info('Starting automatic compaction', {
          totalSizeMB: Math.round(metrics.totalSize / (1024 * 1024) * 100) / 100,
          fragmentationRatio: Math.round(metrics.fragmentationRatio * 100) / 100,
          documentCount: metrics.documentCount
        });

        const result = await this.compactDatabase(db);
        
        if (result.success) {
          this.lastCompaction = Date.now();
          logger.info('Compaction completed successfully', {
            spaceSavedMB: Math.round(result.spaceSaved / (1024 * 1024) * 100) / 100,
            duration: Math.round(result.duration),
            reduction: Math.round((result.spaceSaved / result.beforeSize) * 100)
          });
        } else {
          logger.warn('Compaction failed', { error: result.error });
        }
      }
    } catch (error) {
      logger.error('Compaction check error', {}, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Determine if compaction is needed based on metrics
   */
  private shouldCompact(metrics: StorageMetrics): boolean {
    // Don't compact if already running
    if (metrics.compactRunning || this.isCompacting) return false;

    // Don't compact too frequently (minimum 1 hour between compactions)
    const minInterval = 60 * 60 * 1000;
    if (this.lastCompaction && (Date.now() - this.lastCompaction) < minInterval) {
      return false;
    }

    // Size-based threshold
    const sizeMB = metrics.totalSize / (1024 * 1024);
    if (sizeMB > this.config.thresholdMB) return true;

    // Fragmentation-based threshold (>30% deleted documents)
    if (metrics.fragmentationRatio > 0.3 && metrics.documentCount > 1000) {
      return true;
    }

    return false;
  }

  /**
   * Get storage metrics for a database
   */
  async getStorageMetrics(db: any): Promise<StorageMetrics> {
    try {
      const info = await db.info();
      const totalSize = info.data_size || info.disk_size || 0;
      const documentCount = info.doc_count || 0;
      const deletedCount = info.doc_del_count || 0;
      const updateSeq = info.update_seq || 0;
      
      const metrics: StorageMetrics = {
        totalSize,
        documentCount,
        deletedCount,
        updateSeq,
        compactRunning: info.compact_running || false,
        fragmentationRatio: documentCount > 0 ? deletedCount / (documentCount + deletedCount) : 0
      };

      if (this.lastCompaction) {
        metrics.lastCompactionAt = this.lastCompaction;
      }

      return metrics;
    } catch (error) {
      logger.warn('Failed to get storage metrics', {}, error instanceof Error ? error : new Error(String(error)));
      return {
        totalSize: 0,
        documentCount: 0,
        deletedCount: 0,
        updateSeq: 0,
        compactRunning: false,
        fragmentationRatio: 0
      };
    }
  }

  /**
   * Compact a database with retry logic
   */
  async compactDatabase(db: any): Promise<CompactionResult> {
    this.isCompacting = true;
    const startTime = Date.now();
    let beforeSize = 0;
    let afterSize = 0;

    try {
      // Get size before compaction
      const beforeMetrics = await this.getStorageMetrics(db);
      beforeSize = beforeMetrics.totalSize;

      // Run compaction with retries
      let lastError: Error | null = null;
      for (let retry = 0; retry < this.config.maxRetries; retry++) {
        try {
          await db.compact();
          
          // Wait for compaction to complete
          let isRunning = true;
          while (isRunning) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const info = await db.info();
            isRunning = info.compact_running || false;
          }

          // Compaction successful
          const afterMetrics = await this.getStorageMetrics(db);
          afterSize = afterMetrics.totalSize;
          
          return {
            success: true,
            beforeSize,
            afterSize,
            spaceSaved: beforeSize - afterSize,
            duration: Date.now() - startTime
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (retry < this.config.maxRetries - 1) {
            logger.warn(`Compaction attempt ${retry + 1} failed, retrying`, { 
              error: lastError.message,
              retryDelayMs: this.config.retryDelayMs
            });
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
          }
        }
      }

      // All retries failed
      return {
        success: false,
        beforeSize,
        afterSize: beforeSize,
        spaceSaved: 0,
        duration: Date.now() - startTime,
        error: lastError?.message || 'Unknown error'
      };
    } catch (error) {
      return {
        success: false,
        beforeSize,
        afterSize: beforeSize,
        spaceSaved: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.isCompacting = false;
    }
  }

  /**
   * Manual compaction trigger
   */
  async forceCompaction(): Promise<CompactionResult> {
    try {
      const { openLocalDB } = await import('./pouch');
      const db = await openLocalDB({ name: environment.eventStorePath });
      
      logger.info('Manual compaction triggered');
      const result = await this.compactDatabase(db);
      
      if (result.success) {
        this.lastCompaction = Date.now();
      }
      
      return result;
    } catch (error) {
      logger.error('Manual compaction failed', {}, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get current storage metrics
   */
  async getMetrics(): Promise<StorageMetrics | null> {
    try {
      const { openLocalDB } = await import('./pouch');
      const db = await openLocalDB({ name: environment.eventStorePath });
      return await this.getStorageMetrics(db);
    } catch (error) {
      logger.error('Failed to get storage metrics', {}, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Configure compaction settings
   */
  configure(newConfig: Partial<CompactionConfig>): void {
    const wasRunning = Boolean(this.intervalId);
    
    if (wasRunning) {
      this.stop();
    }
    
    this.config = { ...this.config, ...newConfig };
    
    if (wasRunning && this.config.enabled) {
      this.start();
    }

    logger.info('Compaction configuration updated', { ...this.config });
  }

  /**
   * Get current configuration
   */
  getConfig(): CompactionConfig {
    return { ...this.config };
  }

  /**
   * Check if compaction is currently running
   */
  isRunning(): boolean {
    return this.isCompacting;
  }
}

// Export singleton instance
export const compactionManager = new CompactionManager();

// React hook for monitoring storage metrics
export function useStorageMetrics() {
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const updateMetrics = async () => {
      try {
        const currentMetrics = await compactionManager.getMetrics();
        if (mounted) {
          setMetrics(currentMetrics);
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 60000); // Update every minute

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    metrics,
    loading,
    refresh: async () => {
      setLoading(true);
      const newMetrics = await compactionManager.getMetrics();
      setMetrics(newMetrics);
      setLoading(false);
    },
    forceCompaction: compactionManager.forceCompaction.bind(compactionManager)
  };
}
