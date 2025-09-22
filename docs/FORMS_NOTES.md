# Forms Architecture & Design Patterns

## Overview

This document outlines the patterns, decisions, and architecture for the system-wide forms revamp implemented for the RMS v3 application, starting with the simplified Inventory › Add Item form.

## Key Principles

### 1. **Shared Component Philosophy**
- ✅ **NO inline styles** - All styling uses design tokens and utility classes
- ✅ **NO hardcoded colors** - Theme-aware tokens ensure dark/light mode compatibility
- ✅ **Reusable primitives** - Modal, FormField, Input, Select, Button components
- ✅ **Consistent accessibility** - ARIA attributes, focus management, screen reader support

### 2. **Accessibility-First Design**
- 🔘 **Focus management** - Auto-focus on first field, tab trapping in modals
- 🎯 **ARIA compliance** - Proper labeling, error associations, live regions
- ⌨️ **Keyboard navigation** - Full keyboard accessibility for all interactions
- 🔊 **Screen reader support** - Descriptive labels and status announcements

### 3. **Dismissible Layer Pattern**
- 🖱️ **Outside click** - Modal/dropdowns close when clicking outside
- ⌨️ **Escape key** - Universal escape to close overlays
- 🧭 **Route changes** - Overlays auto-close on navigation
- 📱 **Touch-friendly** - Works on mobile devices

## Architecture

```
src/
├── schemas/
│   └── itemForm.ts           # Zod validation schema & types
├── lib/inventory/
│   └── mapItemForm.ts        # UI ↔ API data transformation
├── services/
│   └── inventory.items.ts    # API service layer
├── components/inventory/
│   └── InventoryItemCreateModal.tsx  # Main form component
└── __tests__/
    └── inventory-item-form.test.ts   # Comprehensive tests
```

## Component Design Patterns

### Form Schema (Zod + TypeScript)
```typescript
export const itemFormSchema = z.object({
  // Required fields with validation rules
  name: z.string()
    .min(1, 'Item name is required')
    .max(120, 'Item name cannot exceed 120 characters')
    .trim(),
    
  // Cross-field validation with custom refinements
}).refine((data) => {
  if (data.minimumLevel && data.maximumLevel) {
    return data.maximumLevel >= data.minimumLevel;
  }
  return true;
}, { message: 'Maximum must be >= minimum', path: ['maximumLevel'] });
```

### Data Transformation Layer
```typescript
// Decouple UI from API structure
export function mapFormDataToCreatePayload(formData: ItemFormData): CreateItemAPIPayload {
  return {
    name: formData.name.trim(),
    sku: formData.sku.toUpperCase(),
    uom: {
      base: formData.storageUnit,
      recipe: formData.ingredientUnit,
      conversions: [] // Simplified approach
    }
  };
}
```

### Modal Component Structure
```typescript
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Create Item"
  size="lg"
  closeOnOverlayClick={!hasUnsavedChanges}
>
  <form onSubmit={handleSubmit} className="space-y-6">
    {/* Two-column grid responsive design */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Input
        label="Name"
        required
        autoFocus
        error={errors.name}
        helpText="Descriptive name (max 120 chars)"
      />
    </div>
  </form>
</Modal>
```

## Business Rules Implementation

### Required Fields
- ✅ **Name** - Max 120 characters, trimmed
- ✅ **SKU** - 3-20 characters, alphanumeric + hyphens/underscores, auto-uppercased
- ✅ **Category** - Selected from API-provided options
- ✅ **Storage Unit** - Unit of measure for inventory counting
- ✅ **Ingredient Unit** - Unit of measure for recipe usage (NEW requirement)

### Optional Fields  
- 📦 **Barcode** - EAN-13/UPC validation, max 32 chars
- 💰 **Cost** - Non-negative currency, supplier cost per unit
- 📊 **Inventory Levels** - Min/Par/Max with cross-validation rules

### Removed Legacy Fields
- ❌ **Storage-to-Ingredient Conversion** - Complex UI removed per requirements
- ❌ **Costing Method Selection** - Always defaults to "AVERAGE" system-wide

## User Experience Enhancements

### Progressive Enhancement
1. **Auto-focus** - Cursor lands in Name field immediately
2. **Smart SKU generation** - Generate button creates unique SKU from name
3. **Real-time validation** - Errors clear as user types valid data
4. **Cross-field validation** - Level constraints checked dynamically

### Error Handling
```typescript
// Field-specific errors with ARIA announcements
{errors.name && (
  <p className="field-error" role="alert">
    {errors.name}
  </p>
)}

// Form-level errors for general issues  
{errors._form && (
  <div className="error-banner" role="alert">
    {errors._form}
  </div>
)}
```

### Loading States
- 🔄 **Form submission** - Button shows "Creating..." with spinner
- 📊 **Category/Unit loading** - Dropdowns show loading state
- 🔒 **Disabled state** - Form locked during API calls

## Testing Strategy

### Unit Tests
- ✅ Schema validation with Zod
- ✅ Data transformation accuracy  
- ✅ SKU generation uniqueness
- ✅ Cross-field validation rules

### Integration Tests
- ✅ Modal open/close behavior
- ✅ Form submission flow
- ✅ Success/error handling
- ✅ Keyboard navigation

### Accessibility Tests
- ✅ Screen reader compatibility
- ✅ Focus management
- ✅ ARIA attribute validation
- ✅ Color contrast compliance

## Performance Optimizations

### Code Splitting
- Modal component lazy-loaded
- Validation schema tree-shakeable
- Service layer modular imports

### Bundle Size
- Zod validation (lightweight)
- Shared component reuse
- Minimal external dependencies

## Migration Path

### Phase 1: Inventory Add Item ✅
- Simplified form with core fields
- Shared component integration
- Legacy field removal

### Phase 2: Other Forms (Future)
- Apply same patterns to Suppliers, Categories, etc.
- Reuse validation schemas and components
- Maintain consistency across forms

## Development Guidelines

### Adding New Forms
1. Create Zod schema in `schemas/`
2. Build data mapper in `lib/`
3. Create service in `services/`
4. Build component using shared primitives
5. Add comprehensive tests

### Form Field Requirements
- Use semantic HTML elements
- Include proper labels and help text
- Handle error states with ARIA
- Support keyboard navigation
- Respect theme tokens for styling

### Validation Best Practices
- Client-side validation for UX
- Server-side validation for security
- Clear, actionable error messages
- Progressive disclosure of errors

## Conclusion

This forms architecture provides a robust, accessible, and maintainable foundation for all form interfaces in the application. The simplified Inventory Add Item form serves as the reference implementation for future forms development.

The key success metrics:
- ✅ Zero inline styles or hardcoded colors
- ✅ Full keyboard accessibility
- ✅ Comprehensive test coverage
- ✅ Clean separation of concerns
- ✅ Reusable component patterns
