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
import type { CountSheet, CountSheetsResponse, CountSheetPreview } from '../../../inventory/count-sheets/types';
import { CountSheetUtils } from '../../../inventory/count-sheets/types';
import { countSheetsApiService } from '../../../inventory/count-sheets/api';

interface NewCountWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (countId: string) => void;
  branches?: Array<{ id: string; name: string; type: string }>;
  categories?: Array<{ id: string; name: string }>;
  suppliers?: Array<{ id: string; name: string }>;
  storageAreas?: Array<{ id: string; name: string }>;
  loading?: boolean;
  /** When true, render single-step UI (branch + scope together) */
  simpleMode?: boolean;
}

type WizardStep = 'branch' | 'scope' | 'confirmation';
type ScopeType = 'all' | 'countSheet';

export default function NewCountWizard({
  isOpen,
  onClose,
  onSuccess,
  branches = [],
  categories = [],
  suppliers = [],
  storageAreas = [],
  loading = false,
  simpleMode = false
}: NewCountWizardProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>('branch');
  const [formData, setFormData] = useState<CreateCountRequest>({
    branchId: '',
    scope: { all: true },
    notes: '',
    estimatedDurationMinutes: 60
  });
  const [freezeInventory, setFreezeInventory] = useState(false);
  const [scopeType, setScopeType] = useState<ScopeType>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // For count sheets selection
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [showNewSheetButton, setShowNewSheetButton] = useState(false);
  
  // Sheet preview data
  const [sheetPreviews, setSheetPreviews] = useState<Record<string, { totalItems: number, loading: boolean }>>({});
  
  const { showToast } = useToast();
  
  // Get available count sheets
  const { data: countSheetsResponse, loading: sheetsLoading } = useApi<CountSheetsResponse>('/api/inventory/count-sheets', {
    params: { archived: false }
  });
  
  const countSheets = countSheetsResponse?.data || [];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('branch');
      setFormData({
        branchId: '',
        scope: { all: true },
        notes: '',
        estimatedDurationMinutes: 60
      });
      setFreezeInventory(false);
      setScopeType('all');
      setSelectedSheetId('');
      setShowNewSheetButton(false);
      setSheetPreviews({});
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Load sheet previews when we have sheets and a branch
  useEffect(() => {
    if (formData.branchId && countSheets.length > 0 && scopeType === 'countSheet') {
      loadSheetPreviews();
    }
  }, [countSheets, formData.branchId, scopeType]);

  // Load preview counts for all sheets
  const loadSheetPreviews = async () => {
    if (!formData.branchId) return;
    
    // Initialize loading states
    const initialPreviews: Record<string, { totalItems: number, loading: boolean }> = {};
    countSheets.forEach(sheet => {
      initialPreviews[sheet.id] = { totalItems: 0, loading: true };
    });
    setSheetPreviews(initialPreviews);
    
    // Load all previews in parallel
    const previewPromises = countSheets.map(async sheet => {
      try {
        const preview = await countSheetsApiService.previewCountSheet(
          sheet.id,
          { branchId: formData.branchId }
        );
        return { id: sheet.id, preview };
      } catch (error) {
        console.error(`Error loading preview for sheet ${sheet.id}:`, error);
        return { id: sheet.id, error };
      }
    });
    
    // Process results
    const results = await Promise.allSettled(previewPromises);
    const newPreviews = { ...initialPreviews };
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { id, preview, error } = result.value;
        if (preview && !error) {
          newPreviews[id] = { 
            totalItems: preview.totalItems,
            loading: false 
          };
        } else {
          newPreviews[id] = { totalItems: 0, loading: false };
        }
      }
    });
    
    setSheetPreviews(newPreviews);
  };

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
        if (scopeType === 'countSheet') {
          if (!selectedSheetId) {
            newErrors.countSheet = 'Please select a count sheet or create a new one';
          } else if (sheetPreviews[selectedSheetId]?.totalItems === 0) {
            newErrors.countSheet = 'Selected sheet contains no items. Please select a different sheet or create a new one.';
          }
        }
        break;
        
      case 'confirmation':
        // Final validation - ensure we still have valid data
        if (!formData.branchId) {
          newErrors.branch = 'Branch selection is missing';
        }
        if (scopeType === 'countSheet') {
          if (!selectedSheetId) {
            newErrors.countSheet = 'Count sheet selection is required';
          } else if (sheetPreviews[selectedSheetId]?.totalItems === 0) {
            newErrors.countSheet = 'Selected sheet contains no items';
          }
        }
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
      if (scopeType === 'countSheet' && selectedSheetId) {
        // When using a count sheet, redirect to the dedicated page
        onClose();
        const params = new URLSearchParams({
          sheetId: selectedSheetId
        });
        if (freezeInventory) {
          params.append('freeze', 'true');
          params.append('duration', formData.estimatedDurationMinutes.toString());
        }
        navigate(`/inventory/counts/new?${params.toString()}`);
        return;
      }
      
      // For "all items" scope
      const finalScope: CountScope = { all: true };

      const requestData: CreateCountRequest = {
        ...formData,
        scope: finalScope,
        freezeInventory // Add freeze inventory flag to request
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

  const handleScopeTypeChange = (newScopeType: ScopeType) => {
    setScopeType(newScopeType);
    
    if (newScopeType === 'all') {
      setFormData(prev => ({ ...prev, scope: { all: true } }));
      setSelectedSheetId('');
    } else if (newScopeType === 'countSheet') {
      setSelectedSheetId('');
      setShowNewSheetButton(true);
      loadSheetPreviews();
    }
  };

  const handleCreateNewSheet = () => {
    onClose(); // Close this modal
    navigate('/inventory/count-sheets'); // Navigate to count sheets
  };

  const handleCountSheetChange = (sheetId: string) => {
    // Only allow selection if sheet has items
    if (sheetPreviews[sheetId]?.totalItems > 0) {
      setSelectedSheetId(sheetId);
      if (errors.countSheet) {
        setErrors(prev => ({ ...prev, countSheet: '' }));
      }
    } else if (sheetPreviews[sheetId]?.loading) {
      // Don't allow selection while loading
      showToast({
        title: 'Loading Items',
        description: 'Please wait while we check the count sheet contents',
        variant: 'warning'
      });
    } else {
      // Show error message for empty sheets
      showToast({
        title: 'Empty Sheet',
        description: 'This count sheet contains no items. Please select a different sheet or create a new one.',
        variant: 'error'
      });
    }
  };

  // Step utilities
  const totalSteps = simpleMode ? 1 : 3;
  const currentStepIndex = ['branch', 'scope', 'confirmation'].indexOf(currentStep);
  const stepTitles: Record<WizardStep, string> = {
    'branch': 'Select Branch Location',
    'scope': 'Define Count Scope',
    'confirmation': 'Confirm and Create'
  };

  // Check if can proceed to next step
  const canProceed = (step: WizardStep): boolean => {
    switch (step) {
      case 'branch':
        return Boolean(formData.branchId);
      case 'scope':
        if (scopeType === 'all') return true;
        if (scopeType === 'countSheet') {
          const hasValidSheet = Boolean(selectedSheetId) && 
            sheetPreviews[selectedSheetId]?.totalItems > 0 && 
            !sheetPreviews[selectedSheetId]?.loading;
          return hasValidSheet;
        }
        return false;
      case 'confirmation':
        if (!formData.branchId) return false;
        if (scopeType === 'countSheet') {
          return Boolean(selectedSheetId) && 
            sheetPreviews[selectedSheetId]?.totalItems > 0;
        }
        return true;
      default:
        return false;
    }
  };

  // Simple single-step mode: show Branch + Scope together and create directly
  if (simpleMode) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create New Inventory Count"
        description="Choose a branch and scope to start counting"
        size="lg"
        closeOnOverlayClick={!isSubmitting}
      >
        <div className="space-y-8 p-6">
          {/* Branch + Freeze */}
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
              <div className="flex items-center">
                <Checkbox
                  id="freeze-inventory"
                  checked={freezeInventory}
                  onChange={(e) => setFreezeInventory(e.target.checked)}
                />
                <Label htmlFor="freeze-inventory" className="ml-2 cursor-pointer">
                  Freeze Inventory During Count
                  <Tooltip content="Prevents inventory adjustments while counting to maintain accuracy" side="right">
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-secondary text-text-muted text-xs">?</span>
                  </Tooltip>
                </Label>
              </div>

              {freezeInventory && (
                <div className="mt-4 ml-6 space-y-2">
                  <Label htmlFor="estimated-duration" required>
                    Estimated Duration (minutes)
                  </Label>
                  <Input
                    id="estimated-duration"
                    type="number"
                    value={formData.estimatedDurationMinutes?.toString() || '60'}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 60;
                      setFormData(prev => ({ ...prev, estimatedDurationMinutes: value }));
                      if (errors.estimatedDurationMinutes) setErrors(prev => ({ ...prev, estimatedDurationMinutes: '' }));
                    }}
                    min="15"
                    max="480"
                    error={errors.estimatedDurationMinutes}
                    helpText="Set the time limit for the inventory freeze (15-480 minutes)"
                    className="w-28"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Scope */}
          <div className="space-y-6">
            <div>
              <Label>Count Scope</Label>
              <div className="mt-3">
                <RadioGroup value={scopeType} onChange={handleScopeTypeChange} name="scope-type">
                  <RadioOption value="all">
                    <RadioOptionContent title="All Items" description="Count all active inventory items at selected branch" />
                  </RadioOption>
                  <RadioOption value="countSheet">
                    <RadioOptionContent title="Use Count Sheet" description="Select from saved count templates with predefined item scopes" />
                  </RadioOption>
                </RadioGroup>
              </div>
            </div>

            {scopeType === 'countSheet' && (
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg bg-surface-secondary/50">
                  <Label htmlFor="sheet-select" className="mb-2 block" required>
                    Select Count Sheet
                  </Label>
                  {sheetsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : countSheets.length > 0 ? (
                    <>
                      <div className="space-y-2 max-h-56 overflow-y-auto pb-2">
                        {countSheets.map(sheet => {
                          const preview = sheetPreviews[sheet.id];
                          const isLoading = !preview || preview.loading;
                          const isEmpty = preview?.totalItems === 0;
                          const isSelected = selectedSheetId === sheet.id;
                          const isDisabled = isLoading || isEmpty;
                          return (
                            <div
                              key={sheet.id}
                              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                                isDisabled ? 'opacity-60 cursor-not-allowed' :
                                isSelected ? 'border-brand-600 bg-brand-50' :
                                'border-border hover:bg-surface-secondary'
                              }`}
                              onClick={() => !isDisabled && handleCountSheetChange(sheet.id)}
                              role="button"
                              tabIndex={isDisabled ? -1 : 0}
                              aria-selected={isSelected}
                              aria-disabled={isDisabled}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium text-text-primary">{sheet.name}</h4>
                                  <div className="text-xs text-text-muted mt-1">
                                    {CountSheetUtils.formatBranchScope(sheet.branchScope, branches)}
                                  </div>
                                </div>
                                <div>
                                  {isLoading ? (
                                    <Badge variant="outline" size="sm">Loading...</Badge>
                                  ) : isEmpty ? (
                                    <Badge variant="destructive" size="sm" className="text-xs">Empty Sheet</Badge>
                                  ) : (
                                    <Badge variant="outline" size="sm" className="text-xs">
                                      {preview.totalItems} {preview.totalItems === 1 ? 'item' : 'items'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm" onClick={handleCreateNewSheet}>
                          Create New Sheet
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <p className="text-text-muted mb-3">No count sheets available.</p>
                      <Button variant="outline" onClick={handleCreateNewSheet}>
                        Create New Count Sheet
                      </Button>
                    </div>
                  )}
                </div>
                {errors.countSheet && (
                  <div className="p-3 bg-error-50 border border-error-200 rounded-lg">
                    <p className="text-sm text-error-700">{errors.countSheet}</p>
                  </div>
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
              disabled={loading || !canProceed('confirmation')}
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
      title="Create New Inventory Count"
      description="Set up a new count session to reconcile stock levels"
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
                <div className="flex items-center">
                  <Checkbox
                    id="freeze-inventory"
                    checked={freezeInventory}
                    onChange={(e) => {
                      // Use the checkbox's checked property from the event
                      setFreezeInventory(e.target.checked);
                    }}
                  />
                  <Label htmlFor="freeze-inventory" className="ml-2 cursor-pointer">
                    Freeze Inventory During Count
                    <Tooltip content="Prevents inventory adjustments while counting to maintain accuracy" side="right">
                      <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-secondary text-text-muted text-xs">?</span>
                    </Tooltip>
                  </Label>
                </div>
                
                {freezeInventory && (
                  <div className="mt-4 ml-6 space-y-2">
                    <Label htmlFor="estimated-duration" required>
                      Estimated Duration (minutes)
                    </Label>
                    <Input
                      id="estimated-duration"
                      type="number"
                      value={formData.estimatedDurationMinutes?.toString() || '60'}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 60;
                        setFormData(prev => ({ ...prev, estimatedDurationMinutes: value }));
                        if (errors.estimatedDurationMinutes) {
                          setErrors(prev => ({ ...prev, estimatedDurationMinutes: '' }));
                        }
                      }}
                      min="15"
                      max="480"
                      error={errors.estimatedDurationMinutes}
                      helpText="Set the time limit for the inventory freeze (15-480 minutes)"
                      className="w-28"
                    />
                    
                    <div className="text-xs text-text-muted mt-1 bg-info/10 p-2 rounded border border-info/20">
                      <p>While frozen, inventory transactions will be queued and applied after the count completes or when manually unfrozen by an admin.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'scope' && (
            <div className="space-y-6">
              {/* Scope Type Selection */}
              <div>
                <Label>Count Scope</Label>
                <div className="mt-3">
                  <RadioGroup
                    value={scopeType}
                    onChange={handleScopeTypeChange}
                    name="scope-type"
                  >
                    <RadioOption value="all">
                      <RadioOptionContent
                        title="All Items"
                        description="Count all active inventory items at selected branch"
                      />
                    </RadioOption>

                    <RadioOption value="countSheet">
                      <RadioOptionContent
                        title="Use Count Sheet"
                        description="Select from saved count templates with predefined item scopes"
                      />
                    </RadioOption>
                  </RadioGroup>
                </div>
              </div>

              {/* Count Sheet Selection */}
              {scopeType === 'countSheet' && (
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg bg-surface-secondary/50">
                    <Label htmlFor="sheet-select" className="mb-2 block" required>
                      Select Count Sheet
                    </Label>
                    
                    {sheetsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : countSheets.length > 0 ? (
                      <>
                        <div className="space-y-2 max-h-56 overflow-y-auto pb-2">
                          {countSheets.map(sheet => {
                            const preview = sheetPreviews[sheet.id];
                            const isLoading = !preview || preview.loading;
                            const isEmpty = preview?.totalItems === 0;
                            const isSelected = selectedSheetId === sheet.id;
                            const isDisabled = isLoading || isEmpty;
                            
                            return (
                              <div 
                                key={sheet.id} 
                                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                                  isDisabled ? 'opacity-60 cursor-not-allowed' :
                                  isSelected ? 'border-primary bg-primary/10' :
                                  'border-border hover:bg-surface-secondary'
                                }`}
                                onClick={() => !isDisabled && handleCountSheetChange(sheet.id)}
                                role="button"
                                tabIndex={isDisabled ? -1 : 0}
                                aria-selected={isSelected}
                                aria-disabled={isDisabled}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium text-text-primary">{sheet.name}</h4>
                                    <div className="text-xs text-text-muted mt-1">
                                      {CountSheetUtils.formatBranchScope(sheet.branchScope, branches)}
                                    </div>
                                  </div>
                                  <div>
                                    {isLoading ? (
                                      <Badge variant="outline" size="sm">Loading...</Badge>
                                    ) : isEmpty ? (
                                      <Badge variant="destructive" size="sm" className="text-xs">Empty Sheet</Badge>
                                    ) : (
                                      <Badge variant="outline" size="sm" className="text-xs">
                                        {preview.totalItems} {preview.totalItems === 1 ? 'item' : 'items'}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {CountSheetUtils.formatScopeSummary(sheet.criteria, {
                                    categories, suppliers, storageAreas
                                  }).slice(0, 2).map((item, index) => (
                                    <Badge key={index} variant="secondary" size="sm" className="text-xs">
                                      {item.label}
                                    </Badge>
                                  ))}
                                  {CountSheetUtils.formatScopeSummary(sheet.criteria, {
                                    categories, suppliers, storageAreas
                                  }).length > 2 && (
                                    <Badge variant="secondary" size="sm" className="text-xs">
                                      +{CountSheetUtils.formatScopeSummary(sheet.criteria, {
                                        categories, suppliers, storageAreas
                                      }).length - 2} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-end mt-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleCreateNewSheet}
                          >
                            Create New Sheet
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-4">
                        <p className="text-text-muted mb-3">No count sheets available.</p>
                        <Button 
                          variant="outline"
                          onClick={handleCreateNewSheet}
                        >
                          Create New Count Sheet
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {errors.countSheet && (
                    <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
                      <p className="text-sm text-error">{errors.countSheet}</p>
                    </div>
                  )}
                </div>
              )}
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
                      {scopeType === 'countSheet' && selectedSheetId && (
                        <div className="flex items-center">
                          <span>Using sheet: </span>
                          <span className="font-medium ml-1">
                            {countSheets.find(s => s.id === selectedSheetId)?.name || selectedSheetId}
                          </span>
                        </div>
                      )}
                    </dd>
                  </div>
                  
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Inventory:</dt>
                    <dd className="text-text-primary">
                      {freezeInventory 
                        ? `Frozen (${formData.estimatedDurationMinutes} minute limit)`
                        : 'Not frozen'}
                    </dd>
                  </div>
                  
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Estimated Items:</dt>
                    <dd className="text-text-primary">
                      {scopeType === 'all' ? '~500 items' :
                       scopeType === 'countSheet' && selectedSheetId ? 
                        `${sheetPreviews[selectedSheetId]?.totalItems || 0} items` :
                        'Unknown'}
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
                      {freezeInventory ? ' Inventory will be frozen until counting is complete or manually unfrozen.' : ''}
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
