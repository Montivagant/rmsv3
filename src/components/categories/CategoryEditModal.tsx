import { useState, useCallback, useEffect } from 'react';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Button } from '../Button';
import { useToast } from '../../hooks/useToast';
import { updateInventoryCategory } from '../../inventory/repository';

interface CategoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (categoryId: string) => void;
  category: {
    id: string;
    name: string;
    reference: string;
  } | null;
}

export default function CategoryEditModal({
  isOpen,
  onClose,
  onSuccess,
  category
}: CategoryEditModalProps) {
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<{ name?: string; reference?: string; _form?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { showToast } = useToast();

  // Initialize form with category data
  useEffect(() => {
    if (category && isOpen) {
      setName(category.name);
      setReference(category.reference || '');
      setHasUnsavedChanges(false);
      setErrors({});
    }
  }, [category, isOpen]);

  // Handle close with unsaved changes protection
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && !isSubmitting) {
      const confirm = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirm) return;
    }
    setName('');
    setReference('');
    setErrors({});
    setHasUnsavedChanges(false);
    onClose();
  }, [hasUnsavedChanges, isSubmitting, onClose]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setHasUnsavedChanges(true);
    if (errors.name) {
      setErrors(prev => {
        const { name, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReference(e.target.value);
    setHasUnsavedChanges(true);
    if (errors.reference) {
      setErrors(prev => {
        const { reference, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category) return;

    // Validate
    const newErrors: typeof errors = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await updateInventoryCategory(category.id, name.trim(), reference.trim() || undefined);
      
      showToast(`Category "${name}" updated successfully`, 'success');
      if (onSuccess) onSuccess(category.id);
      handleClose();

    } catch (error) {
      console.error('Error updating category:', error);
      setErrors({ 
        _form: error instanceof Error ? error.message : 'Failed to update category. Please try again.' 
      });
      showToast('Failed to update category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render if no category is selected
  if (!category && isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Category"
      description="Update category details"
      size="md"
      closeOnOverlayClick={!hasUnsavedChanges}
      closeOnEscape={!hasUnsavedChanges}
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Form-level error */}
        {errors._form && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4" role="alert">
            <div className="text-sm font-medium text-destructive">{errors._form}</div>
          </div>
        )}

        <div className="space-y-6">
          {/* Category Name */}
          <div>
            <Input
              id="category-name"
              label="Category Name"
              value={name}
              onChange={handleNameChange}
              {...(errors.name && { error: errors.name })}
              helpText="Display name for the category"
              required
              disabled={isSubmitting}
              autoFocus
              maxLength={40}
            />
          </div>

          {/* Reference Code */}
          <div>
            <Input
              id="category-reference"
              label="Reference Code"
              value={reference}
              onChange={handleReferenceChange}
              {...(errors.reference && { error: errors.reference })}
              helpText="Optional reference code or description"
              disabled={isSubmitting}
              maxLength={200}
              placeholder="e.g., APPETIZERS, MAINS, DRINKS"
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
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!hasUnsavedChanges || isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
