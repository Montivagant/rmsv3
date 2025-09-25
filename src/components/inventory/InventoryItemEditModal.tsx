/**
 * Inventory Item Edit Modal
 * 
 * A focused form for editing existing inventory items.
 * Based on the create modal but pre-fills data and uses update instead of create.
 */

import { useState, useCallback, useEffect } from 'react';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Select } from '../Select';
import { Button } from '../Button';
import { useToast } from '../../hooks/useToast';
import { useRepository, useRepositoryMutation } from '../../hooks/useRepository';
// Define custom form types for edit modal
interface ItemEditFormData {
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  unit?: string;
  reorderPoint?: number;
  parLevel?: number;
  cost?: number;
  price?: number;
  status?: string;
}

interface ItemEditFormErrors {
  [key: string]: string | undefined;
  _form?: string;
}

// Field labels
const FIELD_LABELS = {
  sku: 'SKU',
  name: 'Item Name',
  description: 'Description',
  categoryId: 'Category',
  unit: 'Unit',
  reorderPoint: 'Reorder Point',
  parLevel: 'PAR Level',
  cost: 'Cost per Unit',
  price: 'Selling Price',
  status: 'Status'
};

// Field help text
const FIELD_HELP_TEXT = {
  sku: 'Stock Keeping Unit (cannot be changed)',
  name: 'Display name for the item',
  description: 'Optional description or notes',
  categoryId: 'Item category for organization',
  unit: 'Unit of measure (e.g., each, kg, liter)',
  reorderPoint: 'Minimum quantity before reordering',
  parLevel: 'Maximum quantity to stock',
  cost: 'Cost per unit',
  price: 'Selling price per unit',
  status: 'Item availability status'
};
import {
  listInventoryCategories,
  listInventoryUnits,
  updateInventoryItem,
  type UpdateInventoryItemInput
} from '../../inventory/repository';


interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  quantity?: number;
  unit?: string;
  reorderPoint?: number;
  parLevel?: number;
  cost?: number;
  price?: number;
  status?: string;
  levels?: {
    current: number;
    par?: {
      min?: number;
      max?: number;
    }
  };
  costing?: {
    averageCost?: number;
    lastCost?: number;
  };
}

interface InventoryItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (itemId: string) => void;
  item: InventoryItem | null;
}

export default function InventoryItemEditModal({
  isOpen,
  onClose,
  onSuccess,
  item
}: InventoryItemEditModalProps) {
  
  const [formData, setFormData] = useState<Partial<ItemEditFormData>>({});
  const [errors, setErrors] = useState<ItemEditFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Hooks
  const { showToast } = useToast();
  
  // Repository mutation for updating items
  const updateItemMutation = useRepositoryMutation<
    { id: string; input: UpdateInventoryItemInput },
    any
  >(({ id, input }) => updateInventoryItem(id, input));

  // Remote data for dropdowns
  const { data: remoteCategories, loading: loadingCategories } = useRepository(listInventoryCategories, []);
  const { data: remoteUnits, loading: loadingUnits } = useRepository(listInventoryUnits, []);

  const allCategories = (remoteCategories || []) as any[];
  const allUnits = (remoteUnits || []) as any[];

  const loadingAny = loadingCategories || loadingUnits;

  // Initialize form with item data
  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        sku: item.sku,
        name: item.name,
        description: item.description || '',
        categoryId: item.categoryId,
        unit: item.unit || '',
        reorderPoint: item.reorderPoint || item.levels?.par?.min || 0,
        parLevel: item.parLevel || item.levels?.par?.max || 0,
        cost: item.cost || item.costing?.lastCost || 0,
        price: item.price || 0,
        status: item.status as any || 'active'
      });
      setHasUnsavedChanges(false);
      setErrors({});
    }
  }, [item, isOpen]);

  // Handle close with unsaved changes protection
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && !isSubmitting) {
      const confirm = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirm) return;
    }
    setFormData({});
    setErrors({});
    setHasUnsavedChanges(false);
    onClose();
  }, [hasUnsavedChanges, isSubmitting, onClose]);

  // Handle field changes with validation
  const handleFieldChange = useCallback((field: keyof ItemEditFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Simple validation for required fields
  const validateField = useCallback((field: keyof ItemEditFormData, value: any): string | undefined => {
    switch (field) {
      case 'name':
        if (!value || value.trim().length === 0) return 'Name is required';
        if (value.trim().length > 60) return 'Name cannot exceed 60 characters';
        break;
      case 'categoryId':
        if (!value) return 'Category is required';
        break;
      case 'cost':
      case 'price':
      case 'reorderPoint':
      case 'parLevel':
        if (value !== undefined && value !== null && value < 0) {
          return `${field} cannot be negative`;
        }
        break;
    }
    return undefined;
  }, []);

  const handleFieldBlur = useCallback((field: keyof ItemEditFormData) => {
    const message = validateField(field, (formData as any)[field]);
    if (message) {
      setErrors(prev => ({ ...prev, [field]: message }));
    }
  }, [formData, validateField]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item) return;

    // Validate required fields
    const validationErrors: ItemEditFormErrors = {};
    let isValid = true;

    // Validate all fields
    Object.keys(formData).forEach((field) => {
      const error = validateField(field as keyof ItemEditFormData, (formData as any)[field]);
      if (error) {
        validationErrors[field] = error;
        isValid = false;
      }
    });

    if (!isValid) {
      setErrors(validationErrors);
      showToast('Please fix the form errors before submitting', 'error');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Prepare update input - only include changed fields
      const updateInput: UpdateInventoryItemInput = {};
      
      if (formData.name && formData.name !== item.name) updateInput.name = formData.name;
      if (formData.description !== undefined && formData.description !== (item.description || '')) {
        updateInput.description = formData.description || '';
      }
      if (formData.unit !== undefined && formData.unit !== (item.unit || '')) {
        updateInput.unit = formData.unit || '';
      }
      if (formData.categoryId && formData.categoryId !== item.categoryId) {
        updateInput.categoryId = formData.categoryId;
      }
      if (formData.reorderPoint !== undefined && formData.reorderPoint !== (item.reorderPoint || 0)) {
        updateInput.reorderPoint = formData.reorderPoint;
      }
      if (formData.parLevel !== undefined && formData.parLevel !== (item.parLevel || 0)) {
        updateInput.parLevel = formData.parLevel;
      }
      if (formData.cost !== undefined && formData.cost !== (item.cost || 0)) {
        updateInput.cost = formData.cost;
      }
      if (formData.price !== undefined && formData.price !== (item.price || 0)) {
        updateInput.price = formData.price;
      }
      if (formData.status && formData.status !== (item.status || 'active')) {
        updateInput.status = formData.status as any;
      }

      // Update par levels in the new format
      if (updateInput.reorderPoint !== undefined || updateInput.parLevel !== undefined) {
        updateInput.levels = {
          current: item.levels?.current || item.quantity || 0,
          par: {
            min: formData.reorderPoint ?? 0,
            max: formData.parLevel ?? 0
          }
        };
      }

      await updateItemMutation.mutate({ id: item.id, input: updateInput });
      
      showToast(`${formData.name} updated successfully`, 'success');
      if (onSuccess) onSuccess(item.id);
      handleClose();

    } catch (error) {
      console.error('Error updating item:', error);
      setErrors({ 
        _form: error instanceof Error ? error.message : 'Failed to update item. Please try again.' 
      });
      showToast('Failed to update item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get current value safely
  const getValue = (field: keyof ItemEditFormData) => {
    const value = formData[field];
    return value !== undefined ? value : '';
  };

  // Create options for dropdowns
  const categoryOptions = (allCategories || []).map(cat => ({
    value: cat.id,
    label: cat.name
  }));

  const unitOptions = (allUnits || []).map(unit => ({
    value: unit.abbreviation || unit.id,
    label: `${unit.name} (${unit.abbreviation})`
  }));

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'discontinued', label: 'Discontinued' }
  ];

  // Don't render if no item is selected
  if (!item && isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Item"
      description="Update inventory item details"
      size="lg"
      closeOnOverlayClick={!hasUnsavedChanges}
      closeOnEscape={!hasUnsavedChanges}
    >
      {loadingAny ? (
        <div className="p-6 text-sm">Loading form data...</div>
      ) : (
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Form-level error */}
        {errors._form && (
          <div className="mx-6 mt-6 rounded-md bg-destructive/10 border border-destructive/20 p-4" role="alert">
            <div className="text-sm font-medium text-destructive">{errors._form}</div>
          </div>
        )}

        {/* Form content with 2-column layout */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-text-primary">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SKU - Read only */}
              <Input
                id="item-sku"
                label={FIELD_LABELS.sku}
                value={getValue('sku')}
                disabled
                helpText="SKU cannot be changed"
              />

              {/* Item Name */}
              <Input
                id="item-name"
                label={FIELD_LABELS.name}
                value={getValue('name')}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onBlur={() => handleFieldBlur('name')}
                {...(errors.name && { error: errors.name })}
                helpText={FIELD_HELP_TEXT.name}
                required
                disabled={isSubmitting}
                maxLength={60}
              />
            </div>

            {/* Description */}
            <Input
              id="item-description"
              label={FIELD_LABELS.description}
              value={getValue('description')}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              onBlur={() => handleFieldBlur('description')}
              {...(errors.description && { error: errors.description })}
              helpText={FIELD_HELP_TEXT.description}
              disabled={isSubmitting}
              maxLength={200}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <Select
                id="item-category"
                label={FIELD_LABELS.categoryId}
                value={getValue('categoryId')}
                onChange={(value) => handleFieldChange('categoryId', value)}
                onBlur={() => handleFieldBlur('categoryId')}
                options={categoryOptions}
                {...(errors.categoryId && { error: errors.categoryId })}
                helpText={FIELD_HELP_TEXT.categoryId}
                required
                disabled={isSubmitting}
              />

              {/* Unit */}
              <Select
                id="item-unit"
                label={FIELD_LABELS.unit}
                value={getValue('unit')}
                onChange={(value) => handleFieldChange('unit', value)}
                onBlur={() => handleFieldBlur('unit')}
                options={unitOptions}
                {...(errors.unit && { error: errors.unit })}
                helpText={FIELD_HELP_TEXT.unit}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Inventory Management */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-text-primary">Inventory Management</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reorder Point */}
              <Input
                id="item-reorder"
                label={FIELD_LABELS.reorderPoint}
                type="number"
                value={getValue('reorderPoint')}
                onChange={(e) => handleFieldChange('reorderPoint', Number(e.target.value))}
                onBlur={() => handleFieldBlur('reorderPoint')}
                {...(errors.reorderPoint && { error: errors.reorderPoint })}
                helpText={FIELD_HELP_TEXT.reorderPoint}
                min={0}
                step={1}
                disabled={isSubmitting}
              />

              {/* PAR Level */}
              <Input
                id="item-par"
                label={FIELD_LABELS.parLevel}
                type="number"
                value={getValue('parLevel')}
                onChange={(e) => handleFieldChange('parLevel', Number(e.target.value))}
                onBlur={() => handleFieldBlur('parLevel')}
                {...(errors.parLevel && { error: errors.parLevel })}
                helpText={FIELD_HELP_TEXT.parLevel}
                min={0}
                step={1}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-text-primary">Pricing</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cost */}
              <Input
                id="item-cost"
                label={FIELD_LABELS.cost}
                type="number"
                value={getValue('cost')}
                onChange={(e) => handleFieldChange('cost', Number(e.target.value))}
                onBlur={() => handleFieldBlur('cost')}
                {...(errors.cost && { error: errors.cost })}
                helpText={FIELD_HELP_TEXT.cost}
                min={0}
                step={0.01}
                disabled={isSubmitting}
              />

              {/* Price */}
              <Input
                id="item-price"
                label={FIELD_LABELS.price}
                type="number"
                value={getValue('price')}
                onChange={(e) => handleFieldChange('price', Number(e.target.value))}
                onBlur={() => handleFieldBlur('price')}
                {...(errors.price && { error: errors.price })}
                helpText={FIELD_HELP_TEXT.price}
                min={0}
                step={0.01}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-text-primary">Status</h3>
            
            <Select
              id="item-status"
              label="Status"
              value={getValue('status')}
              onChange={(value) => handleFieldChange('status', value)}
              options={statusOptions}
              helpText="Item availability status"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 px-6 pb-6">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!hasUnsavedChanges || isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Item'}
          </Button>
        </div>
      </form>
      )}
    </Modal>
  );
}
