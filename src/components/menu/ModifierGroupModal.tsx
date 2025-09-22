/**
 * Modifier Group Create/Edit Modal
 * Modal form for creating and editing modifier groups with options
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from '../Modal';
import { Input } from '../Input';
import { Select } from '../Select';
import { Textarea } from '../Textarea';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { Badge } from '../Badge';
import { useToast } from '../../hooks/useToast';

interface ModifierOption {
  id: string;
  name: string;
  priceAdjustment: number;
  isDefault?: boolean | undefined;
  isActive: boolean;
}

interface ModifierGroup {
  id: string;
  name: string;
  description?: string;
  type: 'single' | 'multiple';
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  isActive: boolean;
  options: ModifierOption[];
  createdAt: string;
  updatedAt: string;
}

interface ModifierGroupFormData {
  name: string;
  description: string;
  type: 'single' | 'multiple';
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  displayOrder: number;
  isActive: boolean;
  options: Omit<ModifierOption, 'id'>[];
}

interface ModifierGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingGroup?: ModifierGroup;
}

export default function ModifierGroupModal({
  isOpen,
  onClose,
  onSuccess,
  editingGroup,
}: ModifierGroupModalProps) {
  // State
  const [formData, setFormData] = useState<ModifierGroupFormData>({
    name: '',
    description: '',
    type: 'single',
    isRequired: false,
    minSelections: 1,
    maxSelections: 1,
    displayOrder: 1,
    isActive: true,
    options: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New option being added
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState(0);

  const { showToast } = useToast();
  const isEditing = !!editingGroup;

  // Initialize form data when editing
  useEffect(() => {
    if (isOpen) {
      if (editingGroup) {
        setFormData({
          name: editingGroup.name,
          description: editingGroup.description || '',
          type: editingGroup.type,
          isRequired: editingGroup.isRequired,
          minSelections: editingGroup.minSelections,
          maxSelections: editingGroup.maxSelections,
          displayOrder: editingGroup.displayOrder,
          isActive: editingGroup.isActive,
          options: editingGroup.options.map(opt => ({
            name: opt.name,
            priceAdjustment: opt.priceAdjustment,
            isDefault: opt.isDefault,
            isActive: opt.isActive
          }))
        });
      } else {
        setFormData({
          name: '',
          description: '',
          type: 'single',
          isRequired: false,
          minSelections: 1,
          maxSelections: 1,
          displayOrder: 1,
          isActive: true,
          options: []
        });
      }
      setErrors({});
      setIsSubmitting(false);
      setNewOptionName('');
      setNewOptionPrice(0);
    }
  }, [isOpen, editingGroup]);

  // Field change handler
  const handleFieldChange = useCallback((field: keyof ModifierGroupFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // Add new option
  const handleAddOption = useCallback(() => {
    if (!newOptionName.trim()) {
      setErrors(prev => ({ ...prev, newOption: 'Option name is required' }));
      return;
    }

    const newOption = {
      name: newOptionName.trim(),
      priceAdjustment: newOptionPrice,
      isDefault: formData.options.length === 0, // First option is default
      isActive: true
    };

    setFormData(prev => ({
      ...prev,
      options: [...prev.options, newOption]
    }));

    setNewOptionName('');
    setNewOptionPrice(0);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.newOption;
      return newErrors;
    });
  }, [newOptionName, newOptionPrice, formData.options.length]);

  // Remove option
  const handleRemoveOption = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  }, []);

  // Form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    }
    
    if (formData.options.length === 0) {
      newErrors.options = 'At least one option is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // For now, just show success - API implementation would go here
      showToast({
        title: 'Success',
        description: `Modifier group ${isEditing ? 'updated' : 'created'} successfully`,
        variant: 'success'
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error saving modifier group:', error);
      setErrors({ _form: error instanceof Error ? error.message : 'Failed to save modifier group' });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isEditing, onSuccess, showToast]);

  // Update selection limits when type changes
  useEffect(() => {
    if (formData.type === 'single') {
      setFormData(prev => ({
        ...prev,
        minSelections: 1,
        maxSelections: 1
      }));
    }
  }, [formData.type]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Modifier Group' : 'Create Modifier Group'}
      description={isEditing ? 'Update modifier group details' : 'Create a new modifier group for menu customization'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Basic Information</h3>
          
          <Input
            id="group-name"
            label="Group Name"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            error={errors.name}
            required
            disabled={isSubmitting}
            placeholder="e.g., Size, Add-ons, Cooking Style"
            maxLength={50}
            autoFocus
          />

          <Textarea
            id="group-description"
            label="Description"
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            disabled={isSubmitting}
            placeholder="Optional description of this modifier group"
            maxLength={200}
            rows={2}
          />
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="group-type"
              label="Selection Type"
              value={formData.type}
              onValueChange={(value) => handleFieldChange('type', value)}
              options={[
                { value: 'single', label: 'Single Choice (e.g., Size)' },
                { value: 'multiple', label: 'Multiple Choice (e.g., Add-ons)' }
              ]}
              disabled={isSubmitting}
            />

            <div className="flex items-center space-x-3">
              <Checkbox
                id="group-required"
                checked={formData.isRequired}
                onChange={(e) => handleFieldChange('isRequired', e.target.checked)}
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <label htmlFor="group-required" className="text-sm font-medium text-text-primary">
                  Required Selection
                </label>
                <p className="text-xs text-text-muted mt-1">
                  Customers must make a selection from this group
                </p>
              </div>
            </div>
          </div>

          {formData.type === 'multiple' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="min-selections"
                label="Minimum Selections"
                type="number"
                value={formData.minSelections.toString()}
                onChange={(e) => handleFieldChange('minSelections', parseInt(e.target.value) || 0)}
                disabled={isSubmitting}
                min={0}
                max={10}
              />
              
              <Input
                id="max-selections"
                label="Maximum Selections"
                type="number"
                value={formData.maxSelections.toString()}
                onChange={(e) => handleFieldChange('maxSelections', parseInt(e.target.value) || 1)}
                disabled={isSubmitting}
                min={1}
                max={10}
              />
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Options</h3>
          
          {/* Add New Option */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <Input
                placeholder="Option name"
                value={newOptionName}
                onChange={(e) => setNewOptionName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="md:col-span-1">
              <Input
                type="number"
                placeholder="Price adjustment"
                value={newOptionPrice.toString()}
                onChange={(e) => setNewOptionPrice(parseFloat(e.target.value) || 0)}
                disabled={isSubmitting}
                step={0.01}
              />
            </div>
            <div className="md:col-span-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddOption}
                disabled={isSubmitting || !newOptionName.trim()}
                className="w-full"
              >
                Add Option
              </Button>
            </div>
          </div>

          {errors.newOption && (
            <p className="text-sm text-error">{errors.newOption}</p>
          )}

          {/* Existing Options */}
          {formData.options.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{option.name}</span>
                      {option.isDefault && (
                        <Badge variant="secondary" size="sm">Default</Badge>
                      )}
                    </div>
                    <span className="text-sm text-text-secondary">
                      {option.priceAdjustment >= 0 ? '+' : ''}${option.priceAdjustment.toFixed(2)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOption(index)}
                    disabled={isSubmitting}
                    className="text-error hover:bg-error/10"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {errors.options && (
            <p className="text-sm text-error">{errors.options}</p>
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
            disabled={isSubmitting || formData.options.length === 0}
            className="min-w-24"
          >
            {isSubmitting 
              ? (isEditing ? 'Updating...' : 'Creating...') 
              : (isEditing ? 'Update Group' : 'Create Group')
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}
