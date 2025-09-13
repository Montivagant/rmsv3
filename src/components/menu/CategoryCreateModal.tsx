/**
 * Menu Category Create/Edit Modal
 * Modal form for creating and editing menu categories
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { useToast } from '../../hooks/useToast';
import { useApi } from '../../hooks/useApi';
import type { 
  MenuCategory, 
  CategoryFormData, 
  CategoryFormErrors,
  CreateCategoryRequest,
  UpdateCategoryRequest 
} from '../../menu/categories/types';
import { 
  createDefaultCategoryData, 
  validateCategoryName, 
  validateDisplayOrder 
} from '../../menu/categories/types';

interface Branch {
  id: string;
  name: string;
  type: string;
}

interface CategoryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCategory?: MenuCategory;
}

export default function CategoryCreateModal({
  isOpen,
  onClose,
  onSuccess,
  editingCategory,
}: CategoryCreateModalProps) {
  // State
  const [formData, setFormData] = useState<CategoryFormData>(createDefaultCategoryData());
  const [errors, setErrors] = useState<CategoryFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();
  
  // Load branches for assignment
  const { data: branches = [] } = useApi<Branch[]>('/api/branches');

  const isEditing = !!editingCategory;

  // Initialize form data when editing
  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        setFormData({
          name: editingCategory.name,
          displayOrder: editingCategory.displayOrder,
          isActive: editingCategory.isActive,
          branchIds: editingCategory.branchIds,
        });
      } else {
        setFormData(createDefaultCategoryData());
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, editingCategory]);

  // Field change handler
  const handleFieldChange = useCallback((field: keyof CategoryFormData, value: any) => {
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

  // Branch toggle handler
  const handleBranchToggle = useCallback((branchId: string, checked: boolean) => {
    const newBranchIds = checked
      ? [...formData.branchIds, branchId]
      : formData.branchIds.filter(id => id !== branchId);
      
    handleFieldChange('branchIds', newBranchIds);
  }, [formData.branchIds, handleFieldChange]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: CategoryFormErrors = {};

    // Name validation
    const nameValidation = validateCategoryName(formData.name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.message;
    }

    // Display order validation
    const orderValidation = validateDisplayOrder(formData.displayOrder);
    if (!orderValidation.isValid) {
      newErrors.displayOrder = orderValidation.message;
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
            name: formData.name,
            displayOrder: formData.displayOrder,
            isActive: formData.isActive,
            branchIds: formData.branchIds,
          } as UpdateCategoryRequest
        : {
            name: formData.name,
            displayOrder: formData.displayOrder,
            isActive: formData.isActive,
            branchIds: formData.branchIds,
          } as CreateCategoryRequest;

      const url = isEditing 
        ? `/api/menu/categories/${editingCategory!.id}`
        : '/api/menu/categories';
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${isEditing ? 'update' : 'create'} category`);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving category:', error);
      setErrors({ _form: error instanceof Error ? error.message : 'Failed to save category' });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, isEditing, editingCategory, onSuccess]);

  // Check if form is valid
  const isFormValid = formData.name.trim().length >= 2 && 
                     formData.branchIds.length > 0 &&
                     Object.keys(errors).filter(key => key !== '_form').length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Category' : 'Create New Category'}
      description={isEditing ? 'Update category details' : 'Add a new category to organize your menu items'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Name */}
        <Input
          id="category-name"
          label="Category Name"
          value={formData.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          error={errors.name}
          required
          disabled={isSubmitting}
          placeholder="e.g., Appetizers, Main Courses, Beverages"
          maxLength={50}
          autoFocus
        />

        {/* Display Order */}
        <Input
          id="category-order"
          label="Display Order"
          type="number"
          value={formData.displayOrder.toString()}
          onChange={(e) => handleFieldChange('displayOrder', parseInt(e.target.value) || 1)}
          error={errors.displayOrder}
          required
          disabled={isSubmitting}
          placeholder="1"
          min={1}
          max={999}
          helpText="Controls the order categories appear in menus"
        />

        {/* Active Status */}
        <div className="flex items-center space-x-3">
          <Checkbox
            id="category-active"
            checked={formData.isActive}
            onChange={(e) => handleFieldChange('isActive', e.target.checked)}
            disabled={isSubmitting}
          />
          <div className="flex-1">
            <label htmlFor="category-active" className="text-sm font-medium text-text-primary">
              Active Category
            </label>
            <p className="text-xs text-text-muted mt-1">
              Active categories are visible in the POS and menu displays
            </p>
          </div>
        </div>

        {/* Branch Assignment */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-text-primary">
            Available at Branches *
          </label>
          {!branches || branches.length === 0 ? (
            <p className="text-sm text-text-muted">No branches available</p>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {branches.map((branch) => (
                <div key={branch.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`branch-${branch.id}`}
                    checked={formData.branchIds.includes(branch.id)}
                    onChange={(e) => handleBranchToggle(branch.id, e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <label 
                    htmlFor={`branch-${branch.id}`}
                    className="text-sm text-text-primary flex-1 cursor-pointer"
                  >
                    {branch.name} ({branch.type})
                  </label>
                </div>
              ))}
            </div>
          )}
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
              : (isEditing ? 'Update Category' : 'Create Category')
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}
