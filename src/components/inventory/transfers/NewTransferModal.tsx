import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from '../../Modal';
import { Button } from '../../Button';
import { Input } from '../../Input';
import { Select } from '../../Select';
import { Label } from '../../Label';
import { useToast } from '../../../hooks/useToast';
import { transferApiService } from '../../../inventory/transfers/api';
import type { 
  CreateTransferRequest, 
  Location 
} from '../../../inventory/transfers/types';
import { TransferUtils, TRANSFER_CONFIG } from '../../../inventory/transfers/types';
// Icons as inline SVGs to match project pattern

interface NewTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transferId: string, transferCode: string) => void;
  locations?: Location[];
  loading?: boolean;
}

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

export default function NewTransferModal({
  isOpen,
  onClose,
  onSuccess,
  locations = [],
  loading = false
}: NewTransferModalProps) {
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<TransferLineInput[]>([]);
  
  // Item search state
  const [itemSearch, setItemSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ItemSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Form state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { showToast } = useToast();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSourceLocationId('');
      setDestinationLocationId('');
      setNotes('');
      setLines([]);
      setItemSearch('');
      setSearchResults([]);
      setErrors({});
      setTouched({});
      setShowSearchResults(false);
    }
  }, [isOpen]);

  // Search for items when user types
  useEffect(() => {
    if (!sourceLocationId || itemSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await transferApiService.searchItems(itemSearch, sourceLocationId);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Item search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // Debounce search

    return () => clearTimeout(searchTimeout);
  }, [itemSearch, sourceLocationId]);

  // Validate form
  const validateForm = useCallback(() => {
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

    // Validate each line
    lines.forEach((line, index) => {
      if (line.qtyPlanned <= 0) {
        newErrors[`line_${index}_qty`] = 'Quantity must be greater than 0';
      }
      if (line.availableQty !== undefined && line.qtyPlanned > line.availableQty) {
        newErrors[`line_${index}_qty`] = `Only ${line.availableQty} available`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [sourceLocationId, destinationLocationId, lines]);

  // Add item to transfer
  const handleAddItem = (item: ItemSearchResult) => {
    // Check if item already added
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
    
    // Clear items error if it exists
    if (errors.items) {
      setErrors(prev => {
        const { items, ...rest } = prev;
        return rest;
      });
    }
  };

  // Update line quantity
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

    // Clear error for this line
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`line_${index}_qty`];
      return newErrors;
    });
  };

  // Remove item from transfer
  const handleRemoveItem = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Mark all fields as touched to show errors
      setTouched({
        sourceLocation: true,
        destinationLocation: true,
        items: true
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const request: CreateTransferRequest = {
        sourceLocationId,
        destinationLocationId,
        lines: lines.map(line => ({
          itemId: line.itemId,
          qtyPlanned: line.qtyPlanned
        })),
        notes: notes.trim() || undefined
      };

      const result = await transferApiService.createTransfer(request);
      
      showToast({
        title: 'Transfer Created',
        description: `Transfer ${result.code} has been created successfully`,
        variant: 'success'
      });
      
      onSuccess(result.transferId, result.code);
    } catch (error) {
      showToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create transfer',
        variant: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLocationName = (locationId: string) => {
    return (locations || []).find(l => l.id === locationId)?.name || locationId;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Transfer"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
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
                // Clear destination if same as source
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
            {touched.sourceLocation && errors.sourceLocation && (
              <p className="text-sm text-error mt-1">{errors.sourceLocation}</p>
            )}
          </div>

          <div>
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
            {touched.destinationLocation && errors.destinationLocation && (
              <p className="text-sm text-error mt-1">{errors.destinationLocation}</p>
            )}
          </div>
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
                  aria-label="Search items by name or SKU"
                  aria-expanded={showSearchResults}
                  aria-controls="transfer-item-results"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  onFocus={() => itemSearch.length >= 2 && setShowSearchResults(true)}
                  className="pl-10"
                />
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div id="transfer-item-results" role="listbox" aria-label="Item search results" className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-auto">
                  {searchResults.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleAddItem(item)}
                      role="option"
                      className="w-full px-4 py-3 text-left hover:bg-surface-secondary transition-colors border-b border-border last:border-0"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-text-primary">{item.name}</div>
                          <div className="text-sm text-text-muted">
                            {item.sku} · {item.unit}
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
                        {line.sku} · {line.unit}
                        {line.availableQty !== undefined && (
                          <span className="ml-2">· Available: {line.availableQty}</span>
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
                        aria-invalid={!!errors[`line_${index}_qty`]}
                        aria-describedby={errors[`line_${index}_qty`] ? `line_${index}_qty_error` : undefined}
                        className={errors[`line_${index}_qty`] ? 'border-error' : ''}
                      />
                      {errors[`line_${index}_qty`] && (
                        <p id={`line_${index}_qty_error`} className="text-xs text-error mt-1">{errors[`line_${index}_qty`]}</p>
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
                <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-md text-error text-sm">
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
        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Input
            id="notes"
            type="text"
            placeholder="Add any notes about this transfer..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
          />
        </div>

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
            disabled={loading || lines.length === 0}
          >
            Create Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
