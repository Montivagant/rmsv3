/**
 * User Management Types
 * 
 * Types for user accounts and authentication
 */

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface UserPreferences {
  defaultBranch: string;
  locale: 'en' | 'ar' | 'fr';
  timeZone: string;
  theme?: 'light' | 'dark';
  notificationsEnabled?: boolean;
  taxInclusivePricing?: boolean;
  enableLocalization?: boolean;
  enableTwoFactor?: boolean;
}

export interface UserMetadata {
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  loginCount?: number;
  createdBy: string;
  notes?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  status: UserStatus;
  roles: string[]; // Role IDs
  branchIds: string[]; // Associated branches
  metadata: UserMetadata;
  preferences: UserPreferences;
}

export interface UserFormData {
  email: string;
  name: string;
  phone?: string;
  status: User['status'];
  roles: string[];
  branchIds?: string[];
  password?: string; // Only for new users
}
