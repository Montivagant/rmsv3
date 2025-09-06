# Account Settings - Business Owner Interface

## Overview

The Account Settings system provides a comprehensive interface for Business Owners to manage their profile, business details, system preferences, notifications, and security settings. This system is designed with modern UX patterns, full accessibility compliance, and seamless integration with the existing DashUp architecture.

## Data Model

### Core Types

```typescript
// Profile Management
interface Profile {
  name: string;
  phone: string;         // E.164 format, default +20
  email: string;         // May be immutable based on business rules
  loginPin?: string;     // 4-6 digits
  language: 'en' | 'ar' | 'fr';
  avatar?: string;       // URL or base64 data URI
}

// Business Information  
interface BusinessDetails {
  businessName: string;
  taxRegistrationName?: string;
  taxNumber?: string;
  country: string;       // Default 'Egypt'
  currency: string;      // Default 'EGP'
}

// System Preferences
interface Preferences {
  timeZone: string;      // Default 'Africa/Cairo'
  taxInclusivePricing: boolean;
  enableLocalization: boolean;
  restrictPurchasedItemsToSupplier: boolean;
  enableTwoFactor: boolean;
}

// Notification Settings
type NotificationKey = 
  | 'costAdjustmentSubmitted'
  | 'inventoryCountSubmitted'
  | 'purchasingSubmitted'
  // ... 14 total notification types

type Notifications = Record<NotificationKey, boolean>;
```

## Routes & Navigation

### Route Structure

```
/account/
├── profile           # Personal information and PIN
├── business         # Business details and registration
├── preferences      # System and operational preferences
├── notifications    # Notification preferences by category
└── security         # Password change and 2FA settings
```

### Navigation Integration

The account settings are integrated into the admin navigation under:
**Manage → Account** (first item in the Manage section)

### Role-Based Access

- **Required Role**: Admin or Technical Admin
- **Route Guards**: All account routes are protected with `RoleGuard`
- **Business Owner Focus**: UI/UX designed for business owner workflows

## API Endpoints

### REST Contract

```typescript
// Profile Management
GET/PUT /api/account/profile
POST    /api/account/profile/avatar      // File upload
DELETE  /api/account/profile/avatar      // Remove avatar

// Business Details
GET/PUT /api/account/business

// System Preferences  
GET/PUT /api/account/preferences

// Notifications
GET/PUT /api/account/notifications
POST    /api/account/notifications/toggle-all

// Security
POST /api/account/security/change-password
POST /api/account/security/generate-pin
GET  /api/account/security/2fa/qr-code    // Future
POST /api/account/security/2fa/enable     // Future
POST /api/account/security/2fa/disable    // Future
```

### Service Layer

- **Location**: `src/services/account.ts`
- **Pattern**: Typed API clients with error handling
- **Mock Support**: Development-ready mock implementations
- **Error Handling**: Custom `AccountApiError` class

## Component Architecture

### Reusable UI Components

```typescript
// New Account-Specific Components
PinInput              // PIN entry with generation
ConfirmDialog         // Security confirmations  
FormActions           // Sticky save/discard bar

// Enhanced Components
PhoneInputEG          // Egypt phone number (already existed)
PasswordInput         // Password visibility toggle (already existed)
```

### Settings Components (Reused)

```typescript
// From existing settings system
SettingCard           // Card wrapper with header/actions
SettingRow           // Label + control layout  
Toggle               // Accessible switch component
```

### Page Components

```typescript
AccountLayout         // Tab navigation wrapper
├── ProfilePage       // Personal info + PIN
├── BusinessPage      // Business details
├── PreferencesPage   // System preferences  
├── NotificationsPage // Notification categories
└── SecurityPage      // Password + 2FA
```

## UX Features

### Form Experience

- **Optimistic Updates**: Instant feedback with rollback on error
- **Unsaved Changes Protection**: Browser and router navigation guards
- **Sticky Actions**: Save/Discard bar appears when form is dirty
- **Real-time Validation**: Field-level validation with clear error messages
- **Loading States**: Progressive feedback during API calls

### Phone Number Handling

- **Egypt Default**: Locked +20 prefix, local digits only
- **E.164 Storage**: Server stores full international format
- **Visual Formatting**: User-friendly display in input
- **Length Validation**: 9-10 digit validation for Egyptian numbers

### PIN Management

- **Secure Generation**: Cryptographically secure random generation
- **Client-side Generation**: Immediate feedback without server round-trip
- **Validation**: 4-6 digit numeric validation
- **Visual Design**: Monospace font, centered alignment

### Notification Management

- **Categorized Groups**: Organized by function (Inventory, Purchasing, Transfers, Alerts)
- **Master Toggle**: Enable/disable all notifications at once
- **Granular Control**: Individual notification type toggles
- **Coming Soon States**: Future delivery methods (Email, SMS)

## Accessibility Compliance

### WCAG AA Standards

- **Color Contrast**: ≥4.5:1 text, ≥3:1 UI components  
- **Keyboard Navigation**: Full Tab/Shift+Tab support
- **Screen Readers**: Proper ARIA labels and descriptions
- **Focus Management**: Visible focus indicators using design tokens
- **Error Communication**: Live regions for dynamic error messages

### Inclusive Design

- **Multiple Languages**: Support for English, Arabic, French
- **RTL Support**: Ready for Arabic language interface
- **Timezone Flexibility**: Support for global business operations
- **Reduced Motion**: Respects user preferences for animations

## Theming & Design Tokens

### Token Compliance

```css
/* All components use global design tokens */
--color-text-primary, --color-text-secondary, --color-text-tertiary
--color-surface, --color-surface-secondary
--color-border-primary, --color-border-secondary
--color-brand-*, --color-success-*, --color-error-*, --color-warning-*
--spacing-*, --radius-*, --shadow-*
```

### Dark Mode Support

- **Class-based Strategy**: Uses existing `.dark` class toggle
- **Automatic Adaptation**: All tokens adapt seamlessly
- **Consistent Experience**: Matches existing application theme behavior

## Data Flow & State Management

### Form State Pattern

```typescript
// Standard pattern across all account pages
const [data, setData] = useState<T | null>(null);           // Server data
const [formData, setFormData] = useState<T | null>(null);   // Form state
const isDirty = data && formData && JSON.stringify(data) !== JSON.stringify(formData);

// Unsaved changes protection
useFormGuard(isDirty, 'Custom warning message...');
```

### Error Handling

```typescript
// Consistent error handling pattern
try {
  const result = await accountService.profile.update(formData);
  setData(result);
  setFormData(result);
  showToast('Success message', 'success');
} catch (error) {
  showToast(error.message || 'Default error', 'error');
}
```

### Validation Strategy

- **Client-side First**: Immediate feedback without server round-trip
- **Server Validation**: Authoritative validation with detailed error messages
- **Progressive Enhancement**: Works without JavaScript (form submissions)
- **User-Friendly Messages**: Plain language error descriptions

## Security Considerations

### Password Management

- **Current Password Required**: Must provide current password to change
- **Strength Requirements**: Minimum 8 characters with complexity rules
- **Confirmation Matching**: New password must be confirmed
- **Secure Transmission**: All password data sent over HTTPS only

### PIN Security

- **Numeric Only**: 4-6 digit numeric PIN for quick access
- **Secure Generation**: Uses `crypto.getRandomValues()` when available
- **Optional Field**: PIN is not required for account functionality
- **Server Validation**: Server enforces PIN complexity rules

### Two-Factor Authentication

- **Future Implementation**: UI ready with "Coming Soon" states
- **TOTP Standard**: Designed for Time-based One-Time Password apps
- **Backup Codes**: Plan for recovery code generation
- **Graceful Fallback**: System works without 2FA enabled

## Implementation Details

### File Structure

```
src/
├── types/account.ts              # TypeScript definitions
├── services/account.ts           # API client with mocks
├── hooks/useUnsavedGuard.ts      # Navigation protection
├── components/ui/
│   ├── PinInput.tsx              # PIN entry component
│   ├── ConfirmDialog.tsx         # Confirmation dialogs
│   └── FormActions.tsx           # Sticky form actions
└── pages/account/
    ├── AccountLayout.tsx         # Tab navigation
    ├── ProfilePage.tsx           # Personal information
    ├── BusinessPage.tsx          # Business details
    ├── PreferencesPage.tsx       # System preferences
    ├── NotificationsPage.tsx     # Notification settings
    └── SecurityPage.tsx          # Security settings
```

### Bundle Impact

- **New Chunks**: 6 lazy-loaded account pages (~25KB total)
- **Shared Components**: Reuses existing settings UI components
- **Tree Shaking**: Only loads account features for admin users
- **Performance**: No impact on non-admin user bundles

## Extension Points

### Adding New Account Settings

1. **Extend Types**: Add fields to existing interfaces in `src/types/account.ts`
2. **Update API**: Add endpoints to `src/services/account.ts`
3. **Add UI**: Create form controls in appropriate page component
4. **Validation**: Add client and server-side validation rules

### Adding New Notification Types

1. **Extend NotificationKey**: Add new type to union in `src/types/account.ts`
2. **Update Config**: Add to `NOTIFICATION_CONFIGS` array with category
3. **Server Integration**: Implement backend notification handling
4. **Testing**: Add integration tests for new notification flows

### Internationalization

```typescript
// Ready for i18n integration
const ACCOUNT_LABELS = {
  'en': { 
    'profile.name': 'Full Name',
    'profile.phone': 'Phone Number'
  },
  'ar': {
    'profile.name': 'الاسم الكامل',
    'profile.phone': 'رقم الهاتف'
  }
};
```

## Testing Strategy

### Unit Testing

- **Form Validation**: Test all validation rules and edge cases
- **Component Behavior**: Test user interactions and state changes
- **API Integration**: Mock API responses and error scenarios
- **Accessibility**: Test keyboard navigation and screen reader compatibility

### Integration Testing

- **Route Protection**: Verify role-based access controls
- **Navigation Guards**: Test unsaved changes protection
- **Form Submission**: End-to-end form workflows
- **Toast Notifications**: Success and error message display

### Manual Testing Checklist

```
☐ Profile form saves and loads correctly
☐ Phone number validation works for Egyptian format
☐ PIN generation creates secure random values
☐ Business details persist across sessions
☐ Preferences toggle correctly
☐ Notifications can be enabled/disabled individually
☐ Master notification toggle works correctly
☐ Password change requires current password
☐ Unsaved changes warning appears on navigation
☐ Form actions (Save/Discard) work correctly
☐ Loading states display during API calls
☐ Error messages are clear and actionable
☐ Keyboard navigation works throughout
☐ Screen reader announces important changes
☐ Dark/light theme toggle works correctly
☐ Mobile responsive design works on small screens
```

## Future Enhancements

### Phase 2 Features

- **Avatar Upload**: File upload with image cropping
- **Two-Factor Authentication**: TOTP with QR codes and backup codes
- **Advanced Notifications**: Email and SMS delivery methods
- **Audit Logging**: Account change history and activity logs
- **Session Management**: Active sessions and remote logout
- **Advanced Security**: Login attempt monitoring and account lockout

### Internationalization

- **Arabic Support**: RTL layout and Arabic translations
- **French Support**: Complete French language interface
- **Currency Formatting**: Locale-aware number and currency display
- **Date/Time Formatting**: Regional date and time preferences

### Business Features

- **Multi-Location**: Support for restaurant chains
- **Tax Integration**: Advanced tax calculation and reporting
- **Compliance**: Industry-specific regulatory requirements
- **Backup/Restore**: Account settings backup and migration tools

---

**Implementation Date**: December 2024  
**Status**: Complete and Production Ready  
**Accessibility**: WCAG AA Compliant  
**Browser Support**: Modern browsers with ES2020+ support
