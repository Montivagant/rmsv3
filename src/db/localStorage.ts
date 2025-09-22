/**
 * LocalStorage-based persistence adapter
 * Provides PouchDB-compatible interface using browser localStorage
 * Safe fallback while PouchDB spark-md5 issue is resolved
 */

import type { Event } from '../events/types';

export interface LocalStorageAdapter {
  get(id: string): Promise<DBEvent | null>;
  put(doc: DBEvent): Promise<{ id: string; rev: string }>;
  allDocs(): Promise<{ rows: Array<{ doc: DBEvent }> }>;
  bulkDocs(docs: DBEvent[]): Promise<Array<{ id: string; rev: string }>>;
  destroy(): Promise<void>;
}

export interface DBEvent extends Event {
  _id: string;
  _rev: string;
  timestamp: number;
  aggregateId: string;
}

class LocalStorageDB implements LocalStorageAdapter {
  public readonly prefix: string;
  private revCounter: number;

  constructor(dbName: string) {
    this.prefix = `${dbName}_`;
    // Load revision counter from localStorage (support legacy key with extra underscore)
    const revKeyNew = `${this.prefix}rev_counter`;
    const revKeyLegacy = `${this.prefix}_rev_counter`;
    const storedRev = localStorage.getItem(revKeyNew) ?? localStorage.getItem(revKeyLegacy) ?? '0';
    this.revCounter = parseInt(storedRev);
  }

  private generateRev(): string {
    this.revCounter++;
    const revKeyNew = `${this.prefix}rev_counter`;
    const revKeyLegacy = `${this.prefix}_rev_counter`;
    localStorage.setItem(revKeyNew, this.revCounter.toString());
    // Clean up legacy key if present to avoid confusion
    if (localStorage.getItem(revKeyLegacy) !== null) {
      localStorage.removeItem(revKeyLegacy);
    }
    return `1-${this.revCounter.toString().padStart(8, '0')}`;
  }

  private getKey(id: string): string {
    return `${this.prefix}${id}`;
  }

  async get(id: string): Promise<DBEvent | null> {
    try {
      const data = localStorage.getItem(this.getKey(id));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('LocalStorage get error:', error);
      return null;
    }
  }

  async put(doc: DBEvent): Promise<{ id: string; rev: string }> {
    try {
      const docWithRev = {
        ...doc,
        _rev: this.generateRev()
      };
      localStorage.setItem(this.getKey(doc._id), JSON.stringify(docWithRev));
      return { id: doc._id, rev: docWithRev._rev };
    } catch (error) {
      console.error('LocalStorage put error:', error);
      throw new Error(`Failed to save document: ${error}`);
    }
  }

  async allDocs(): Promise<{ rows: Array<{ doc: DBEvent }> }> {
    try {
      const rows: Array<{ doc: DBEvent }> = [];
      
      // Debug: inspect localStorage for matching keys
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix) && !key.endsWith('rev_counter')) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const doc = JSON.parse(data);
              rows.push({ doc });
            } catch (parseError) {
              console.warn('Failed to parse document:', key, parseError);
            }
          }
        }
      }
      
      // Sort by sequence for consistent ordering
      rows.sort((a, b) => a.doc.seq - b.doc.seq);
      return { rows };
    } catch (error) {
      console.error('LocalStorage allDocs error:', error);
      return { rows: [] };
    }
  }

  async bulkDocs(docs: DBEvent[]): Promise<Array<{ id: string; rev: string }>> {
    const results: Array<{ id: string; rev: string }> = [];
    
    for (const doc of docs) {
      try {
        const result = await this.put(doc);
        results.push(result);
      } catch (error) {
        console.error('LocalStorage bulkDocs error for doc:', doc._id, error);
        // Continue with other docs even if one fails
      }
    }
    
    return results;
  }

  async destroy(): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('LocalStorage destroy error:', error);
      throw error;
    }
  }

  // Helper method to get storage usage info
  getStorageInfo(): { used: number; available: number; itemCount: number } {
    let totalSize = 0;
    let itemCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
          itemCount++;
        }
      }
    }
    
    // Rough estimate - localStorage is usually 5-10MB per origin
    const estimatedAvailable = 5 * 1024 * 1024; // 5MB estimate
    
    return {
      used: totalSize,
      available: Math.max(0, estimatedAvailable - totalSize),
      itemCount
    };
  }
}

export async function openLocalStorageDB(options: { name: string }): Promise<LocalStorageAdapter> {
  const db = new LocalStorageDB(options.name);
  
  // Test localStorage availability
  try {
    const testKey = `${options.name}_test`;
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    
    // Only log once per session to avoid React StrictMode duplicate messages
    if (!(globalThis as any).__RMS_LOCALSTORAGE_LOGGED) {
      // Development info: LocalStorage database opened successfully
      (globalThis as any).__RMS_LOCALSTORAGE_LOGGED = true;
    }
    
    return db;
  } catch (error) {
    console.error('LocalStorage not available:', error);
    throw new Error('LocalStorage is not available in this environment');
  }
}

// Export type for compatibility
export type LocalStorageDBAdapter = LocalStorageAdapter;
