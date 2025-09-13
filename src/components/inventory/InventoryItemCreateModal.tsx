/**
 * Simplified Inventory Item Create Modal
 * 
 * A focused, accessible form for adding new inventory items.
 * Uses shared primitives and follows the streamlined requirements.
 */

import { useState, useCallback, useEffect } from 'react';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Select } from '../Select';
import { Button } from '../Button';
import { useToast } from '../../hooks/useToast';
import { useApi } from '../../hooks/useApi';
import { useDismissableLayer } from '../../hooks/useDismissableLayer';
import type { ItemFormData, ItemFormErrors } from '../../schemas/itemForm';
import { 
  validateItemForm, 
  createDefaultFormData, 
  generateSKU,
  FIELD_LABELS,
  FIELD_HELP_TEXT 
} from '../../schemas/itemForm';
import { mapFormToAPI } from '../../lib/inventory/mapItemForm';

// API types for options
interface CategoryOption {
  id: string;
  name: string;
  description?: string;
}

interface UnitOption {
  id: string;
  name: string;
  abbreviation: string;
}

interface InventoryItemCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (itemId: string) => void;
  categories?: CategoryOption[];
  units?: UnitOption[];
  existingSKUs?: string[];
  isLoading?: boolean;
}

export default function InventoryItemCreateModal({
  isOpen,
  onClose,
  onSuccess,
  categories = [],
  units = [],
  existingSKUs = [],
  isLoading = false,
}: InventoryItemCreateModalProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<ItemFormData>>(createDefaultFormData());
  const [errors, setErrors] = useState<ItemFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Hooks
  const { showToast } = useToast();

  // Remote data for dropdowns and SKU list (align with tests)
  const { data: remoteCategories, loading: loadingCategories, error: errorCategories } = useApi<any[]>('/api/inventory/categories', [] as any);
  const { data: remoteUnits, loading: loadingUnits, error: errorUnits } = useApi<any[]>('/api/inventory/units', [] as any);
  const { data: remoteSkus, loading: loadingSkus, error: errorSkus } = useApi<any>('/api/inventory/items?fields=sku', { items: [] } as any);

  const allCategories = (remoteCategories || categories) as any[];
  const allUnits = (remoteUnits || units) as any[];
  const takenSkus: string[] = (remoteSkus?.items || existingSKUs || []).map((r: any) => (r?.sku || '').toUpperCase()).filter(Boolean);

  const loadingAny = isLoading || loadingCategories || loadingUnits || loadingSkus;
  const errorToString = (err: any): string => {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (typeof err.message === 'string') return err.message;
    try { return JSON.stringify(err); } catch { return String(err); }
  };
  const loadErrors: string[] = [errorCategories, errorUnits, errorSkus].filter(Boolean).map(errorToString);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(createDefaultFormData());
      setErrors({});
      setHasUnsavedChanges(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Auto-select sensible defaults once data loads
  useEffect(() => {
    if (!isOpen) return;
    setFormData(prev => {
      const next = { ...prev } as any;
      if (!next.categoryId && (allCategories?.length ?? 0) > 0) {
        next.categoryId = allCategories[0]?.id || '';
      }
      const firstUnit = allUnits && allUnits[0]?.id;
      if (firstUnit) {
        if (!next.storageUnitId) next.storageUnitId = firstUnit;
        if (!next.ingredientUnitId) next.ingredientUnitId = firstUnit;
        if (!next.storageUnit) next.storageUnit = firstUnit;
        if (!next.ingredientUnit) next.ingredientUnit = firstUnit;
      }
      return next;
    });
  }, [isOpen, allCategories, allUnits]);

  // Handle field changes
  const handleFieldChange = useCallback((field: keyof ItemFormData, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
    
    setHasUnsavedChanges(true);
  }, [errors]);

  // Generate unique SKU
  const handleGenerateSKU = useCallback(() => {
    if (!formData.name) {
      setErrors(prev => ({ ...prev, name: 'Enter an item name first' }));
      showToast('Enter an item name first', 'warning');
      return;
    }
    
    const newSKU = generateSKU(formData.name, 'ITM', takenSkus);
    handleFieldChange('sku', newSKU);
    showToast('SKU generated successfully', 'success');
  }, [formData.name, takenSkus, handleFieldChange, showToast]);


  // Form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare effective form with fallbacks for missing required selects to avoid race conditions
    const effectiveForm: any = { ...(formData as any) };
    if (!effectiveForm.categoryId && (allCategories?.length ?? 0) > 0) {
      effectiveForm.categoryId = allCategories[0]?.id || '';
    }
    const firstUnit = allUnits && allUnits[0]?.id;
    if (firstUnit) {
      if (!effectiveForm.storageUnitId) effectiveForm.storageUnitId = firstUnit;
      if (!effectiveForm.ingredientUnitId) effectiveForm.ingredientUnitId = firstUnit;
      if (!effectiveForm.storageUnit) effectiveForm.storageUnit = firstUnit;
      if (!effectiveForm.ingredientUnit) effectiveForm.ingredientUnit = firstUnit;
    }

    // Validate form
    const validation = validateItemForm(effectiveForm);
    if (!validation.isValid) {
      setErrors(validation.errors);
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    // Client-side uniqueness check to provide immediate feedback
    if (effectiveForm.sku && takenSkus.includes(String(effectiveForm.sku).toUpperCase())) {
      setErrors(prev => ({ ...prev, sku: 'This SKU already exists. Please use a different one.' }));
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Transform to API payload
      const payload = mapFormToAPI(effectiveForm as ItemFormData);
      
      // Call API (this would be replaced with actual API call)
      const response = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create item');
      }

      const result = await response.json();
      
      // Success handling
      showToast('Item created successfully!', 'success');
      if (onSuccess) onSuccess(result.id);
      onClose();
      
    } catch (error) {
      console.error('Create item error:', error);
      const message = error instanceof Error ? error.message : 'Failed to create item';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, showToast, onSuccess, onClose, allCategories, allUnits, takenSkus]);

  // Check if form is valid for save button - using proper validation
  const validation = validateItemForm(formData);
  const isSchemaValid = validation.isValid;
  const isFormValid = isSchemaValid && Object.keys(errors).filter(key => key !== '_form').length === 0;

  const categoryOptions = (allCategories || []).map(cat => ({
    value: cat.id,
    label: cat.description ? `${cat.name} - ${cat.description}` : cat.name
  }));

  const unitOptions = (allUnits || []).map(unit => ({
    value: unit.id,
    label: `${unit.name} (${unit.abbreviation})`
  }));
  // Removed unused item type options to avoid ReferenceError; add when item types are supported in this modal

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Item"
      description="Create an item with just the essential information"
      size="lg"
      closeOnOverlayClick={!hasUnsavedChanges}
      closeOnEscape={!hasUnsavedChanges}
    >
      {loadingAny ? (
        <div className="p-6 text-sm">Loading form data...</div>
      ) : loadErrors.length > 0 ? (
        <div className="p-6">
          <div className="p-3 rounded-lg bg-error-surface border border-error text-error-text text-sm" role="alert" aria-live="polite">
            Failed to load form data
          </div>
          {loadErrors.map((err, idx) => (
            <p key={idx} className="mt-2 text-sm text-text-secondary">{err}</p>
          ))}
        </div>
      ) : (
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Simplified form - single column layout */}
        <div className="space-y-6">
          {/* Required Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Required Information</h3>
            
            {/* Name - Required */}
            <Input
              id="item-name"
              label={FIELD_LABELS.name}
              value={formData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              error={errors.name}
              helpText={FIELD_HELP_TEXT.name}
              required
              disabled={isSubmitting}
              placeholder="e.g., Organic Tomatoes"
              maxLength={120}
              autoFocus
            />

            {/* SKU - Required with Generate button */}
            <div className="space-y-2">
              <Input
                id="item-sku"
                label={FIELD_LABELS.sku}
                value={formData.sku || ''}
                onChange={(e) => handleFieldChange('sku', e.target.value.toUpperCase())}
                error={errors.sku}
                helpText={FIELD_HELP_TEXT.sku}
                required
                disabled={isSubmitting}
                placeholder="e.g., ITM-TOMA1234"
                maxLength={20}
                rightIcon={
                  <Button
                    type="button"
                    variant="ghost" 
                    size="sm"
                    onClick={handleGenerateSKU}
                    disabled={isSubmitting}
                    className="text-xs"
                  >
                    Generate
                  </Button>
                }
              />
            </div>

            {/* Unit - Required */}
            <Select
              id="item-unit"
              label={FIELD_LABELS.unit}
              value={(formData.storageUnitId as string) || ''}
              onChange={(e) => {
                const val = e.target.value;
                handleFieldChange('storageUnitId', val);
                handleFieldChange('ingredientUnitId', val);
                // maintain legacy mirrors for mapping
                handleFieldChange('storageUnit', val as any);
                handleFieldChange('ingredientUnit', val as any);
              }}
              options={unitOptions}
              error={errors.unit}
              helpText={FIELD_HELP_TEXT.unit}
              disabled={isSubmitting || isLoading}
              placeholder="Select unit (e.g., each, kg, liter)"
            />
          </div>

          {/* Optional fields */}
          <div className="border-t border-border pt-6 space-y-4">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Optional Information</h3>
            
            {/* Category - Optional */}
            <Select
              id="item-category"
              label={FIELD_LABELS.categoryId}
              value={formData.categoryId || ''}
              onChange={(e) => handleFieldChange('categoryId', e.target.value)}
              options={categoryOptions}
              error={errors.categoryId}
              helpText={FIELD_HELP_TEXT.categoryId}
              disabled={isSubmitting || isLoading}
              placeholder="Select category (optional)"
            />

            {/* Two-column layout for quantity and cost */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quantity - Optional */}
              <Input
                id="item-quantity"
                label={FIELD_LABELS.quantity}
                type="number"
                value={formData.quantity?.toString() || ''}
                onChange={(e) => handleFieldChange('quantity', e.target.value ? parseFloat(e.target.value) : undefined)}
                error={errors.quantity}
                helpText={FIELD_HELP_TEXT.quantity}
                disabled={isSubmitting}
                placeholder="0"
                min={0}
                step={0.01}
              />

              {/* Cost - Optional */}
              <Input
                id="item-cost"
                label={FIELD_LABELS.cost}
                type="number"
                value={formData.cost?.toString() || ''}
                onChange={(e) => handleFieldChange('cost', e.target.value ? parseFloat(e.target.value) : undefined)}
                error={errors.cost}
                helpText={FIELD_HELP_TEXT.cost}
                disabled={isSubmitting}
                placeholder="0.00"
                min={0}
                step={0.01}
              />
            </div>

            {/* Levels - Optional but validated against each other */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="item-minimum-level"
                label="Minimum Level"
                type="number"
                value={formData.minimumLevel?.toString() || ''}
                onChange={(e) => handleFieldChange('minimumLevel', e.target.value ? parseFloat(e.target.value) : undefined)}
                error={errors.minimumLevel}
                disabled={isSubmitting}
                placeholder="0"
                min={0}
                step={1}
              />
              <Input
                id="item-maximum-level"
                label="Maximum Level"
                type="number"
                value={formData.maximumLevel?.toString() || ''}
                onChange={(e) => handleFieldChange('maximumLevel', e.target.value ? parseFloat(e.target.value) : undefined)}
                error={errors.maximumLevel}
                disabled={isSubmitting}
                placeholder="0"
                min={0}
                step={1}
              />
            </div>
          </div>
        </div>

        {/* Form Error */}
        {errors._form && (
          <div className="p-3 rounded-lg bg-error-surface border border-error text-error-text text-sm" role="alert" aria-live="polite">
            {errors._form}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (hasUnsavedChanges) {
                if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) return;
              }
              onClose();
            }}
            disabled={isSubmitting}
          >
            Close
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Save'}
          </Button>
        </div>
      </form>
      )}
    </Modal>
  );
}
