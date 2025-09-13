/**
 * Safe Console Logger
 * Provides safe logging methods that avoid React DevTools serialization issues
 */

// Safe object logging that won't crash React DevTools
export const logger = {
  info: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      if (data && typeof data === 'object') {
        try {
          console.log(`ℹ️ ${message}:`, JSON.stringify(data, null, 2));
        } catch {
          console.log(`ℹ️ ${message}: [Complex Object]`);
        }
      } else {
        console.log(`ℹ️ ${message}`, data || '');
      }
    }
  },

  error: (message: string, error?: any) => {
    if (import.meta.env.DEV) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
      console.error(`❌ ${message}: ${errorMessage}`);
    }
  },

  warn: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      if (data && typeof data === 'object') {
        try {
          console.warn(`⚠️ ${message}: ${JSON.stringify(data)}`);
        } catch {
          console.warn(`⚠️ ${message}: [Complex Object]`);
        }
      } else {
        console.warn(`⚠️ ${message}`, data || '');
      }
    }
  },

  debug: (message: string, data?: any) => {
    // Only log debug in development and when explicitly enabled
    if (import.meta.env.DEV && localStorage.getItem('rms_debug_logging') === 'true') {
      if (data && typeof data === 'object') {
        try {
          console.log(`🐛 ${message}:`, JSON.stringify(data, null, 2));
        } catch {
          console.log(`🐛 ${message}: [Complex Object]`);
        }
      } else {
        console.log(`🐛 ${message}`, data || '');
      }
    }
  },

  // Special method for safe event logging
  event: (eventType: string, eventId: string, details?: string) => {
    if (import.meta.env.DEV) {
      console.log(`📋 Event: ${eventType} (${eventId}) ${details || ''}`);
    }
  },

  // Special method for API logging  
  api: (method: string, url: string, status?: number) => {
    if (import.meta.env.DEV) {
      const statusText = status ? ` (${status})` : '';
      console.log(`🌐 API: ${method} ${url}${statusText}`);
    }
  }
};
