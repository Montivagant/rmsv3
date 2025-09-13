// Account Settings Data Models - Business Owner Interface
export interface Profile {
  name: string;
  phone: string;   // E.164 format, default +20
  email: string;   // May be immutable based on business rules
  loginPin?: string; // 4-6 digits
  language: 'en' | 'ar' | 'fr';
  avatar?: string; // URL or base64 data URI
}

export interface BusinessDetails {
  businessName: string;
  taxRegistrationName?: string;
  taxNumber?: string;
  country: string; // Default 'Egypt'
  currency: string; // Default 'EGP'
}

export interface Preferences {
  timeZone: string; // Default 'Africa/Cairo'
  taxInclusivePricing: boolean;
  enableLocalization: boolean;
  defaultBranchId?: string;
  locale?: string;
  enableTwoFactor: boolean; // May be stubbed if backend not ready
}

export type NotificationKey =
  | 'costAdjustmentSubmitted'
  | 'inventoryAuditSubmitted'
  | 'purchasingSubmitted'
  | 'quantityAdjustmentSubmitted'
  | 'incomingTransfer'
  | 'outgoingTransfer'
  | 'productionSubmitted'
  | 'inventoryNotAvailable'
  | 'purchaseOrderApproval'
  | 'maxQuantityReached'
  | 'minQuantityReached'
  | 'transferUnderReview'
  | 'transferWaitingReceive';

export type Notifications = Record<NotificationKey, boolean>;

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface GeneratePinResponse {
  pin: string;
}

// API Response types
export interface AccountResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Form state types
export interface FormState<T> {
  data: T;
  isDirty: boolean;
  isLoading: boolean;
  error?: string;
}

// Validation schemas (would use Zod in real implementation)
export interface ValidationError {
  field: string;
  message: string;
}

export interface AccountValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Notification configuration with labels
export interface NotificationConfig {
  key: NotificationKey;
  label: string;
  description?: string;
  category: 'inventory' | 'purchasing' | 'transfers' | 'alerts';
}

export const NOTIFICATION_CONFIGS: NotificationConfig[] = [
  {
    key: 'costAdjustmentSubmitted',
    label: 'Cost Adjustment Submitted',
    description: 'When inventory cost adjustments are submitted for approval',
    category: 'inventory'
  },
  {
    key: 'inventoryAuditSubmitted', 
    label: 'Inventory Audit Submitted',
    description: 'When physical inventory audits are completed',
    category: 'inventory'
  },
  {
    key: 'purchasingSubmitted',
    label: 'Purchase Orders Submitted',
    description: 'When purchase orders are submitted to suppliers',
    category: 'purchasing'
  },
  {
    key: 'quantityAdjustmentSubmitted',
    label: 'Quantity Adjustments Submitted',
    description: 'When inventory quantity adjustments are made',
    category: 'inventory'
  },
  {
    key: 'incomingTransfer',
    label: 'Incoming Transfers',
    description: 'When inventory transfers are received',
    category: 'transfers'
  },
  {
    key: 'outgoingTransfer',
    label: 'Outgoing Transfers',
    description: 'When inventory transfers are sent out',
    category: 'transfers'
  },
  {
    key: 'productionSubmitted',
    label: 'Production Orders Submitted',
    description: 'When production orders are created',
    category: 'inventory'
  },
  {
    key: 'inventoryNotAvailable',
    label: 'Inventory Not Available',
    description: 'When requested inventory items are out of stock',
    category: 'alerts'
  },
  {
    key: 'purchaseOrderApproval',
    label: 'Purchase Order Approvals',
    description: 'When purchase orders require approval',
    category: 'purchasing'
  },
  {
    key: 'maxQuantityReached',
    label: 'Maximum Quantity Reached',
    description: 'When inventory reaches maximum stock levels',
    category: 'alerts'
  },
  {
    key: 'minQuantityReached',
    label: 'Minimum Quantity Reached',
    description: 'When inventory reaches minimum stock levels',
    category: 'alerts'
  },
  {
    key: 'transferUnderReview',
    label: 'Transfers Under Review',
    description: 'When transfer requests need approval',
    category: 'transfers'
  },
  {
    key: 'transferWaitingReceive',
    label: 'Transfers Waiting to Receive',
    description: 'When transfers are pending receipt confirmation',
    category: 'transfers'
  }
];

// Time zone options
export interface TimeZoneOption {
  value: string;
  label: string;
  offset: string;
}

export const TIME_ZONES: TimeZoneOption[] = [
  { value: 'Africa/Cairo', label: 'Cairo (Egypt)', offset: 'UTC+2' },
  { value: 'Europe/London', label: 'London', offset: 'UTC+0' },
  { value: 'Europe/Paris', label: 'Paris', offset: 'UTC+1' },
  { value: 'Asia/Dubai', label: 'Dubai', offset: 'UTC+4' },
  { value: 'Asia/Riyadh', label: 'Riyadh', offset: 'UTC+3' },
  { value: 'America/New_York', label: 'New York', offset: 'UTC-5' },
  { value: 'America/Los_Angeles', label: 'Los Angeles', offset: 'UTC-8' }
];

// Language options
export interface LanguageOption {
  value: 'en' | 'ar' | 'fr';
  label: string;
  nativeLabel: string;
}

export const LANGUAGES: LanguageOption[] = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { value: 'fr', label: 'French', nativeLabel: 'Français' }
];

// Country and currency options
export interface CountryOption {
  value: string;
  label: string;
  code: string;
  currency: string;
}

export const COUNTRIES: CountryOption[] = [
  { value: 'Egypt', label: 'Egypt', code: 'EG', currency: 'EGP' },
  { value: 'Saudi Arabia', label: 'Saudi Arabia', code: 'SA', currency: 'SAR' },
  { value: 'UAE', label: 'United Arab Emirates', code: 'AE', currency: 'AED' },
  { value: 'Qatar', label: 'Qatar', code: 'QA', currency: 'QAR' },
  { value: 'Kuwait', label: 'Kuwait', code: 'KW', currency: 'KWD' }
];
