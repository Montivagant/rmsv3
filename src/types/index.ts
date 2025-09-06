// Common type exports

// Re-export from various domain modules
export type { BusinessType, SignupInput, SignupResponse } from '../api/auth';
export type { CustomerStatus } from '../customers/types';
export type { Recipe, RecipeScale } from '../recipes/types';
export type { User, Role } from '../rbac/roles';

// Common utility types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  suggestions?: string[];
}
