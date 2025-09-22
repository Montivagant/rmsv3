import { useState, useEffect } from 'react';
import { accountService } from '../../services/account';
import { useFormGuard } from '../../hooks/useUnsavedGuard';
import { useToast } from '../../hooks/useToast';
import { useNotifications } from '../../components/feedback/NotificationSystem';
import type { BusinessDetails } from '../../types/account';
import { COUNTRIES } from '../../types/account';
import SettingCard from '../../settings/ui/SettingCard';
import SettingRow from '../../settings/ui/SettingRow';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import FormActions from '../../components/ui/FormActions';
import { Button } from '../../components/Button';

export default function BusinessPage() {
  const [business, setBusiness] = useState<BusinessDetails | null>(null);
  const [formData, setFormData] = useState<BusinessDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { showToast } = useToast();
  const { showSuccess, showError } = useNotifications();

  // Check if form has unsaved changes
  const isDirty = business && formData && JSON.stringify(business) !== JSON.stringify(formData);
  
  // Protect against navigation with unsaved changes
  useFormGuard(Boolean(isDirty), 'You have unsaved changes to your business details. Are you sure you want to leave?');

  // Load initial business data
  useEffect(() => {
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
    try {
      setIsLoading(true);
      const data = await accountService.business.get();
      setBusiness(data);
      setFormData(data);
    } catch (error) {
      console.error('Failed to load business details:', error);
      showToast('Failed to load business details', 'error');
      showError('Business', 'Failed to load business details');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (data: BusinessDetails): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!data.businessName?.trim()) {
      newErrors.businessName = 'Business name is required';
    } else if (data.businessName.trim().length < 2) {
      newErrors.businessName = 'Business name must be at least 2 characters';
    }

    if (data.taxNumber?.trim() && !/^[\d\-\s]+$/.test(data.taxNumber)) {
      newErrors.taxNumber = 'Tax number can only contain digits, dashes, and spaces';
    }

    return newErrors;
  };

  const handleSave = async () => {
    if (!formData) return;

    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      showToast('Please fix the errors before saving', 'error');
      return;
    }

    try {
      setSaving(true);
      const updatedBusiness = await accountService.business.update(formData);
      setBusiness(updatedBusiness);
      setFormData(updatedBusiness);
      setErrors({});
      showToast('Business details updated successfully', 'success');
      showSuccess('Business', 'Business details updated successfully');
    } catch (error: any) {
      console.error('Failed to save business details:', error);
      const msg = error.message || 'Failed to update business details';
      showToast(msg, 'error');
      showError('Business', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (business) {
      setFormData(business);
      setErrors({});
    }
  };

  const updateField = (field: keyof BusinessDetails, value: string) => {
    if (!formData) return;
    
    let updatedData = {
      ...formData,
      [field]: value
    };

    // Auto-update currency when country changes
    if (field === 'country') {
      const country = COUNTRIES.find(c => c.value === value);
      if (country) {
        updatedData.currency = country.currency;
      }
    }

    setFormData(updatedData);
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: ''
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="h-4 bg-surface-secondary rounded w-1/4 mb-2"></div>
          <div className="h-32 bg-surface-secondary rounded"></div>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary">Failed to load business details</p>
        <Button onClick={loadBusiness} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Business Information */}
        <SettingCard
          title="Business Information"
          description="Update your business details for legal and tax purposes"
        >
          <div className="space-y-6">
            <SettingRow label="Business Name" htmlFor="business-name">
              <Input
                id="business-name"
                value={formData.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
                error={errors.businessName}
                placeholder="Enter your business name"
                required
              />
            </SettingRow>

            <SettingRow 
              label="Tax Registration Name" 
              htmlFor="tax-reg-name"
              description="Legal name for tax purposes (if different from business name)"
            >
              <Input
                id="tax-reg-name"
                value={formData.taxRegistrationName || ''}
                onChange={(e) => updateField('taxRegistrationName', e.target.value)}
                error={errors.taxRegistrationName}
                placeholder="Legal business name for taxes"
              />
            </SettingRow>

            <SettingRow 
              label="Tax Number" 
              htmlFor="tax-number"
              description="Your business tax identification number"
            >
              <Input
                id="tax-number"
                value={formData.taxNumber || ''}
                onChange={(e) => updateField('taxNumber', e.target.value)}
                error={errors.taxNumber}
                placeholder="123-456-789"
              />
            </SettingRow>
          </div>
        </SettingCard>

        {/* Location & Currency */}
        <SettingCard
          title="Location & Currency"
          description="Set your business location and default currency"
        >
          <div className="space-y-6">
            <SettingRow label="Country" htmlFor="business-country">
              <Select
                id="business-country"
                value={formData.country}
                onValueChange={(value) => updateField('country', value)}
                options={COUNTRIES.map(country => ({
                  value: country.value,
                  label: `${country.label} (${country.code})`
                }))}
              />
            </SettingRow>

            <SettingRow 
              label="Currency" 
              htmlFor="business-currency"
              description="Primary currency for your business operations"
            >
              <Select
                id="business-currency"
                value={formData.currency}
                onValueChange={(value) => updateField('currency', value)}
                options={COUNTRIES.map(country => ({
                  value: country.currency,
                  label: `${country.currency} (${country.label})`
                })).filter((item, index, self) => 
                  index === self.findIndex(t => t.value === item.value)
                )}
              />
            </SettingRow>
          </div>
        </SettingCard>

        {/* Additional Information */}
        <SettingCard
          title="Additional Information"
          description="Extra business details for compliance and reporting"
        >
          <div className="bg-surface-secondary rounded-lg p-4 border-2 border-dashed border-border-secondary">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-text-primary">Coming Soon</h3>
              <p className="mt-2 text-text-secondary">
                Additional business information fields will be available in future updates
              </p>
            </div>
          </div>
        </SettingCard>
      </div>

      {/* Sticky form actions */}
      <FormActions
        isVisible={Boolean(isDirty)}
        isLoading={isSaving}
        isValid={formData ? Object.keys(validateForm(formData)).length === 0 : false}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </>
  );
}
