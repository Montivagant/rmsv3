/**
 * Simple logger implementation for production builds
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, unknown>;

interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
}

// Simple no-op logger that doesn't use window.console
class SimpleLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

// Export singleton logger instance
export const logger = new SimpleLogger();

// Export types for use in other modules
export type { Logger, LogLevel, LogContext };

// Helper functions for migration from console.*
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  
  // Legacy console replacements
  console: {
    log: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  }
};
