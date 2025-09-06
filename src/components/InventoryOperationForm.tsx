/**
 * Inventory Operation Form Component
 * 
 * Handles receive, adjust, and count operations with proper validation
 */

import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Button } from './Button';
import { Select } from './Select';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { 
  FORM_LABELS, 
  FORM_PLACEHOLDERS, 
  HELP_TEXT, 
  MESSAGES, 
  OPERATION_CONFIG,
  SUPPLIER_OPTIONS,
  ADJUSTMENT_REASON_OPTIONS
} from '../constants/ui-text';

interface InventoryOperationFormProps {
  operation: 'receive' | 'adjust' | 'count';
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
}

interface OperationItem {
  itemId: string;
  currentQuantity?: number;
  receivedQuantity?: number;
  adjustmentQuantity?: number;
  countedQuantity?: number;
  reason?: string;
  lotNumber?: string;
  expiryDate?: string;
  cost?: number;
}

export function InventoryOperationForm({ operation, onSubmit, onCancel }: InventoryOperationFormProps) {
  const [selectedItems, setSelectedItems] = useState<OperationItem[]>([]);
  const [generalData, setGeneralData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch inventory items for selection
  const { data: inventoryResponse } = useApi<{ items: InventoryItem[], total: number }>('/api/inventory/items');
  const inventoryItems = inventoryResponse?.items || [];

  const operationConfig: Record<string, {
    title: string;
    itemTitle: string;
    quantityField: string;
    quantityLabel: string;
    showCost: boolean;
    showLotExpiry: boolean;
    requiresSupplier?: boolean;
    requiresReason?: boolean;
  }> = OPERATION_CONFIG;

  const config = operationConfig[operation];

  const addItem = () => {
    setSelectedItems([...selectedItems, {
      itemId: '',
      [config.quantityField]: 0
    }]);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...selectedItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setSelectedItems(updatedItems);
  };

  const getSelectedItemData = (itemId: string) => {
    return inventoryItems.find(item => item.id === itemId);
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      alert(MESSAGES.ADD_AT_LEAST_ONE_ITEM);
      return;
    }

    // Validate all items have required fields
    const hasErrors = selectedItems.some(item => {
      if (!item.itemId) return true;
      if (!item[config.quantityField] || item[config.quantityField] <= 0) return true;
      return false;
    });

    if (hasErrors) {
      alert(MESSAGES.FILL_REQUIRED_FIELDS);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        operation,
        generalData,
        items: selectedItems
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* General Information */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">{FORM_LABELS.GENERAL_INFORMATION}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Supplier Field (for receive operations) */}
          {config.requiresSupplier && (
            <div>
              <label htmlFor="supplierId" className="field-label">
                {FORM_LABELS.SUPPLIER} {FORM_LABELS.REQUIRED_INDICATOR}
              </label>
              <Select
                id="supplierId"
                value={generalData.supplierId || ''}
                onChange={(e) => setGeneralData({...generalData, supplierId: e.target.value})}
                options={[
                  { value: '', label: `Select ${FORM_LABELS.SUPPLIER}` },
                  ...SUPPLIER_OPTIONS
                ]}
                required
              />
              {HELP_TEXT.SUPPLIER && (
                <p className="mt-1 text-sm text-muted-foreground">{HELP_TEXT.SUPPLIER}</p>
              )}
            </div>
          )}

          {/* Adjustment Reason Field (for adjust operations) */}
          {config.requiresReason && (
            <div>
              <label htmlFor="adjustmentReason" className="field-label">
                {FORM_LABELS.ADJUSTMENT_REASON} {FORM_LABELS.REQUIRED_INDICATOR}
              </label>
              <Select
                id="adjustmentReason"
                value={generalData.adjustmentReason || ''}
                onChange={(e) => setGeneralData({...generalData, adjustmentReason: e.target.value})}
                options={[
                  { value: '', label: `Select ${FORM_LABELS.ADJUSTMENT_REASON}` },
                  ...ADJUSTMENT_REASON_OPTIONS
                ]}
                required
              />
              {HELP_TEXT.ADJUSTMENT_REASON && (
                <p className="mt-1 text-sm text-muted-foreground">{HELP_TEXT.ADJUSTMENT_REASON}</p>
              )}
            </div>
          )}

          {/* Reference Number Field */}
          <div>
            <label htmlFor="reference" className="field-label">
              {FORM_LABELS.REFERENCE_NUMBER}
            </label>
            <Input
              id="reference"
              type="text"
              value={generalData.reference || ''}
              onChange={(e) => setGeneralData({...generalData, reference: e.target.value})}
              placeholder={FORM_PLACEHOLDERS.REFERENCE_NUMBER}
            />
            {HELP_TEXT.REFERENCE_NUMBER && (
              <p className="mt-1 text-sm text-muted-foreground">{HELP_TEXT.REFERENCE_NUMBER}</p>
            )}
          </div>

          {/* Notes Field */}
          <div className="md:col-span-2">
            <label htmlFor="notes" className="field-label">
              {FORM_LABELS.NOTES}
            </label>
            <Textarea
              id="notes"
              value={generalData.notes || ''}
              onChange={(e) => setGeneralData({...generalData, notes: e.target.value})}
              placeholder={FORM_PLACEHOLDERS.NOTES}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{config.itemTitle}</h3>
          <Button onClick={addItem} variant="outline" size="sm">
            {FORM_LABELS.ADD_ITEM}
          </Button>
        </div>

        {selectedItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{MESSAGES.NO_ITEMS_ADDED}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedItems.map((item, index) => {
              const itemData = getSelectedItemData(item.itemId);
              return (
                <div key={index} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium text-foreground">Item {index + 1}</h4>
                    <Button
                      onClick={() => removeItem(index)}
                      variant="ghost"
                      size="sm"
                      className="text-error hover:text-error/80"
                    >
                      {FORM_LABELS.REMOVE}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Item Selection */}
                    <div>
                      <label className="field-label">{FORM_LABELS.ITEM} {FORM_LABELS.REQUIRED_INDICATOR}</label>
                      <Select
                        value={item.itemId}
                        onChange={(e) => updateItem(index, 'itemId', e.target.value)}
                        options={[
                          { value: '', label: FORM_PLACEHOLDERS.SELECT_ITEM },
                          ...inventoryItems.map(invItem => ({
                            value: invItem.id,
                            label: `${invItem.name} (${invItem.sku}) - ${invItem.quantity} ${invItem.unit}`
                          }))
                        ]}
                        required
                      />
                    </div>

                    {/* Current Quantity (for reference) */}
                    {itemData && (
                      <div>
                        <label className="field-label">{FORM_LABELS.CURRENT_STOCK}</label>
                        <Input
                          type="text"
                          value={`${itemData.quantity} ${itemData.unit}`}
                          disabled
                          className="bg-surface-secondary text-muted-foreground"
                        />
                      </div>
                    )}

                    {/* Operation Quantity */}
                    <div>
                      <label className="field-label">{config.quantityLabel} {FORM_LABELS.REQUIRED_INDICATOR}</label>
                      <Input
                        type="number"
                        value={item[config.quantityField] || ''}
                        onChange={(e) => updateItem(index, config.quantityField, parseFloat(e.target.value) || 0)}
                        min={operation === 'adjust' ? undefined : 0}
                        step="0.01"
                        required
                      />
                    </div>

                    {/* Cost (for receiving) */}
                    {config.showCost && (
                      <div>
                        <label className="field-label">{FORM_LABELS.UNIT_COST}</label>
                        <Input
                          type="number"
                          value={item.cost || ''}
                          onChange={(e) => updateItem(index, 'cost', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          placeholder={FORM_PLACEHOLDERS.UNIT_COST}
                        />
                      </div>
                    )}

                    {/* Lot Number */}
                    {config.showLotExpiry && (
                      <div>
                        <label className="field-label">{FORM_LABELS.LOT_NUMBER}</label>
                        <Input
                          type="text"
                          value={item.lotNumber || ''}
                          onChange={(e) => updateItem(index, 'lotNumber', e.target.value)}
                          placeholder={FORM_PLACEHOLDERS.LOT_NUMBER}
                        />
                      </div>
                    )}

                    {/* Expiry Date */}
                    {config.showLotExpiry && (
                      <div>
                        <label className="field-label">{FORM_LABELS.EXPIRY_DATE}</label>
                        <Input
                          type="date"
                          value={item.expiryDate || ''}
                          onChange={(e) => updateItem(index, 'expiryDate', e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Item-specific reason (for adjustments) */}
                  {operation === 'adjust' && (
                    <div className="mt-4">
                      <label className="field-label">{FORM_LABELS.NOTES}</label>
                      <Textarea
                        value={item.reason || ''}
                        onChange={(e) => updateItem(index, 'reason', e.target.value)}
                        placeholder={FORM_PLACEHOLDERS.ADJUSTMENT_NOTES}
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button onClick={onCancel} variant="ghost">
          {FORM_LABELS.CANCEL}
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || selectedItems.length === 0}
          className="min-w-[120px]"
        >
          {isSubmitting ? FORM_LABELS.PROCESSING : `${config.title}`}
        </Button>
      </div>
    </div>
  );
}