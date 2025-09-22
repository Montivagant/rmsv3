// Utility barrel exports for clean imports
export * from './validation';
export * from './receipt';
export * from './image';
export * from './logger';

// Re-export from lib with explicit naming to avoid conflicts
export { 
  cn, 
  debounce, 
  throttle, 
  generateId, 
  isEmpty, 
  capitalize, 
  kebabCase, 
  camelCase, 
  truncate, 
  sleep, 
  isBrowser, 
  isDevelopment, 
  isProduction, 
  safeJsonParse, 
  safeJsonStringify, 
  get, 
  set, 
  deepClone,
  // Use lib/utils versions of format functions (more comprehensive)
  formatCurrency,
  formatDate,
  formatDateTime
} from '../lib/utils';

// Re-export commonly used validation utilities
export { validateEmail, validatePhone, formatPhone } from './validation';
