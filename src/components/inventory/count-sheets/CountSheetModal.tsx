import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../Modal';
import { Button } from '../../Button';
import { Input } from '../../Input';
import { Select } from '../../Select';
import { Label } from '../../Label';
import { Badge } from '../../Badge';
import { Checkbox } from '../../Checkbox';
import { RadioGroup, RadioOption } from '../../ui/RadioGroup';
import { Skeleton } from '../../Skeleton';
import { useToast } from '../../../hooks/useToast';
import { countSheetsApiService } from '../../../inventory/count-sheets/api';
import type { 
  CountSheet,
  CreateCountSheetRequest,
  CountSheetPreview
} from '../../../inventory/count-sheets/types';
import { CountSheetUtils, COUNT_SHEET_CONFIG } from '../../../inventory/count-sheets/types';

interface CountSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingSheet?: CountSheet;
  branches?: Array<{ id: string; name: string; type: string }>;
  categories?: Array<{ id: string; name: string }>;
  suppliers?: Array<{ id: string; name: string }>;
  storageAreas?: Array<{ id: string; name: string }>;
}

interface FormData {
  name: string;
  branchScopeType: 'all' | 'specific';
  specificBranchId: string;
  categoryIds: string[];
  supplierIds: string[];
  storageAreaIds: string[];
  itemIds: string[];
  includeTags: string[];
  excludeTags: string[];
  includeZeroStock: boolean;
}

export default function CountSheetModal({
  isOpen,
  onClose,
  onSuccess,
  editingSheet,
  branches = [],
  categories = [],
  suppliers = [],
  storageAreas = []
}: CountSheetModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    branchScopeType: 'all',
    specificBranchId: '',
    categoryIds: [],
    supplierIds: [],
    storageAreaIds: [],
    itemIds: [],
    includeTags: [],
    excludeTags: [],
    includeZeroStock: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<CountSheetPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const { showToast } = useToast();
  const isEditing = !!editingSheet;

  // Initialize form with editing data
  useEffect(() => {
    if (isOpen) {
      if (editingSheet) {
        setFormData({
          name: editingSheet.name,
          branchScopeType: editingSheet.branchScope.type === 'all' ? 'all' : 'specific',
          specificBranchId: editingSheet.branchScope.type === 'specific' ? editingSheet.branchScope.branchId : '',
          categoryIds: editingSheet.criteria.categoryIds || [],
          supplierIds: editingSheet.criteria.supplierIds || [],
          storageAreaIds: editingSheet.criteria.storageAreaIds || [],
          itemIds: editingSheet.criteria.itemIds || [],
          includeTags: editingSheet.criteria.includeTags || [],
          excludeTags: editingSheet.criteria.excludeTags || [],
          includeZeroStock: editingSheet.criteria.includeZeroStock !== false
        });
      } else {
        setFormData({
          name: '',
          branchScopeType: 'all',
          specificBranchId: '',
          categoryIds: [],
          supplierIds: [],
          storageAreaIds: [],
          itemIds: [],
          includeTags: [],
          excludeTags: [],
          includeZeroStock: true
        });
      }
      setErrors({});
      setTouched({});
      setShowPreview(false);
      setPreview(null);
    }
  }, [isOpen, editingSheet]);

  // Form validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > COUNT_SHEET_CONFIG.MAX_NAME_LENGTH) {
      newErrors.name = `Name must be ${COUNT_SHEET_CONFIG.MAX_NAME_LENGTH} characters or less`;
    }

    if (formData.branchScopeType === 'specific' && !formData.specificBranchId) {
      newErrors.specificBranch = 'Branch selection is required';
    }

    const hasFilters = !!(
      formData.categoryIds.length ||
      formData.supplierIds.length ||
      formData.storageAreaIds.length ||
      formData.includeTags.length ||
      formData.excludeTags.length
    );
    const hasItemPicks = formData.itemIds.length > 0;

    if (!hasFilters && !hasItemPicks) {
      newErrors.criteria = 'At least one filter criteria or item selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Update form field
  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Clear related errors
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Multi-select handlers
  const handleMultiSelect = (field: 'categoryIds' | 'supplierIds' | 'storageAreaIds', value: string, checked: boolean) => {
    const currentValues = formData[field];
    const newValues = checked 
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    updateField(field, newValues);
  };

  // Load preview
  const loadPreview = useCallback(async () => {
    if (!editingSheet) return; // Only show preview for existing sheets
    
    setIsLoadingPreview(true);
    try {
      const previewData = await countSheetsApiService.previewCountSheet(editingSheet.id);
      setPreview(previewData);
      setShowPreview(true);
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to load preview',
        variant: 'error'
      });
    } finally {
      setIsLoadingPreview(false);
    }
  }, [editingSheet, showToast]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Mark all fields as touched to show errors
      setTouched({
        name: true,
        specificBranch: true,
        criteria: true
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const request: CreateCountSheetRequest = {
        name: formData.name.trim(),
        branchScope: formData.branchScopeType === 'all' 
          ? { type: 'all' }
          : { type: 'specific', branchId: formData.specificBranchId },
        criteria: {
          categoryIds: formData.categoryIds.length > 0 ? formData.categoryIds : undefined,
          supplierIds: formData.supplierIds.length > 0 ? formData.supplierIds : undefined,
          storageAreaIds: formData.storageAreaIds.length > 0 ? formData.storageAreaIds : undefined,
          itemIds: formData.itemIds.length > 0 ? formData.itemIds : undefined,
          includeTags: formData.includeTags.length > 0 ? formData.includeTags : undefined,
          excludeTags: formData.excludeTags.length > 0 ? formData.excludeTags : undefined,
          includeZeroStock: formData.includeZeroStock
        }
      };

      if (isEditing) {
        await countSheetsApiService.updateCountSheet(editingSheet.id, request);
      } else {
        await countSheetsApiService.createCountSheet(request);
      }
      
      onSuccess();
    } catch (error) {
      showToast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} count sheet`,
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Count Sheet` : 'Create Count Sheet'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <Label htmlFor="sheet-name" required>
            Count Sheet Name
          </Label>
          <Input
            id="sheet-name"
            type="text"
            placeholder="e.g., Daily Produce Check, Freezer Items"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            className={touched.name && errors.name ? 'border-error' : ''}
            maxLength={COUNT_SHEET_CONFIG.MAX_NAME_LENGTH}
          />
          {touched.name && errors.name && (
            <p className="text-sm text-error mt-1">{errors.name}</p>
          )}
        </div>

        {/* Branch Scope */}
        <div>
          <Label>Branch Scope</Label>
          <RadioGroup
            value={formData.branchScopeType}
            onChange={(value) => {
              updateField('branchScopeType', value as 'all' | 'specific');
              if (value === 'all') {
                updateField('specificBranchId', '');
              }
            }}
            className="mt-2"
          >
            <RadioOption value="all">
              <div>
                <div className="font-medium">All Branches</div>
                <div className="text-sm text-text-muted">Use this sheet for any branch</div>
              </div>
            </RadioOption>
            <RadioOption value="specific">
              <div>
                <div className="font-medium">Specific Branch</div>
                <div className="text-sm text-text-muted">Limit to one branch only</div>
              </div>
            </RadioOption>
          </RadioGroup>

          {formData.branchScopeType === 'specific' && (
            <div className="mt-3">
              <Select
                value={formData.specificBranchId}
                onChange={(e) => updateField('specificBranchId', e.target.value)}
                className={touched.specificBranch && errors.specificBranch ? 'border-error' : ''}
              >
                <option value="">Select branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </Select>
              {touched.specificBranch && errors.specificBranch && (
                <p className="text-sm text-error mt-1">{errors.specificBranch}</p>
              )}
            </div>
          )}
        </div>

        {/* Item Criteria */}
        <div>
          <Label>Item Selection Criteria</Label>
          
          {/* Categories */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-text-primary mb-2">Categories</h4>
            <div className="grid grid-cols-2 gap-2">
              {categories.map(category => (
                <label key={category.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={formData.categoryIds.includes(category.id)}
                    onChange={(checked) => handleMultiSelect('categoryIds', category.id, checked)}
                  />
                  {category.name}
                </label>
              ))}
            </div>
          </div>

          {/* Suppliers */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-text-primary mb-2">Suppliers</h4>
            <div className="grid grid-cols-2 gap-2">
              {suppliers.map(supplier => (
                <label key={supplier.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={formData.supplierIds.includes(supplier.id)}
                    onChange={(checked) => handleMultiSelect('supplierIds', supplier.id, checked)}
                  />
                  {supplier.name}
                </label>
              ))}
            </div>
          </div>

          {/* Storage Areas */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-text-primary mb-2">Storage Areas</h4>
            <div className="grid grid-cols-2 gap-2">
              {storageAreas.map(area => (
                <label key={area.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={formData.storageAreaIds.includes(area.id)}
                    onChange={(checked) => handleMultiSelect('storageAreaIds', area.id, checked)}
                  />
                  {area.name}
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-text-primary mb-2">Options</h4>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={formData.includeZeroStock}
                onChange={(checked) => updateField('includeZeroStock', checked)}
              />
              Include items with zero stock
            </label>
          </div>

          {/* Validation Error */}
          {touched.criteria && errors.criteria && (
            <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-md text-error text-sm">
              {errors.criteria}
            </div>
          )}
        </div>

        {/* Preview Section */}
        {isEditing && (
          <div>
            <div className="flex items-center justify-between">
              <Label>Item Preview</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadPreview}
                loading={isLoadingPreview}
              >
                {showPreview ? 'Refresh Preview' : 'Load Preview'}
              </Button>
            </div>
            
            {showPreview && (
              <div className="mt-3 border border-border rounded-lg">
                {isLoadingPreview ? (
                  <div className="p-4 space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : preview ? (
                  <>
                    <div className="px-4 py-3 bg-surface-secondary/50 border-b border-border">
                      <p className="text-sm font-medium text-text-primary">
                        {preview.totalItems} items match this criteria
                      </p>
                    </div>
                    <div className="max-h-60 overflow-auto">
                      {preview.items.map(item => (
                        <div key={item.itemId} className="px-4 py-3 border-b border-border last:border-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-text-primary text-sm">{item.name}</div>
                              <div className="text-xs text-text-muted">{item.sku} · {item.unit}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-text-primary">
                                Stock: {item.currentStock}
                              </div>
                              <div className="text-xs text-text-muted">
                                {item.categoryName}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {preview.totalPages > 1 && (
                      <div className="px-4 py-2 bg-surface-secondary/30 border-t border-border text-center">
                        <p className="text-xs text-text-muted">
                          Showing {preview.items.length} of {preview.totalItems} items
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 text-center text-text-muted">
                    No preview available
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
            variant="primary"
            loading={isSubmitting}
          >
            {isEditing ? 'Update Count Sheet' : 'Create Count Sheet'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
