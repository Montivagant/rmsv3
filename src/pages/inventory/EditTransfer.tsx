import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Label } from '../../components/Label';
import { FormField } from '../../components/FormField';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { transferApiService } from '../../inventory/transfers/api';
import type { 
  Transfer, 
  Location, 
  CreateTransferRequest 
} from '../../inventory/transfers/types';
import { TransferUtils } from '../../inventory/transfers/types';

interface TransferLineInput {
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  qtyPlanned: number;
  availableQty?: number;
  isFractional?: boolean;
}

interface ItemSearchResult {
  id: string;
  sku: string;
  name: string;
  unit: string;
  availableQty?: number;
  isFractional?: boolean;
}

export default function EditTransfer() {
  const { transferId } = useParams<{ transferId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Form state
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<TransferLineInput[]>([]);
  
  // Item search state
  const [itemSearch, setItemSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ItemSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data fetching
  const { data: transfer, loading, error } = useApi<Transfer>(
    transferId ? `/api/inventory/transfers/${transferId}` : null
  );
  const { data: locations = [] } = useApi<Location[]>('/api/inventory/locations');

  // Initialize form with transfer data
  useEffect(() => {
    if (transfer && transfer.status === 'DRAFT') {
      setSourceLocationId(transfer.sourceLocationId);
      setDestinationLocationId(transfer.destinationLocationId);
      setNotes(transfer.notes || '');
      
      // Convert transfer lines to edit format
      setLines(transfer.lines.map(line => ({
        itemId: line.itemId,
        sku: line.sku,
        name: line.name,
        unit: line.unit,
        qtyPlanned: line.qtyPlanned,
        isFractional: ['kg', 'L'].includes(line.unit)
      })));
    }
  }, [transfer]);

  // Search for items when user types
  useEffect(() => {
    if (!sourceLocationId || itemSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      try {
        const results = await transferApiService.searchItems(itemSearch, sourceLocationId);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Item search failed:', error);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [itemSearch, sourceLocationId]);

  // Handlers
  const handleBack = () => {
    if (transferId) {
      navigate(`/inventory/transfers/${transferId}`);
    } else {
      navigate('/inventory/transfers');
    }
  };

  const handleAddItem = (item: ItemSearchResult) => {
    if (lines.some(l => l.itemId === item.id)) {
      showToast({
        title: 'Item Already Added',
        description: `${item.name} is already in the transfer`,
        variant: 'warning'
      });
      return;
    }

    setLines([...lines, {
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      qtyPlanned: 1,
      availableQty: item.availableQty,
      isFractional: item.isFractional
    }]);

    setItemSearch('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleQuantityChange = (index: number, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    const line = lines[index];
    if (!line.isFractional && numValue % 1 !== 0) {
      setErrors(prev => ({ ...prev, [`line_${index}_qty`]: 'Must be whole units' }));
      return;
    }

    const newLines = [...lines];
    newLines[index] = { ...line, qtyPlanned: numValue };
    setLines(newLines);

    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`line_${index}_qty`];
      return newErrors;
    });
  };

  const handleRemoveItem = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!sourceLocationId) {
      newErrors.sourceLocation = 'Source location is required';
    }
    if (!destinationLocationId) {
      newErrors.destinationLocation = 'Destination location is required';
    }
    if (sourceLocationId && destinationLocationId && sourceLocationId === destinationLocationId) {
      newErrors.destinationLocation = 'Source and destination must be different';
    }
    if (lines.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    lines.forEach((line, index) => {
      if (line.qtyPlanned <= 0) {
        newErrors[`line_${index}_qty`] = 'Quantity must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !transferId) {
      setTouched({
        sourceLocation: true,
        destinationLocation: true,
        items: true
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const request: Partial<CreateTransferRequest> = {
        sourceLocationId,
        destinationLocationId,
        lines: lines.map(line => ({
          itemId: line.itemId,
          qtyPlanned: line.qtyPlanned
        })),
        notes: notes.trim() || undefined
      };

      await transferApiService.updateTransfer(transferId, request);
      
      showToast({
        title: 'Transfer Updated',
        description: 'The transfer has been updated successfully',
        variant: 'success'
      });
      
      navigate(`/inventory/transfers/${transferId}`);
    } catch (error) {
      showToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update transfer',
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLocationName = (locationId: string) => {
    return (locations || []).find(l => l.id === locationId)?.name || locationId;
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state or non-draft transfer
  if (error || !transfer || transfer.status !== 'DRAFT') {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <EmptyState
          title={!transfer ? "Transfer Not Found" : "Cannot Edit Transfer"}
          description={!transfer 
            ? "The requested transfer could not be found."
            : "Only draft transfers can be edited."
          }
          action={{
            label: "Back to Transfers",
            onClick: handleBack
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={handleBack}
        >
          â† Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Edit Transfer {transfer.code}
          </h1>
          <p className="text-text-muted">
            Modify transfer details and items
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Transfer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Location Selection */}
            <div className="grid grid-cols-2 gap-4">
            <FormField required error={touched.sourceLocation ? errors.sourceLocation : undefined}>
                <Label htmlFor="source-location" required>
                  Source Location
                </Label>
                <Select
                  id="source-location"
                  value={sourceLocationId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSourceLocationId(value);
                    setTouched(prev => ({ ...prev, sourceLocation: true }));
                    if (value === destinationLocationId) {
                      setDestinationLocationId('');
                    }
                    // Clear items when source changes
                    setLines([]);
                  }}
                  className={touched.sourceLocation && errors.sourceLocation ? 'border-error' : ''}
                >
                  <option value="">Select source location</option>
                  {(locations || []).map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </Select>
          </FormField>
            <FormField required error={touched.destinationLocation ? errors.destinationLocation : undefined}>
                <Label htmlFor="destination-location" required>
                  Destination Location
                </Label>
                <Select
                  id="destination-location"
                  value={destinationLocationId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDestinationLocationId(value);
                    setTouched(prev => ({ ...prev, destinationLocation: true }));
                  }}
                  className={touched.destinationLocation && errors.destinationLocation ? 'border-error' : ''}
                >
                  <option value="">Select destination location</option>
                  {(locations || [])
                    .filter(loc => loc.id !== sourceLocationId)
                    .map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </Select>
          </FormField>
            </div>

            {/* Transfer Summary */}
            {sourceLocationId && destinationLocationId && (
              <div className="bg-surface-secondary rounded-lg p-4">
                <p className="text-sm text-text-secondary">
                  Transfer from <strong>{getLocationName(sourceLocationId)}</strong> to{' '}
                  <strong>{getLocationName(destinationLocationId)}</strong>
                </p>
              </div>
            )}

            {/* Item Selection */}
            {sourceLocationId && (
              <div>
                <Label>Items to Transfer</Label>
                <div className="relative mt-1">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <Input
                      type="text"
                      placeholder="Search items by name or SKU..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      onFocus={() => itemSearch.length >= 2 && setShowSearchResults(true)}
                      className="pl-10"
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-auto">
                      {searchResults.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAddItem(item)}
                          className="w-full px-4 py-3 text-left hover:bg-surface-secondary transition-colors border-b border-border last:border-0"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-text-primary">{item.name}</div>
                              <div className="text-sm text-text-muted">
                                {item.sku} Â· {item.unit}
                              </div>
                            </div>
                            {item.availableQty !== undefined && (
                              <div className="text-sm text-text-secondary">
                                Available: {item.availableQty}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Items */}
                {lines.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {lines.map((line, index) => (
                      <div key={line.itemId} className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-text-primary">{line.name}</div>
                          <div className="text-sm text-text-muted">
                            {line.sku} Â· {line.unit}
                            {line.availableQty !== undefined && (
                              <span className="ml-2">Â· Available: {line.availableQty}</span>
                            )}
                          </div>
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            value={line.qtyPlanned}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            min={0}
                            step={line.isFractional ? 0.01 : 1}
                            className={errors[`line_${index}_qty`] ? 'border-error' : ''}
                          />
                          {errors[`line_${index}_qty`] && (
                            <p className="text-xs text-error mt-1">{errors[`line_${index}_qty`]}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  touched.items && errors.items ? (
                    <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-md text-error text-sm" role="alert" aria-live="polite">
                      {errors.items}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted mt-4">
                      Search and add items to transfer
                    </p>
                  )
                )}
              </div>
            )}

            {/* Notes */}
          <FormField>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                type="text"
                placeholder="Add any notes about this transfer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
              />
          </FormField>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={lines.length === 0}
              >
                Update Transfer
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

