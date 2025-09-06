import { z } from 'zod';

// Simplified supplier form schema following the established pattern
export const supplierFormSchema = z.object({
  name: z.string()
    .min(2, 'Supplier name must be at least 2 characters')
    .max(80, 'Supplier name cannot exceed 80 characters')
    .trim(),
  
  code: z.string()
    .transform(val => val?.trim() || '')
    .refine(val => val === '' || (val.length >= 1 && val.length <= 16), 'Code must be 1-16 characters if provided')
    .refine(val => val === '' || /^[A-Z0-9_-]+$/i.test(val), 'Code can only contain letters, numbers, underscores, and hyphens')
    .transform(val => val.toUpperCase()),
  
  contactName: z.string()
    .transform(val => val?.trim() || '')
    .refine(val => val === '' || (val.length >= 2 && val.length <= 80), 'Contact name must be 2-80 characters if provided'),
  
  phone: z.string()
    .transform(val => val?.trim() || '')
    .refine(val => val === '' || /^\+[1-9]\d{1,14}$/.test(val), 'Phone must be in E.164 format (e.g., +201234567890) if provided'),
  
  primaryEmail: z.string()
    .transform(val => val?.trim() || '')
    .refine(val => val === '' || z.string().email().safeParse(val).success, 'Please enter a valid email address if provided'),
  
  additionalEmails: z.array(z.string())
    .default([])
    .refine((emails) => {
      // Validate each email in the array if any exist
      return emails.length === 0 || emails.every(email => z.string().email().safeParse(email).success);
    }, {
      message: 'All additional emails must be valid email addresses'
    })
});

export type SupplierFormData = z.infer<typeof supplierFormSchema>;

export interface SupplierFormErrors {
  name?: string;
  code?: string;
  contactName?: string;
  phone?: string;
  primaryEmail?: string;
  additionalEmails?: string;
  _form?: string; // General form errors
}

// Default form data
export function createDefaultSupplierFormData(): SupplierFormData {
  return {
    name: '',
    code: '',
    contactName: '',
    phone: '',
    primaryEmail: '',
    additionalEmails: []
  };
}

// Generate supplier code from name
export function generateSupplierCode(name: string, existingCodes: string[] = []): string {
  if (!name.trim()) return '';
  
  // Generate base code from name (first 3-4 letters + random suffix)
  const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const baseCode = cleanName.substring(0, Math.min(4, cleanName.length)) || 'SUP';
  
  // Add random 3-digit suffix
  let attempts = 0;
  let code = '';
  
  do {
    const suffix = Math.floor(100 + Math.random() * 900); // 3-digit number
    code = `${baseCode}${suffix}`;
    attempts++;
  } while (existingCodes.includes(code) && attempts < 10);
  
  return code;
}

// Validation function using Zod
export function validateSupplierForm(data: Partial<SupplierFormData>): {
  isValid: boolean;
  errors: SupplierFormErrors;
} {
  const result = supplierFormSchema.safeParse(data);
  
  if (result.success) {
    return { isValid: true, errors: {} };
  }
  
  const errors: SupplierFormErrors = {};
  
  result.error.issues.forEach((issue) => {
    const field = issue.path[0] as keyof SupplierFormErrors;
    if (field && field !== '_form') {
      errors[field] = issue.message;
    }
  });
  
  return { isValid: false, errors };
}

// Field labels and help text
export const SUPPLIER_FIELD_LABELS = {
  name: 'Supplier Name',
  code: 'Supplier Code',
  contactName: 'Contact Name',
  phone: 'Phone Number',
  primaryEmail: 'Primary Email',
  additionalEmails: 'Additional Emails'
} as const;

export const SUPPLIER_FIELD_HELP_TEXT = {
  name: 'The official name of the supplier company or individual',
  code: 'Optional unique identifier for integration purposes',
  contactName: 'Primary contact person at the supplier',
  phone: 'Include country code (e.g., +201234567890 for Egypt)',
  primaryEmail: 'Main email address for orders and communication',
  additionalEmails: 'Additional email addresses separated by commas or spaces'
} as const;
