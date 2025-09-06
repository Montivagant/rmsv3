import type { SupplierFormData } from '../../schemas/supplierForm';

// API payload interface for creating suppliers
export interface CreateSupplierAPIPayload {
  name: string;
  code?: string;
  contactName?: string;
  phone?: string; // E.164 format
  primaryEmail?: string;
  additionalEmails?: string[];
}

// API response interface (simplified from the full Supplier interface)
export interface SupplierAPIResponse {
  id: string;
  name: string;
  code?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  // ... other fields that aren't part of the creation form
}

/**
 * Transform UI form data to API creation payload
 */
export function mapSupplierFormToCreatePayload(formData: SupplierFormData): CreateSupplierAPIPayload {
  const payload: CreateSupplierAPIPayload = {
    name: formData.name.trim()
  };

  // Add optional fields only if they have values
  if (formData.code && formData.code.trim()) {
    payload.code = formData.code.trim().toUpperCase();
  }

  if (formData.contactName && formData.contactName.trim()) {
    payload.contactName = formData.contactName.trim();
  }

  if (formData.phone && formData.phone.trim()) {
    payload.phone = formData.phone.trim();
  }

  if (formData.primaryEmail && formData.primaryEmail.trim()) {
    payload.primaryEmail = formData.primaryEmail.trim().toLowerCase();
  }

  if (formData.additionalEmails && formData.additionalEmails.length > 0) {
    payload.additionalEmails = formData.additionalEmails
      .filter(email => email.trim())
      .map(email => email.trim().toLowerCase());
  }

  return payload;
}

/**
 * Transform API response data to UI form data (for editing)
 */
export function mapSupplierAPIToForm(apiData: SupplierAPIResponse): Partial<SupplierFormData> {
  return {
    name: apiData.name,
    code: apiData.code || '',
    contactName: apiData.contactPerson || '',
    phone: apiData.phone || '',
    primaryEmail: apiData.email || '',
    additionalEmails: [] // Additional emails not in simplified API response
  };
}
