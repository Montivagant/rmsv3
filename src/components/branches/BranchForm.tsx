/**
 * Branch Form Component
 * 
 * Form for creating and editing branches with validation
 */

import { useState, useEffect } from 'react';
import { SmartForm } from '../forms/SmartForm';
import type { FormField } from '../forms/SmartForm';
import type { Branch, BranchFormData } from '../../types/branch';
import { validateName, validateEmail, validatePhone } from '../../utils/validation';

interface BranchFormProps {
  branch?: Branch;
  onSubmit: (data: BranchFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const BRANCH_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'commissary', label: 'Commissary' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_STORAGE_AREAS = [
  'Main Walk-in',
  'Freezer',
  'Dry Storage',
  'Bar Storage',
  'Kitchen Cooler',
  'Prep Area',
  'Receiving',
];

export function BranchForm({ branch, onSubmit, onCancel, isSubmitting }: BranchFormProps) {
  const [storageAreas, setStorageAreas] = useState<string[]>(
    branch?.storageAreas || ['Main Walk-in', 'Dry Storage']
  );
  const [newStorageArea, setNewStorageArea] = useState('');

  const initialValues: Partial<BranchFormData> = branch ? {
    name: branch.name,
    isMain: branch.isMain,
    type: branch.type,
    street: branch.address.street,
    city: branch.address.city,
    state: branch.address.state,
    postalCode: branch.address.postalCode,
    country: branch.address.country,
    phone: branch.contact?.phone,
    email: branch.contact?.email,
    manager: branch.contact?.manager,
    isActive: branch.isActive,
  } : {
    type: 'restaurant',
    country: 'Egypt',
    isActive: true,
  };

  const fields: FormField[] = [
    {
      name: 'name',
      label: 'Branch Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., Main Restaurant',
      validation: [(value) => validateName(value as string, 'Branch name')],
    },
    {
      name: 'type',
      label: 'Branch Type',
      type: 'select',
      required: true,
      options: BRANCH_TYPES,
    },
    {
      name: 'isMain',
      label: 'Set as Main Branch',
      type: 'checkbox',
      helpText: 'Only one branch can be marked as main',
    },
    {
      name: 'street',
      label: 'Street Address',
      type: 'text',
      required: true,
      placeholder: 'e.g., 123 Main Street',
    },
    {
      name: 'city',
      label: 'City',
      type: 'text',
      required: true,
      placeholder: 'e.g., Cairo',
    },
    {
      name: 'state',
      label: 'State/Province',
      type: 'text',
      placeholder: 'e.g., Cairo Governorate',
    },
    {
      name: 'postalCode',
      label: 'Postal Code',
      type: 'text',
      placeholder: 'e.g., 11511',
    },
    {
      name: 'country',
      label: 'Country',
      type: 'text',
      required: true,
      placeholder: 'e.g., Egypt',
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'tel',
      placeholder: 'e.g., +20 2 1234 5678',
      validation: [(value) => value ? validatePhone(value as string) : { isValid: true }],
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'e.g., branch@restaurant.com',
      validation: [(value) => value ? validateEmail(value as string) : { isValid: true }],
    },
    {
      name: 'manager',
      label: 'Branch Manager',
      type: 'text',
      placeholder: 'e.g., John Doe',
    },
    {
      name: 'isActive',
      label: 'Active',
      type: 'checkbox',
      helpText: 'Inactive branches won\'t appear in selection lists',
    },
  ];

  const handleAddStorageArea = () => {
    if (newStorageArea.trim() && !storageAreas.includes(newStorageArea.trim())) {
      setStorageAreas([...storageAreas, newStorageArea.trim()]);
      setNewStorageArea('');
    }
  };

  const handleRemoveStorageArea = (area: string) => {
    setStorageAreas(storageAreas.filter(a => a !== area));
  };

  const handleSubmit = async (values: any) => {
    await onSubmit({
      ...values,
      storageAreas,
    });
  };

  return (
    <div className="space-y-6">
      <SmartForm
        fields={fields}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        submitLabel={branch ? 'Update Branch' : 'Create Branch'}
        disabled={isSubmitting}
      />

      {/* Storage Areas Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">Storage Areas</h3>
        
        <div className="space-y-4">
          {/* Add New Storage Area */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newStorageArea}
              onChange={(e) => setNewStorageArea(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStorageArea())}
              placeholder="Add storage area (e.g., Walk-in Cooler)"
              className="input-base flex-1"
            />
            <button
              type="button"
              onClick={handleAddStorageArea}
              className="btn-secondary"
            >
              Add
            </button>
          </div>

          {/* Quick Add Buttons */}
          <div className="flex flex-wrap gap-2">
            {DEFAULT_STORAGE_AREAS
              .filter(area => !storageAreas.includes(area))
              .map(area => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setStorageAreas([...storageAreas, area])}
                  className="text-xs px-2 py-1 bg-surface-secondary hover:bg-surface-tertiary text-text-secondary rounded-md transition-colors"
                >
                  + {area}
                </button>
              ))}
          </div>

          {/* Current Storage Areas */}
          <div className="space-y-2">
            {storageAreas.length === 0 ? (
              <p className="text-text-tertiary text-sm">No storage areas added yet</p>
            ) : (
              storageAreas.map(area => (
                <div
                  key={area}
                  className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                >
                  <span className="text-text-primary">{area}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStorageArea(area)}
                    className="text-error-600 hover:text-error-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
