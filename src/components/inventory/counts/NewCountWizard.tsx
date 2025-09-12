import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../Modal';
import { Button } from '../../Button';
import { Input } from '../../Input';
import { Select } from '../../Select';
import { Label } from '../../Label';
import { Badge } from '../../Badge';
import { Checkbox } from '../../Checkbox';
import { RadioGroup, RadioOption, RadioOptionContent } from '../../ui/RadioGroup';
import { Skeleton } from '../../Skeleton';
import { Tooltip } from '../../ui/Tooltip';
import { useToast } from '../../../hooks/useToast';
import { useApi } from '../../../hooks/useApi';
import type { CreateCountRequest, CountScope } from '../../../inventory/counts/types';

interface NewCountWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (countId: string) => void;
  branches?: Array<{ id: string; name: string; type: string }>;
  categories?: Array<{ id: string; name: string }>;
  itemTypes?: Array<{ id: string; name: string }>;
  storageAreas?: Array<{ id: string; name: string }>;
  loading?: boolean;
  /** When true, render single-step UI (branch + scope together) */
  simpleMode?: boolean;
}

type WizardStep = 'branch' | 'scope' | 'confirmation';
type ScopeType = 'all' | 'categories' | 'itemTypes';

export default function NewCountWizard({
  isOpen,
  onClose,
  onSuccess,
  branches = [],
  categories = [],
  itemTypes = [],
  storageAreas = [],
  loading = false,
  simpleMode = false
}: NewCountWizardProps) {
  let navigate: (to: string) => void;
  try {
    navigate = useNavigate();
  } catch {
    navigate = () => {};
  }
  const [currentStep, setCurrentStep] = useState<WizardStep>('branch');
  const [formData, setFormData] = useState<CreateCountRequest>({
    branchId: '',
    scope: { all: true },
    notes: '',
    estimatedDurationMinutes: 60
  });
  const [scopeType, setScopeType] = useState<ScopeType>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { showToast } = useToast();

  // Validation for each step
  const validateStep = (step: WizardStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'branch':
        if (!formData.branchId || formData.branchId.trim() === '') {
          newErrors.branchId = 'Branch selection is required';
        }
        if (formData.estimatedDurationMinutes < 15 || formData.estimatedDurationMinutes > 480) {
          newErrors.estimatedDurationMinutes = 'Duration must be between 15 and 480 minutes';
        }
        break;
        
      case 'scope':
        if (scopeType === 'categories' && 
            (!formData.scope.filters?.categoryIds || formData.scope.filters.categoryIds.length === 0)) {
          newErrors.categoryIds = 'At least one category must be selected';
        }
        
        if (scopeType === 'itemTypes' && 
            (!formData.scope.filters?.itemTypeIds || formData.scope.filters.itemTypeIds.length === 0)) {
          newErrors.itemTypeIds = 'At least one item type must be selected';
        }
        break;
        
      case 'confirmation':
        // Final validation - ensure we still have valid data
        if (!formData.branchId) {
          newErrors.branch = 'Branch selection is missing';
        }
        // Count sheet support has been removed
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    const steps: WizardStep[] = ['branch', 'scope', 'confirmation'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const steps: WizardStep[] = ['branch', 'scope', 'confirmation'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep('confirmation')) return;

    setIsSubmitting(true);
    try {
      // Use the user-selected scope
      const finalScope: CountScope = formData.scope;

      const requestData: CreateCountRequest = {
        ...formData,
        scope: finalScope,
      };

      // API call
      const response = await fetch('/api/inventory/counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('Failed to create count session');
      }

      const result = await response.json();
      showToast('Count session created successfully', 'success');
      onSuccess(result.countId);
      
    } catch (error) {
      console.error('Error creating count:', error);
      showToast('Failed to create count session', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle scope type selection
  const handleScopeTypeChange = (type: ScopeType) => {
    setScopeType(type);
    
    // Reset scope filters based on selected type
    let newScope: CountScope = { all: false };
    
    switch (type) {
      case 'all':
        newScope = { all: true };
        break;
      case 'categories':
        newScope = { 
          byCategory: true,
          filters: { 
            categoryIds: [] 
          } 
        };
        break;
      case 'itemTypes':
        newScope = { 
          byItemType: true,
          filters: { 
            itemTypeIds: [] 
          } 
        };
        break;
    }
    
    setFormData(prev => ({ ...prev, scope: newScope }));
  };

  // Count templates feature removed

  // Count templates feature removed

  // Step utilities
  const totalSteps = simpleMode ? 1 : 3;
  const currentStepIndex = ['branch', 'scope', 'confirmation'].indexOf(currentStep);
  const stepTitles: Record<WizardStep, string> = {
    'branch': 'Select Branch',
    'scope': 'Define Scope',
    'confirmation': 'Confirm & Create'
  };

  // Check if can proceed to next step
  const canProceed = (step: WizardStep): boolean => {
    switch (step) {
      case 'branch':
        return Boolean(formData.branchId);
      case 'scope':
        if (scopeType === 'all') {
          return true;
        } else if (scopeType === 'categories') {
          return formData.scope.filters?.categoryIds && formData.scope.filters.categoryIds.length > 0;
        } else if (scopeType === 'itemTypes') {
          return formData.scope.filters?.itemTypeIds && formData.scope.filters.itemTypeIds.length > 0;
        }
        return false;
      case 'confirmation':
        // Just check branch is selected
        return Boolean(formData.branchId);
      default:
        return false;
    }
  };
  // Lightweight proceed check for simple mode
  const canProceedSimple = (): boolean => {
    if (!formData.branchId) return false;
    if (scopeType === 'all') return true;
    if (scopeType === 'categories') {
      return Boolean(formData.scope.filters?.categoryIds && formData.scope.filters.categoryIds.length > 0);
    }
    if (scopeType === 'itemTypes') {
      return Boolean(formData.scope.filters?.itemTypeIds && formData.scope.filters.itemTypeIds.length > 0);
    }
    return false;
  };

  // Simple single-step mode: show Branch + Scope together and create directly
  if (simpleMode) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create New Inventory Audit"
        description="Choose a branch and scope to start auditing"
        size="lg"
        closeOnOverlayClick={!isSubmitting}
      >
        <div className="space-y-8 p-6">
          {/* Branch Selection */}
          <div className="space-y-6">
            <div>
              <Label htmlFor="branch-select" required>
                Branch Location
              </Label>
              <Select
                id="branch-select"
                value={formData.branchId}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, branchId: value }));
                  if (errors.branchId) setErrors(prev => ({ ...prev, branchId: '' }));
                }}
                placeholder="Select branch location..."
                options={branches.map(branch => ({ value: branch.id, label: `${branch.name} (${branch.type})` }))}
                error={errors.branchId}
              />
            </div>

            <div className="bg-surface-secondary/30 p-4 rounded-md border border-border">
              <div className="text-sm text-text-primary">
                <p>This will create a snapshot of the inventory at the time of audit creation.</p>
                <p className="mt-2 text-xs text-text-muted">Inventory movements during the audit will be tracked and displayed when the audit is completed.</p>
              </div>
            </div>
          </div>

          {/* Scope */}
          <div className="space-y-6">
            <div>
              <Label>Audit Scope</Label>
              <RadioGroup 
                name="count-scope"
                value={scopeType} 
                onValueChange={(value) => handleScopeTypeChange(value as ScopeType)}
                className="mt-3 space-y-3"
              >
                <RadioOption value="all">
                  <RadioOptionContent
                    title="All Items"
                    description="Audit will include all active inventory items"
                  />
                </RadioOption>
                <RadioOption value="categories">
                  <RadioOptionContent
                    title="Filtered Items"
                    description="Select specific inventory categories to audit"
                  />
                </RadioOption>
                <RadioOption value="itemTypes">
                  <RadioOptionContent
                    title="By Item Type"
                    description="Select specific item types to audit"
                  />
                </RadioOption>
              </RadioGroup>
            </div>

            {/* Dynamic selection for chosen scope */}
            {scopeType === 'categories' && (
              <div className="space-y-3">
                <Label required>Categories</Label>
                <div className="p-4 bg-surface-secondary/30 rounded-md border border-border">
                  {!formData.branchId ? (
                    <p className="text-sm text-text-muted">Select a branch first.</p>
                  ) : (categories.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto space-y-2">
                      {categories.map(category => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`cat-${category.id}`}
                            checked={(formData.scope.filters?.categoryIds || []).includes(category.id)}
                            disabled={!formData.branchId}
                            onCheckedChange={(checked) => {
                              const categoryIds = [...(formData.scope.filters?.categoryIds || [])];
                              if (checked) {
                                if (!categoryIds.includes(category.id)) categoryIds.push(category.id);
                              } else {
                                const index = categoryIds.indexOf(category.id);
                                if (index !== -1) categoryIds.splice(index, 1);
                              }
                              setFormData(prev => ({
                                ...prev,
                                scope: {
                                  ...prev.scope,
                                  filters: {
                                    ...(prev.scope.filters || {}),
                                    categoryIds
                                  }
                                }
                              }));
                              if (errors.categoryIds && categoryIds.length > 0) {
                                setErrors(prev => ({ ...prev, categoryIds: '' }));
                              }
                            }}
                          />
                          <label 
                            htmlFor={`cat-${category.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">No categories available.</p>
                  ))}
                </div>
                {errors.categoryIds && (
                  <p className="text-destructive text-sm mt-1">{errors.categoryIds}</p>
                )}
              </div>
            )}

            {scopeType === 'itemTypes' && (
              <div className="space-y-3">
                <Label required>Item Types</Label>
                <div className="p-4 bg-surface-secondary/30 rounded-md border border-border">
                  {!formData.branchId ? (
                    <p className="text-sm text-text-muted">Select a branch first.</p>
                  ) : (itemTypes.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto space-y-2">
                      {itemTypes.map(t => (
                        <div key={t.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`type-${t.id}`}
                            checked={(formData.scope.filters?.itemTypeIds || []).includes(t.id)}
                            disabled={!formData.branchId}
                            onCheckedChange={(checked) => {
                              const itemTypeIds = [...(formData.scope.filters?.itemTypeIds || [])];
                              if (checked) {
                                if (!itemTypeIds.includes(t.id)) itemTypeIds.push(t.id);
                              } else {
                                const index = itemTypeIds.indexOf(t.id);
                                if (index !== -1) itemTypeIds.splice(index, 1);
                              }
                              setFormData(prev => ({
                                ...prev,
                                scope: {
                                  ...prev.scope,
                                  filters: {
                                    ...(prev.scope.filters || {}),
                                    itemTypeIds
                                  }
                                }
                              }));
                              if (errors.itemTypeIds && itemTypeIds.length > 0) {
                                setErrors(prev => ({ ...prev, itemTypeIds: '' }));
                              }
                            }}
                          />
                          <label 
                            htmlFor={`type-${t.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {t.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">No item types available.</p>
                  ))}
                </div>
                {errors.itemTypeIds && (
                  <p className="text-destructive text-sm mt-1">{errors.itemTypeIds}</p>
                )}
              </div>
            )}
          </div>
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isSubmitting}
              disabled={loading || !canProceedSimple()}
              onClick={handleSubmit}
            >
              Create Count
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Inventory Audit"
      description="Set up a new audit session to reconcile stock levels"
      size="lg"
      closeOnOverlayClick={!isSubmitting}
    >
      <div className="space-y-6 p-6">
        {/* Step Progress */}
        <div className="flex items-center">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <React.Fragment key={index}>
              <div className={
                index <= currentStepIndex 
                  ? 'flex items-center justify-center w-8 h-8 rounded-full border-2 font-medium text-sm bg-brand border-brand text-text-inverse'
                  : 'flex items-center justify-center w-8 h-8 rounded-full border-2 font-medium text-sm bg-surface-secondary border-border text-text-muted'
              }>
                {index + 1}
              </div>
              {index < totalSteps - 1 && (
                <div className={
                  index < currentStepIndex 
                    ? 'flex-1 h-0.5 bg-brand mx-4' 
                    : 'flex-1 h-0.5 bg-border mx-4'
                } />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Title */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            {stepTitles[currentStep]}
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Step {currentStepIndex + 1} of {totalSteps}
          </p>
        </div>

        {/* Step Content */}
        <div className="min-h-64">
          {currentStep === 'branch' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="branch-select" required>
                  Branch Location
                </Label>
                <Select
                  id="branch-select"
                  value={formData.branchId}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, branchId: value }));
                    // Clear branch error when user selects
                    if (errors.branchId) {
                      setErrors(prev => ({ ...prev, branchId: '' }));
                    }
                  }}
                  placeholder="Select branch location..."
                  options={branches.map(branch => ({
                    value: branch.id,
                    label: `${branch.name} (${branch.type})`
                  }))}
                  error={errors.branchId}
                />
              </div>

              <div className="bg-surface-secondary/30 p-4 rounded-md border border-border">
                <div className="text-sm text-text-primary">
                  <p>This will create a snapshot of the inventory at the time of audit creation.</p>
                  <p className="mt-2 text-xs text-text-muted">Inventory movements during the audit will be tracked and displayed when the audit is completed.</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'scope' && (
            <div className="space-y-6">
              {/* Scope Type Selection */}
              <div>
                <Label>Audit Scope</Label>
                <RadioGroup
                  name="count-scope"
                  value={scopeType}
                  onValueChange={(value) => handleScopeTypeChange(value as ScopeType)}
                  className="mt-3 space-y-3"
                >
                  <RadioOption value="all">
                    <RadioOptionContent
                      title="All Items"
                      description="Audit will include all active inventory items at selected branch"
                    />
                  </RadioOption>
                  <RadioOption value="categories">
                    <RadioOptionContent
                      title="Filtered Items"
                      description="Select specific inventory categories to audit"
                    />
                  </RadioOption>
                  <RadioOption value="itemTypes">
                    <RadioOptionContent
                      title="By Item Type"
                      description="Select specific item types to audit"
                    />
                  </RadioOption>
                </RadioGroup>
              </div>

              {/* Category Selection */}
              {scopeType === 'categories' && (
                <div className="space-y-3">
                  <Label required>Categories</Label>
                  <div className="p-4 bg-surface-secondary/30 rounded-md border border-border">
                    {!formData.branchId ? (
                      <p className="text-sm text-text-muted">Select a branch first.</p>
                    ) : (categories.length > 0 ? (
                      <div className="max-h-56 overflow-y-auto space-y-2">
                        {categories.map(category => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`cat-${category.id}`}
                              checked={(formData.scope.filters?.categoryIds || []).includes(category.id)}
                              disabled={!formData.branchId}
                              onCheckedChange={(checked) => {
                                const categoryIds = [...(formData.scope.filters?.categoryIds || [])];
                                
                                if (checked) {
                                  categoryIds.push(category.id);
                                } else {
                                  const index = categoryIds.indexOf(category.id);
                                  if (index !== -1) categoryIds.splice(index, 1);
                                }
                                
                                setFormData(prev => ({
                                  ...prev,
                                  scope: {
                                    ...prev.scope,
                                    filters: {
                                      ...(prev.scope.filters || {}),
                                      categoryIds
                                    }
                                  }
                                }));
                                
                                if (errors.categoryIds && categoryIds.length > 0) {
                                  setErrors(prev => ({ ...prev, categoryIds: '' }));
                                }
                              }}
                            />
                            <label 
                              htmlFor={`cat-${category.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {category.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted">No categories available.</p>
                    ))}
                                  </div>
                  {errors.categoryIds && (
                    <p className="text-destructive text-sm mt-1">{errors.categoryIds}</p>
                                  )}
                                </div>
              )}

              {/* Item Type Selection */}
              {scopeType === 'itemTypes' && (
                <div className="space-y-3">
                  <Label required>Item Types</Label>
                  <div className="p-4 bg-surface-secondary/30 rounded-md border border-border">
                    {!formData.branchId ? (
                      <p className="text-sm text-text-muted">Select a branch first.</p>
                    ) : (itemTypes.length > 0 ? (
                      <div className="max-h-56 overflow-y-auto space-y-2">
                        {itemTypes.map(t => (
                          <div key={t.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`type-${t.id}`}
                              checked={(formData.scope.filters?.itemTypeIds || []).includes(t.id)}
                              disabled={!formData.branchId}
                              onCheckedChange={(checked) => {
                                const itemTypeIds = [...(formData.scope.filters?.itemTypeIds || [])];
                                if (checked) {
                                  if (!itemTypeIds.includes(t.id)) itemTypeIds.push(t.id);
                                } else {
                                  const index = itemTypeIds.indexOf(t.id);
                                  if (index !== -1) itemTypeIds.splice(index, 1);
                                }
                                setFormData(prev => ({
                                  ...prev,
                                  scope: {
                                    ...prev.scope,
                                    filters: {
                                      ...(prev.scope.filters || {}),
                                      itemTypeIds
                                    }
                                  }
                                }));
                                if (errors.itemTypeIds && itemTypeIds.length > 0) {
                                  setErrors(prev => ({ ...prev, itemTypeIds: '' }));
                                }
                              }}
                            />
                            <label 
                              htmlFor={`type-${t.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {t.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted">No item types available.</p>
                    ))}
                  </div>
                  {errors.itemTypeIds && (
                    <p className="text-destructive text-sm mt-1">{errors.itemTypeIds}</p>
                  )}
                </div>
              )}

              {/* Count sheets feature completely removed */}
            </div>
          )}

          {currentStep === 'confirmation' && (
            <div className="space-y-6">
              {/* Count Summary */}
              <div className="bg-surface-secondary rounded-lg p-4 border border-border">
                <h4 className="font-semibold text-text-primary mb-3">Count Summary</h4>
                
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Branch:</dt>
                    <dd className="text-text-primary font-medium">
                      {branches.find(b => b.id === formData.branchId)?.name || formData.branchId}
                    </dd>
                  </div>
                  
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Scope:</dt>
                    <dd className="text-text-primary">
                      {scopeType === 'all' && 'All Items'}
                      {scopeType === 'categories' && (
                        <span>
                          By Categories ({formData.scope.filters?.categoryIds?.length || 0})
                        </span>
                      )}
                      {scopeType === 'itemTypes' && (
                        <span>
                          By Item Types ({formData.scope.filters?.itemTypeIds?.length || 0})
                        </span>
                      )}
                    </dd>
                  </div>
                  
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Inventory:</dt>
                    <dd className="text-text-primary">
                      Snapshot at creation time
                    </dd>
                  </div>
                  
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Estimated Items:</dt>
                    <dd className="text-text-primary">
                      ~500 items
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Optional Notes */}
              <div>
                <Label htmlFor="count-notes">Notes (Optional)</Label>
                <Input
                  id="count-notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes about this count session..."
                  maxLength={500}
                />
              </div>

              {/* Important Notice */}
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex">
                  <svg className="flex-shrink-0 h-5 w-5 text-warning mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-warning">Important</h4>
                    <p className="text-sm text-warning/80 mt-1">
                      This will create a snapshot of current theoretical quantities. 
                      Inventory movements during audit will be tracked and shown at completion.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-border">
          <div className="flex space-x-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            
            {currentStep !== 'branch' && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            {currentStep !== 'confirmation' ? (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={loading || !canProceed(currentStep)}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting || !canProceed(currentStep)}
                loading={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Count'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

