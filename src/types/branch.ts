/**
 * Branch/Location Management Types
 * 
 * Types for managing restaurant branches and locations
 */

export interface Branch {
  id: string;
  name: string;
  isMain: boolean;
  type: 'restaurant' | 'warehouse' | 'commissary' | 'other';
  address: {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    manager?: string;
  };
  storageAreas: string[];
  isActive: boolean;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    itemCount?: number;
    employeeCount?: number;
  };
}

export interface BranchFormData {
  name: string;
  isMain?: boolean;
  type: Branch['type'];
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  email?: string;
  manager?: string;
  storageAreas: string[];
  isActive?: boolean;
}
