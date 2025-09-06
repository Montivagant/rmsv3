/**
 * Tax Configuration Panel
 * 
 * Administrative interface for managing tax rates, exemptions, and rules
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select } from '../../components';
import type { TaxConfiguration, TaxRate, TaxExemption, TaxType, ExemptionType } from '../types';
import { taxConfigurationManager } from '../configuration';

interface TaxConfigurationPanelProps {
  onConfigurationChange?: (config: TaxConfiguration) => void;
}

export function TaxConfigurationPanel({ onConfigurationChange }: TaxConfigurationPanelProps) {
  const [configurations, setConfigurations] = useState<TaxConfiguration[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [selectedConfig, setSelectedConfig] = useState<TaxConfiguration | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewRateForm, setShowNewRateForm] = useState(false);
  const [showNewExemptionForm, setShowNewExemptionForm] = useState(false);

  const loadConfigurations = useCallback(() => {
    const configs = taxConfigurationManager.listConfigurations();
    setConfigurations(configs);
    
    // Auto-select default configuration
    const defaultConfig = configs.find(c => c.isDefault);
    if (defaultConfig && !selectedConfigId) {
      setSelectedConfigId(defaultConfig.id);
    }
  }, [selectedConfigId]);

  // Load configurations on mount
  useEffect(() => {
    loadConfigurations();
  }, [loadConfigurations]);

  // Load selected configuration when selection changes
  useEffect(() => {
    if (selectedConfigId) {
      const config = taxConfigurationManager.getConfiguration(selectedConfigId);
      setSelectedConfig(config);
      if (config && onConfigurationChange) {
        onConfigurationChange(config);
      }
    }
  }, [selectedConfigId, onConfigurationChange]);

  const handleSetDefault = () => {
    if (selectedConfigId) {
      taxConfigurationManager.setDefaultConfiguration(selectedConfigId);
      loadConfigurations();
    }
  };

  const formatRate = (rate: number): string => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  if (!selectedConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tax Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              value={selectedConfigId}
              onChange={(e) => setSelectedConfigId(e.target.value)}
              className="flex-1"
              placeholder="Select Configuration"
              options={[
                { value: "", label: "Select Configuration" },
                ...configurations.map(config => ({
                  value: config.id,
                  label: `${config.name}${config.isDefault ? ' (Default)' : ''}`
                }))
              ]}
            />
            <Button 
              onClick={() => setIsEditing(true)}
              disabled={!selectedConfigId}
            >
              Configure
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{selectedConfig.name}</CardTitle>
              <p className="text-sm text-secondary mt-1">{selectedConfig.description}</p>
            </div>
            <div className="flex gap-2">
              {!selectedConfig.isDefault && (
                <Button variant="outline" onClick={handleSetDefault}>
                  Set as Default
                </Button>
              )}
              <Button onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? 'View Mode' : 'Edit Mode'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Tax Rates:</span>
              <div className="text-secondary">{selectedConfig.rates.length}</div>
            </div>
            <div>
              <span className="font-medium">Exemptions:</span>
              <div className="text-secondary">{selectedConfig.exemptions.length}</div>
            </div>
            <div>
              <span className="font-medium">Rules:</span>
              <div className="text-secondary">{selectedConfig.rules.length}</div>
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>
              <div className="text-secondary">
                {new Date(selectedConfig.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Rates Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Tax Rates</CardTitle>
            {isEditing && (
              <Button 
                onClick={() => setShowNewRateForm(true)}
                disabled={showNewRateForm}
              >
                Add Tax Rate
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showNewRateForm && (
            <NewTaxRateForm 
              onSave={(rate) => {
                taxConfigurationManager.addTaxRate(selectedConfig.id, rate);
                setShowNewRateForm(false);
                loadConfigurations();
              }}
              onCancel={() => setShowNewRateForm(false)}
            />
          )}
          
          <div className="space-y-3">
            {selectedConfig.rates.map(rate => (
              <div key={rate.id} className="border border-secondary rounded-lg p-4 bg-surface-secondary">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{rate.displayName}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${
                        rate.isActive ? 'bg-success-100 text-success-700' : 'bg-surface-secondary text-secondary'
                      }`}>
                        {rate.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 rounded text-xs bg-primary-100 text-primary-700">
                        {rate.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Rate:</span>
                        <div className="text-lg font-mono">{formatRate(rate.rate)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Jurisdiction:</span>
                        <div className="text-secondary">
                          {rate.jurisdiction.country}
                          {rate.jurisdiction.state && `-${rate.jurisdiction.state}`}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Effective:</span>
                        <div className="text-secondary">
                          {new Date(rate.effectiveDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Expires:</span>
                        <div className="text-secondary">
                          {rate.expiryDate ? new Date(rate.expiryDate).toLocaleDateString() : 'Never'}
                        </div>
                      </div>
                    </div>

                    {rate.description && (
                      <p className="mt-2 text-sm text-secondary">{rate.description}</p>
                    )}

                    {rate.applicableCategories && rate.applicableCategories.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm font-medium">Categories: </span>
                        <span className="text-sm text-secondary">
                          {rate.applicableCategories.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">
                        {rate.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {selectedConfig.rates.length === 0 && (
              <div className="text-center py-8 text-tertiary">
                No tax rates configured
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tax Exemptions Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Tax Exemptions</CardTitle>
            {isEditing && (
              <Button 
                onClick={() => setShowNewExemptionForm(true)}
                disabled={showNewExemptionForm}
              >
                Add Exemption
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showNewExemptionForm && (
            <NewTaxExemptionForm 
              onSave={(exemption) => {
                // TODO: Add exemption to configuration
                setShowNewExemptionForm(false);
                loadConfigurations();
              }}
              onCancel={() => setShowNewExemptionForm(false)}
            />
          )}

          <div className="space-y-3">
            {selectedConfig.exemptions.map((exemption, index) => (
              <div key={index} className="border border-secondary rounded-lg p-4 bg-surface-secondary">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{exemption.name}</h4>
                      <span className="px-2 py-1 rounded text-xs bg-primary-100 text-primary-700">
                        {exemption.type.replace('_', ' ').toUpperCase()}
                      </span>
                      {exemption.certificateRequired && (
                        <span className="px-2 py-1 rounded text-xs bg-warning-100 text-warning-700">
                          Certificate Required
                        </span>
                      )}
                    </div>
                    
                    <p className="mt-2 text-sm text-secondary">{exemption.description}</p>
                    
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Exempt from: </span>
                      <span className="text-secondary">
                        {exemption.exemptFromTaxTypes.join(', ')}
                      </span>
                    </div>

                    {exemption.validUntil && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Valid until: </span>
                        <span className="text-secondary">
                          {new Date(exemption.validUntil).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm">Remove</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {selectedConfig.exemptions.length === 0 && (
              <div className="text-center py-8 text-tertiary">
                No tax exemptions configured
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// New Tax Rate Form Component
interface NewTaxRateFormProps {
  onSave: (rate: TaxRate) => void;
  onCancel: () => void;
}

function NewTaxRateForm({ onSave, onCancel }: NewTaxRateFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    rate: '',
    type: 'sales_tax' as TaxType,
    description: '',
    country: 'US',
    state: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const rate: TaxRate = {
      id: `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name,
      displayName: formData.displayName,
      rate: parseFloat(formData.rate) / 100, // Convert percentage to decimal
      type: formData.type,
      description: formData.description || undefined,
      effectiveDate: new Date().toISOString(),
      isActive: true,
      jurisdiction: {
        country: formData.country,
        state: formData.state || undefined
      }
    };

    onSave(rate);
  };

  return (
    <div className="border border-secondary rounded-lg p-4 bg-surface-secondary mb-4">
      <h4 className="font-medium mb-4">Add New Tax Rate</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Tax identifier (e.g., california-sales-tax)"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Display Name</label>
            <Input
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="e.g., California Sales Tax"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Rate (%)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.rate}
              onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
              placeholder="e.g., 8.75"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <Select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as TaxType }))}
              options={[
                { value: "sales_tax", label: "Sales Tax" },
                { value: "vat", label: "VAT" },
                { value: "gst", label: "GST" },
                { value: "excise", label: "Excise Tax" },
                { value: "service_tax", label: "Service Tax" },
                { value: "luxury_tax", label: "Luxury Tax" },
                { value: "local", label: "Local Tax" },
                { value: "custom", label: "Custom" }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <Input
              value={formData.country}
              onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
              placeholder="United States"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">State/Province</label>
            <Input
              value={formData.state}
              onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
              placeholder="California"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <Input
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Add Tax Rate
          </Button>
        </div>
      </form>
    </div>
  );
}

// New Tax Exemption Form Component
interface NewTaxExemptionFormProps {
  onSave: (exemption: TaxExemption) => void;
  onCancel: () => void;
}

function NewTaxExemptionForm({ onSave, onCancel }: NewTaxExemptionFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'resale' as ExemptionType,
    description: '',
    certificateRequired: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const exemption: TaxExemption = {
      id: `exemption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name,
      type: formData.type,
      description: formData.description,
      certificateRequired: formData.certificateRequired,
      exemptFromTaxTypes: ['sales_tax'] // Default - would be configurable in full implementation
    };

    onSave(exemption);
  };

  return (
    <div className="border border-secondary rounded-lg p-4 bg-surface-secondary mb-4">
      <h4 className="font-medium mb-4">Add New Tax Exemption</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Non-profit exemption"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <Select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ExemptionType }))}
              options={[
                { value: "government", label: "Government" },
                { value: "nonprofit", label: "Non-profit" },
                { value: "resale", label: "Resale" },
                { value: "export", label: "Export" },
                { value: "medical", label: "Medical" },
                { value: "education", label: "Education" },
                { value: "religious", label: "Religious" },
                { value: "agricultural", label: "Agricultural" },
                { value: "manufacturing", label: "Manufacturing" },
                { value: "custom", label: "Custom" }
              ]}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <Input
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe when this exemption applies"
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="certificateRequired"
            checked={formData.certificateRequired}
            onChange={(e) => setFormData(prev => ({ ...prev, certificateRequired: e.target.checked }))}
            className="rounded"
          />
          <label htmlFor="certificateRequired" className="text-sm">
            Certificate required for this exemption
          </label>
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Add Exemption
          </Button>
        </div>
      </form>
    </div>
  );
}
