import React, { useState } from 'react';
import { Button } from './Button';
import { FormField } from './FormField';
import { Label } from './Label';
import { Input } from './Input';
import { Textarea } from './Textarea';

interface InventoryOperationFormProps {
  operation: 'receive' | 'adjust' | 'count';
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function InventoryOperationForm({ operation, onSubmit, onCancel }: InventoryOperationFormProps) {
  const [formData, setFormData] = useState({
    reference: '',
    notes: '',
    items: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Operation submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getOperationTitle = () => {
    switch (operation) {
      case 'receive':
        return 'Receive Stock';
      case 'adjust':
        return 'Adjust Inventory';
      case 'count':
        return 'Inventory Count';
      default:
        return 'Inventory Operation';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">{getOperationTitle()}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField>
          <Label htmlFor="reference">Reference Number</Label>
          <Input
            id="reference"
            name="reference"
            value={formData.reference}
            onChange={handleChange}
            placeholder="Enter reference number..."
            disabled={isSubmitting}
          />
        </FormField>

        <FormField>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Add any notes about this operation..."
            rows={3}
            disabled={isSubmitting}
          />
        </FormField>

        {/* Placeholder for operation-specific fields */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            {operation === 'receive' && 'Stock receiving functionality will be implemented here.'}
            {operation === 'adjust' && 'Inventory adjustment functionality will be implemented here.'}
            {operation === 'count' && 'Inventory counting functionality will be implemented here.'}
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : `Complete ${getOperationTitle()}`}
          </Button>
        </div>
      </form>
    </div>
  );
}
