/**
 * Menu Item Create/Edit Modal
 * Modal form for creating and editing menu items
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Select } from '../Select';
import { Textarea } from '../Textarea';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
// import { ImageUpload } from '../ImageUpload'; // TODO: Create ImageUpload component
import type { 
  MenuItem, 
  MenuItemFormData, 
  MenuItemFormErrors,
  CreateMenuItemRequest,
  UpdateMenuItemRequest 
} from '../../menu/items/types';
import type { MenuCategory } from '../../menu/categories/types';
import { 
  createDefaultMenuItemData, 
  validateMenuItemName, 
  validateMenuItemSKU,
  validateMenuItemPrice,
  validateTaxRate,
  generateMenuItemSKU 
} from '../../menu/items/types';
import { menuItemsApi } from '../../menu/items/api';


interface MenuItemCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories?: MenuCategory[];
  editingItem?: MenuItem;
}

export default function MenuItemCreateModal({
  isOpen,
  onClose,
  onSuccess,
  categories = [],
  editingItem,
}: MenuItemCreateModalProps) {
  // State
  const [formData, setFormData] = useState<MenuItemFormData>(createDefaultMenuItemData());
  const [errors, setErrors] = useState<MenuItemFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);


  const isEditing = !!editingItem;

  // Get existing SKUs for validation
  const existingSKUs: string[] = []; // Would be populated from API call

  // Initialize form data when editing
  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setFormData({
          sku: editingItem.sku,
          name: editingItem.name,
          description: editingItem.description || '',
          categoryId: editingItem.categoryId,
          price: editingItem.price,
          taxRate: editingItem.taxRate,
          isActive: editingItem.isActive,
          isAvailable: editingItem.isAvailable,
          branchIds: editingItem.branchIds,
          image: editingItem.image,
        });
      } else {
        setFormData(createDefaultMenuItemData());
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, editingItem]);

  // Field change handler
  const handleFieldChange = useCallback((field: keyof MenuItemFormData, value: any) => {
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
  }, [errors]);

  // Generate SKU from name and category
  const handleGenerateSKU = useCallback(() => {
    if (!formData.name) {
      setErrors(prev => ({ ...prev, name: 'Please enter an item name first' }));
      return;
    }

    const categoryName = categories.find(cat => cat.id === formData.categoryId)?.name || '';
    const newSKU = generateMenuItemSKU(formData.name, categoryName, existingSKUs);
    handleFieldChange('sku', newSKU);
  }, [formData.name, formData.categoryId, categories, existingSKUs, handleFieldChange]);

  // Branch toggle handler  
  const handleBranchToggle = useCallback((branchId: string, checked: boolean) => {
    const newBranchIds = checked
      ? [...formData.branchIds, branchId]
      : formData.branchIds.filter(id => id !== branchId);
      
    handleFieldChange('branchIds', newBranchIds);
  }, [formData.branchIds, handleFieldChange]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: MenuItemFormErrors = {};

    // Name validation
    const nameValidation = validateMenuItemName(formData.name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.message;
    }

    // SKU validation
    const skuValidation = validateMenuItemSKU(formData.sku);
    if (!skuValidation.isValid) {
      newErrors.sku = skuValidation.message;
    }

    // Category validation
    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    // Price validation
    const priceValidation = validateMenuItemPrice(formData.price);
    if (!priceValidation.isValid) {
      newErrors.price = priceValidation.message;
    }

    // Tax rate validation
    const taxValidation = validateTaxRate(formData.taxRate);
    if (!taxValidation.isValid) {
      newErrors.taxRate = taxValidation.message;
    }

    // Branch validation
    if (formData.branchIds.length === 0) {
      newErrors.branchIds = 'At least one branch must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const requestData = isEditing
        ? { 
            sku: formData.sku,
            name: formData.name,
            description: formData.description || undefined,
            categoryId: formData.categoryId,
            price: formData.price,
            taxRate: formData.taxRate,
            isActive: formData.isActive,
            isAvailable: formData.isAvailable,
            branchIds: formData.branchIds,
            image: formData.image,
          } as UpdateMenuItemRequest
        : {
            sku: formData.sku,
            name: formData.name,
            description: formData.description || undefined,
            categoryId: formData.categoryId,
            price: formData.price,
            taxRate: formData.taxRate,
            isActive: formData.isActive,
            isAvailable: formData.isAvailable,
            branchIds: formData.branchIds,
            image: formData.image,
          } as CreateMenuItemRequest;

      if (isEditing) {
        await menuItemsApi.update(editingItem!.id, requestData as UpdateMenuItemRequest);
      } else {
        await menuItemsApi.create(requestData as CreateMenuItemRequest);
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving menu item:', error);
      setErrors({ _form: error instanceof Error ? error.message : 'Failed to save menu item' });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, isEditing, editingItem, onSuccess]);

  // Check if form is valid
  const isFormValid = formData.name.trim().length >= 2 && 
                     formData.sku.trim().length >= 3 &&
                     formData.categoryId &&
                     formData.price > 0 &&
                     formData.branchIds.length > 0 &&
                     Object.keys(errors).filter(key => key !== '_form').length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Menu Item' : 'Create New Menu Item'}
      description={isEditing ? 'Update menu item details' : 'Add a new item to your menu'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Basic Information</h3>
          
          {/* Item Name */}
          <Input
            id="item-name"
            label="Item Name"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            error={errors.name}
            required
            disabled={isSubmitting}
            placeholder="e.g., Classic Burger, Caesar Salad"
            maxLength={100}
            autoFocus
          />

          {/* SKU */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <Input
                id="item-sku"
                label="SKU"
                value={formData.sku}
                onChange={(e) => handleFieldChange('sku', e.target.value.toUpperCase())}
                error={errors.sku}
                required
                disabled={isSubmitting}
                placeholder="e.g., APP-BURG, BEV-COFF"
                maxLength={20}
              />
            </div>
            <div className="md:col-span-1">
              <label className="sr-only">Generate SKU</label>
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateSKU}
                disabled={isSubmitting || !formData.name || !formData.categoryId}
                className="w-full mt-6"
              >
                Generate
              </Button>
            </div>
          </div>

          {/* Description */}
          <Textarea
            id="item-description"
            label="Description"
            value={formData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            disabled={isSubmitting}
            placeholder="Brief description of the item (optional)"
            maxLength={200}
            rows={3}
          />

          {/* Item Image */}
          <div>
            <label htmlFor="item-image" className="block text-sm font-medium text-foreground mb-2">
              Item Image (optional)
            </label>
            {/* TODO: Implement ImageUpload component */}
            <Input
              id="item-image"
              type="text"
              value={formData.image || ''}
              onChange={(e) => handleFieldChange('image', e.target.value)}
              placeholder="Image URL (optional)"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Category and Pricing */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Category & Pricing</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <Select
              id="item-category"
              label="Category"
              value={formData.categoryId}
              onValueChange={(value) => handleFieldChange('categoryId', value)}
              options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
              error={errors.categoryId}
              required
              disabled={isSubmitting}
              placeholder="Select category"
            />

            {/* Price */}
            <Input
              id="item-price"
              label="Price"
              type="number"
              value={formData.price.toString()}
              onChange={(e) => handleFieldChange('price', parseFloat(e.target.value) || 0)}
              error={errors.price}
              required
              disabled={isSubmitting}
              placeholder="0.00"
              min={0.01}
              max={9999.99}
              step={0.01}
            />
          </div>

          {/* Tax Rate */}
          <Input
            id="item-tax-rate"
            label="Tax Rate (%)"
            type="number"
            value={(formData.taxRate * 100).toString()}
            onChange={(e) => handleFieldChange('taxRate', (parseFloat(e.target.value) || 0) / 100)}
            error={errors.taxRate}
            disabled={isSubmitting}
            placeholder="15"
            min={0}
            max={100}
            step={0.1}
            helpText="Enter as percentage (e.g., 15 for 15%)"
          />
        </div>

        {/* Status and Availability */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Status & Availability</h3>
          
          <div className="space-y-3">
            {/* Active Status */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="item-active"
                checked={formData.isActive}
                onChange={(e) => handleFieldChange('isActive', e.target.checked)}
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <label htmlFor="item-active" className="text-sm font-medium text-text-primary">
                  Active Item
                </label>
                <p className="text-xs text-text-muted mt-1">
                  Active items appear in menu management and can be made available for sale
                </p>
              </div>
            </div>

            {/* Available Status */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="item-available"
                checked={formData.isAvailable}
                onChange={(e) => handleFieldChange('isAvailable', e.target.checked)}
                disabled={isSubmitting || !formData.isActive}
              />
              <div className="flex-1">
                <label htmlFor="item-available" className="text-sm font-medium text-text-primary">
                  Available for Sale
                </label>
                <p className="text-xs text-text-muted mt-1">
                  Available items can be ordered by customers (requires active status)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Branch Assignment */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-text-primary">
            Available at Branches *
          </label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {/* For now, use default branch - would be loaded from API */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="branch-main"
                checked={formData.branchIds.includes('main-restaurant')}
                onChange={(e) => handleBranchToggle('main-restaurant', e.target.checked)}
                disabled={isSubmitting}
              />
              <label 
                htmlFor="branch-main"
                className="text-sm text-text-primary flex-1 cursor-pointer"
              >
                Main Restaurant (restaurant)
              </label>
            </div>
          </div>
          {errors.branchIds && (
            <p className="text-sm text-error">{errors.branchIds}</p>
          )}
        </div>

        {/* Form Error */}
        {errors._form && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm" role="alert">
            {errors._form}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="min-w-24"
          >
            {isSubmitting 
              ? (isEditing ? 'Updating...' : 'Creating...') 
              : (isEditing ? 'Update Item' : 'Create Item')
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}
