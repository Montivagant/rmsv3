import { useState, useCallback, useEffect } from 'react';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { useToast } from '../../hooks/useToast';
import { createInventoryCategory, listInventoryCategories } from '../../inventory/repository';

import type { 
  CategoryFormData, 
  CategoryFormErrors,
} from '../../schemas/categoryForm';

import { 
  validateCategoryForm, 
  createDefaultCategoryFormData, 
  generateCategoryReference,
  CATEGORY_FIELD_LABELS,
  CATEGORY_FIELD_HELP_TEXT 
} from '../../schemas/categoryForm';

interface CategoryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (categoryId: string) => void;
  existingReferences?: string[];
  isLoading?: boolean;
}

export default function CategoryCreateModal({
  isOpen,
  onClose,
  onSuccess,
  existingReferences = [],
}: CategoryCreateModalProps) {
  const [formData, setFormData] = useState<CategoryFormData>(createDefaultCategoryFormData());
  const [errors, setErrors] = useState<CategoryFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const { showToast } = useToast();

  // Load existing categories to check for duplicates
  useEffect(() => {
    if (isOpen) {
      listInventoryCategories().then(categories => {
        setExistingCategories(categories.map(cat => cat.name.toLowerCase()));
      }).catch(err => {
        console.error('Failed to load categories:', err);
      });
    }
  }, [isOpen]);

  // Handle close with unsaved changes protection
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && !isSubmitting) {
      const confirm = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirm) return;
    }
    // Reset form when closing
    setFormData(createDefaultCategoryFormData());
    setErrors({});
    setHasUnsavedChanges(false);
    onClose();
  }, [hasUnsavedChanges, isSubmitting, onClose]);

  // Handle field changes with validation
  const handleFieldChange = useCallback((field: keyof CategoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Validate single field
  const validateField = useCallback((field: keyof CategoryFormData, value: any): string | undefined => {
    const testData = { ...formData, [field]: value };
    const { errors: fieldErrors } = validateCategoryForm(testData);
    return fieldErrors[field];
  }, [formData]);

  const handleFieldBlur = useCallback((field: keyof CategoryFormData) => {
    const message = validateField(field, (formData as any)[field]);
    if (message) {
      setErrors(prev => ({ ...prev, [field]: message }));
    }
  }, [formData, validateField]);

  // Generate category reference
  const handleGenerateReference = useCallback(() => {
    const reference = generateCategoryReference(formData.name, existingReferences);
    handleFieldChange('reference', reference);
  }, [formData.name, existingReferences, handleFieldChange]);

  // (moved above)

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate entire form
    const { isValid, errors: validationErrors } = validateCategoryForm(formData);
    
    if (!isValid) {
      setErrors(validationErrors);
      showToast('Please fix the form errors before submitting', 'error');
      return;
    }

    // Check for duplicate category name
    if (existingCategories.includes(formData.name.toLowerCase().trim())) {
      setErrors({ name: 'A category with this name already exists' });
      showToast('Category name already exists', 'error');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Create category using event store
      const createdCategory = await createInventoryCategory(
        formData.name,
        formData.reference || undefined
      );
      
      showToast(`Category "${formData.name}" created successfully`, 'success');
      onSuccess(createdCategory.id);
      
      // Reset form for potential reuse
      setFormData(createDefaultCategoryFormData());
      setHasUnsavedChanges(false);

    } catch (error) {
      console.error('Error creating category:', error);
      
      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : 'Failed to create category';
      
      if (errorMessage.includes('already exists')) {
        setErrors({ name: 'A category with this name already exists' });
      } else {
        setErrors({ _form: errorMessage });
      }
      
      showToast('Failed to create category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form validation status - manual validation that actually works
  const isFormValid = !!(formData.name && formData.name.trim().length >= 2);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Category"
      description="Add a new menu category to organize your items."
      size="md"
      closeOnOverlayClick={!hasUnsavedChanges}
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Form-level error */}
        {errors._form && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4" role="alert">
            <div className="text-sm font-medium text-destructive">{errors._form}</div>
          </div>
        )}

        <div className="space-y-6">
          {/* Category Name - Required */}
          <div>
            <Input
              id="category-name"
              label={CATEGORY_FIELD_LABELS.name}
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              onBlur={() => handleFieldBlur('name')}
              {...(errors.name && { error: errors.name })}
              helpText={CATEGORY_FIELD_HELP_TEXT.name}
              required
              disabled={isSubmitting}
              autoFocus
              maxLength={40}
            />
          </div>

          {/* Reference Code - Optional with Generate button */}
          <div>
            <Input
              id="category-reference"
              label={CATEGORY_FIELD_LABELS.reference}
              value={formData.reference || ''}
              onChange={(e) => handleFieldChange('reference', e.target.value)}
              onBlur={() => handleFieldBlur('reference')}
              {...(errors.reference && { error: errors.reference })}
              helpText={CATEGORY_FIELD_HELP_TEXT.reference}
              disabled={isSubmitting}
              maxLength={24}
              placeholder="e.g., APPETIZERS, MAINS, DRINKS"
              rightIcon={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateReference}
                  disabled={isSubmitting || !formData.name.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                  aria-label="Generate"
                >
                  Generate
                </Button>
              }
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
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
            {isSubmitting ? 'Creating...' : 'Create Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
