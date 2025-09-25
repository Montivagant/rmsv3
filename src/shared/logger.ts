/**
 * Centralized Logger for RMS v3
 * Production-ready logging with environment-aware output
 */

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
} as const;

type LogLevel = typeof LogLevel[keyof typeof LogLevel];

export { LogLevel };

// Helper function to get log level name
function getLogLevelName(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG: return 'DEBUG';
    case LogLevel.INFO: return 'INFO';
    case LogLevel.WARN: return 'WARN';
    case LogLevel.ERROR: return 'ERROR';
    case LogLevel.NONE: return 'NONE';
    default: return 'UNKNOWN';
  }
}

export interface LogContext {
  component?: string;
  userId?: string;
  action?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
    
    // Set log level based on environment
    if (this.isDevelopment) {
      this.logLevel = LogLevel.DEBUG;
    } else {
      this.logLevel = LogLevel.INFO;
    }

    // Override with environment variable if provided
    const envLogLevel = import.meta.env.VITE_LOG_LEVEL;
    if (envLogLevel) {
      const level = LogLevel[envLogLevel.toUpperCase() as keyof typeof LogLevel];
      if (level !== undefined) {
        this.logLevel = level;
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const levelStr = getLogLevelName(level).padEnd(5);
    
    let formatted = `[${timestamp}] ${levelStr} ${message}`;
    
    if (context) {
      const contextStr = Object.entries(context)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');
      
      if (contextStr) {
        formatted += ` {${contextStr}}`;
      }
    }

    return formatted;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...(error && { error }),
    };

    // In development, use console with colors and better formatting
    if (this.isDevelopment) {
      const formatted = this.formatMessage(level, message, context);
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug('%c🔍 ' + formatted, 'color: #888');
          break;
        case LogLevel.INFO:
          console.info('%c📘 ' + formatted, 'color: #007acc');
          break;
        case LogLevel.WARN:
          console.warn('%c⚠️ ' + formatted, 'color: #ff8800');
          if (error) console.warn(error);
          break;
        case LogLevel.ERROR:
          console.error('%c❌ ' + formatted, 'color: #cc0000');
          if (error) console.error(error);
          break;
      }
      return;
    }

    // In production, use structured logging
    if (this.isProduction) {
      // Send to external logging service (e.g., DataDog, LogRocket, Sentry)
      this.sendToExternalLogger(entry);
    }

    // Always log errors to console in production for debugging
    if (level >= LogLevel.ERROR) {
      console.error(this.formatMessage(level, message, context));
      if (error) console.error(error);
    }
  }

  private sendToExternalLogger(entry: LogEntry): void {
    // In a real application, integrate with services like:
    // - Sentry for error tracking
    // - DataDog for log aggregation
    // - LogRocket for session replay
    
    // For now, store in a simple queue that could be synced
    if (typeof window !== 'undefined') {
      const logs = JSON.parse(localStorage.getItem('rms_logs') || '[]');
      logs.push(entry);
      
      // Keep only last 100 entries to prevent storage bloat
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('rms_logs', JSON.stringify(logs));
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  // Specialized logging methods for common patterns
  
  performance(action: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${action}`, { 
      ...context, 
      action, 
      duration: Math.round(duration * 100) / 100 
    });
  }

  api(method: string, url: string, status: number, duration?: number): void {
    const level = status >= 400 ? LogLevel.ERROR : status >= 300 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `API ${method} ${url}`, { 
      method, 
      url, 
      status,
      ...(duration && { duration: Math.round(duration * 100) / 100 })
    });
  }

  event(eventType: string, context?: LogContext): void {
    this.debug(`Event: ${eventType}`, { ...context, eventType });
  }

  user(action: string, userId?: string, context?: LogContext): void {
    this.info(`User: ${action}`, { 
      ...context, 
      action, 
      ...(userId && { userId })
    });
  }

  security(message: string, context?: LogContext, error?: Error): void {
    // Security events are always logged regardless of log level
    console.warn(`[SECURITY] ${message}`, context);
    this.log(LogLevel.WARN, `SECURITY: ${message}`, context, error);
  }

  // Get stored logs for debugging
  getLogs(): LogEntry[] {
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem('rms_logs') || '[]');
  }

  // Clear stored logs
  clearLogs(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rms_logs');
    }
  }

  // Set log level at runtime
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info('Log level changed', { newLevel: getLogLevelName(level) });
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  performance: logger.performance.bind(logger),
  api: logger.api.bind(logger),
  event: logger.event.bind(logger),
  user: logger.user.bind(logger),
  security: logger.security.bind(logger),
};

// Development helper - disable console methods in production
if (import.meta.env.PROD) {
  // Replace console methods with logger in production
  const originalConsole = { ...console };
  
  console.log = (...args: unknown[]) => {
    logger.info(args.join(' '));
  };
  
  console.info = (...args: unknown[]) => {
    logger.info(args.join(' '));
  };
  
  console.warn = (...args: unknown[]) => {
    logger.warn(args.join(' '));
  };
  
  console.error = (...args: unknown[]) => {
    logger.error(args.join(' '));
  };

  // Keep debug available for development tools
  console.debug = originalConsole.debug;
}
