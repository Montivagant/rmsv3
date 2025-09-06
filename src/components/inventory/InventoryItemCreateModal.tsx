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
import { useDismissableLayer } from '../../hooks/useDismissableLayer';
import type { ItemFormData, ItemFormErrors } from '../../schemas/itemForm';
import { 
  validateItemForm, 
  createDefaultFormData, 
  generateSKU,
  validateBarcode,
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
  const { showSuccess, showError } = useToast();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(createDefaultFormData());
      setErrors({});
      setHasUnsavedChanges(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

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
      setErrors(prev => ({ ...prev, name: 'Please enter an item name first' }));
      return;
    }
    
    const newSKU = generateSKU(formData.name, 'ITM', existingSKUs);
    handleFieldChange('sku', newSKU);
  }, [formData.name, existingSKUs, handleFieldChange]);

  // Validate barcode on blur
  const handleBarcodeBlur = useCallback((value: string) => {
    if (!value) return;
    
    const validation = validateBarcode(value);
    if (!validation.isValid && validation.message) {
      setErrors(prev => ({ ...prev, barcode: validation.message }));
    }
  }, []);

  // Form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateItemForm(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Check SKU uniqueness
    if (formData.sku && existingSKUs.includes(formData.sku.toUpperCase())) {
      setErrors({ sku: 'This SKU already exists. Please use a different one.' });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Transform to API payload
      const payload = mapFormToAPI(formData as ItemFormData);
      
      // Call API (this would be replaced with actual API call)
      const response = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create item');
      }

      const result = await response.json();
      
      // Success handling
      showSuccess('Item created successfully');
      onSuccess?.(result.id);
      onClose();
      
    } catch (error) {
      console.error('Create item error:', error);
      showError(error instanceof Error ? error.message : 'Failed to create item');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, existingSKUs, showSuccess, showError, onSuccess, onClose]);

  // Check if form is valid for save button - using proper validation
  const validation = validateItemForm(formData);
  const isSchemaValid = validation.isValid;
  const isFormValid = isSchemaValid && Object.keys(errors).filter(key => key !== '_form').length === 0;

  const categoryOptions = (categories || []).map(cat => ({
    value: cat.id,
    label: cat.description ? `${cat.name} - ${cat.description}` : cat.name
  }));

  const unitOptions = (units || []).map(unit => ({
    value: unit.id,
    label: `${unit.name} (${unit.abbreviation})`
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Item"
      size="lg"
      closeOnOverlayClick={!hasUnsavedChanges}
      closeOnEscape={!hasUnsavedChanges}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Two-column grid on desktop, single column on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column */}
          <div className="space-y-6">
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
                    disabled={isSubmitting || !formData.name}
                    className="text-xs"
                  >
                    Generate
                  </Button>
                }
              />
            </div>

            {/* Category - Required */}
            <Select
              id="item-category"
              label={FIELD_LABELS.categoryId}
              value={formData.categoryId || ''}
              onChange={(e) => handleFieldChange('categoryId', e.target.value)}
              options={categoryOptions}
              error={errors.categoryId}
              helpText={FIELD_HELP_TEXT.categoryId}
              required
              disabled={isSubmitting || isLoading}
              placeholder="Select a category"
            />

            {/* Storage Unit - Required */}
            <Select
              id="item-storage-unit"
              label={FIELD_LABELS.storageUnit}
              value={formData.storageUnit || ''}
              onChange={(e) => handleFieldChange('storageUnit', e.target.value)}
              options={unitOptions}
              error={errors.storageUnit}
              helpText={FIELD_HELP_TEXT.storageUnit}
              required
              disabled={isSubmitting || isLoading}
              placeholder="Select storage unit"
            />

            {/* Ingredient Unit - Required */}
            <Select
              id="item-ingredient-unit"
              label={FIELD_LABELS.ingredientUnit}
              value={formData.ingredientUnit || ''}
              onChange={(e) => handleFieldChange('ingredientUnit', e.target.value)}
              options={unitOptions}
              error={errors.ingredientUnit}
              helpText={FIELD_HELP_TEXT.ingredientUnit}
              required
              disabled={isSubmitting || isLoading}
              placeholder="Select ingredient unit"
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Barcode - Optional */}
            <Input
              id="item-barcode"
              label={FIELD_LABELS.barcode}
              value={formData.barcode || ''}
              onChange={(e) => handleFieldChange('barcode', e.target.value)}
              onBlur={(e) => handleBarcodeBlur(e.target.value)}
              error={errors.barcode}
              helpText={FIELD_HELP_TEXT.barcode}
              disabled={isSubmitting}
              placeholder="e.g., 1234567890123"
              maxLength={32}
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
              min="0"
              step="0.01"
            />

            {/* Minimum Level - Optional */}
            <Input
              id="item-min-level"
              label={FIELD_LABELS.minimumLevel}
              type="number"
              value={formData.minimumLevel?.toString() || ''}
              onChange={(e) => handleFieldChange('minimumLevel', e.target.value ? parseInt(e.target.value) : undefined)}
              error={errors.minimumLevel}
              helpText={FIELD_HELP_TEXT.minimumLevel}
              disabled={isSubmitting}
              placeholder="0"
              min="0"
              step="1"
            />

            {/* Par Level - Optional */}
            <Input
              id="item-par-level"
              label={FIELD_LABELS.parLevel}
              type="number"
              value={formData.parLevel?.toString() || ''}
              onChange={(e) => handleFieldChange('parLevel', e.target.value ? parseInt(e.target.value) : undefined)}
              error={errors.parLevel}
              helpText={FIELD_HELP_TEXT.parLevel}
              disabled={isSubmitting}
              placeholder="0"
              min="0"
              step="1"
            />

            {/* Maximum Level - Optional */}
            <Input
              id="item-max-level"
              label={FIELD_LABELS.maximumLevel}
              type="number"
              value={formData.maximumLevel?.toString() || ''}
              onChange={(e) => handleFieldChange('maximumLevel', e.target.value ? parseInt(e.target.value) : undefined)}
              error={errors.maximumLevel}
              helpText={FIELD_HELP_TEXT.maximumLevel}
              disabled={isSubmitting}
              placeholder="0"
              min="0"
              step="1"
            />
          </div>
        </div>

        {/* Form Error */}
        {errors._form && (
          <div className="p-3 rounded-lg bg-error-surface border border-error text-error-text text-sm">
            {errors._form}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            disabled={!isFormValid || isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}