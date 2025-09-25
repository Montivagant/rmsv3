import { useState, useEffect, useCallback } from 'react';
import { accountService } from '../../services/account';
import { useFormGuard } from '../../hooks/useUnsavedGuard';
import { useToast } from '../../hooks/useToast';
import { useNotifications } from '../../components/feedback/NotificationSystem';
import type { Preferences } from '../../types/account';
import { TIME_ZONES, LANGUAGES } from '../../types/account';
import SettingCard from '../../settings/ui/SettingCard';
import SettingRow from '../../settings/ui/SettingRow';
import { Select } from '../../components/Select';
import Toggle from '../../settings/ui/Toggle';
import FormActions from '../../components/ui/FormActions';
import { Button } from '../../components/Button';
import { useRepository } from '../../hooks/useRepository';
import { listBranches } from '../../management/repository';

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [formData, setFormData] = useState<Preferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  
  const { showToast } = useToast();
  const { showSuccess, showError } = useNotifications();
  // Branch data from management repository
  const { data: branchesData } = useRepository(listBranches, []);
  const branchList = Array.isArray(branchesData) ? branchesData : [];
  const branches = branchList.map((b: any) => ({ id: b.id, name: b.name }));

  // Check if form has unsaved changes
  const isDirty = preferences && formData && JSON.stringify(preferences) !== JSON.stringify(formData);
  
  // Protect against navigation with unsaved changes
  useFormGuard(Boolean(isDirty), 'You have unsaved changes to your preferences. Are you sure you want to leave?');

  // Load initial preferences data
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await accountService.preferences.get();
      setPreferences(data);
      setFormData(data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      showToast('Failed to load preferences', 'error');
      showError('Preferences', 'Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, showError]);

  const handleSave = async () => {
    if (!formData) return;

    try {
      setSaving(true);
      const updatedPreferences = await accountService.preferences.update(formData);
      setPreferences(updatedPreferences);
      setFormData(updatedPreferences);
      showToast('Preferences updated successfully', 'success');
      showSuccess('Preferences', 'Preferences updated successfully');
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      const msg = error.message || 'Failed to update preferences';
      showToast(msg, 'error');
      showError('Preferences', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (preferences) {
      setFormData(preferences);
    }
  };

  const updateField = (field: keyof Preferences, value: any) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [field]: value
    });
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
        <p className="text-text-secondary">Failed to load preferences</p>
        <Button onClick={loadPreferences} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Regional Settings */}
        <SettingCard
          title="Regional Settings"
          description="Configure regional and localization preferences"
        >
          <div className="space-y-6">
            <SettingRow 
              label="Time Zone" 
              htmlFor="preferences-timezone"
              description="Your business operating time zone"
            >
              <Select
                id="preferences-timezone"
                value={formData.timeZone}
                onValueChange={(value) => updateField('timeZone', value)}
                options={TIME_ZONES.map(tz => ({
                  value: tz.value,
                  label: `${tz.label} (${tz.offset})`
                }))}
              />
            </SettingRow>

            <SettingRow 
              label="Locale" 
              htmlFor="preferences-locale"
              description="Set your preferred language and regional format"
            >
              <Select
                id="preferences-locale"
                value={formData.locale || ''}
                onValueChange={(value) => updateField('locale', value)}
                options={LANGUAGES.map(lang => ({
                  value: lang.value,
                  label: `${lang.label} (${lang.nativeLabel})`
                }))}
              />
            </SettingRow>

            <SettingRow 
              label="Default Branch" 
              htmlFor="preferences-default-branch"
              description="The default branch for your operations"
            >
              <Select
                id="preferences-default-branch"
                value={formData.defaultBranchId || ''}
                onValueChange={(value) => updateField('defaultBranchId', value)}
                options={branches.map((branch: any) => ({
                  value: branch.id,
                  label: branch.name
                }))}
                placeholder="Select a default branch"
              />
            </SettingRow>

            <SettingRow 
              label="Enable Localization" 
              description="Show localized content and formats based on your region"
            >
              <Toggle
                checked={formData.enableLocalization}
                onChange={(checked) => updateField('enableLocalization', checked)}
                id="preferences-localization"
              />
            </SettingRow>
          </div>
        </SettingCard>

        {/* Pricing & Inventory */}
        <SettingCard
          title="Pricing & Inventory"
          description="Configure how pricing and inventory behaves in your system"
        >
          <div className="space-y-6">
            <SettingRow 
              label="Tax Inclusive Pricing" 
              description="Show prices with tax included (recommended for retail)"
            >
              <Toggle
                checked={formData.taxInclusivePricing}
                onChange={(checked) => updateField('taxInclusivePricing', checked)}
                id="preferences-tax-inclusive"
              />
            </SettingRow>

          </div>
        </SettingCard>

        {/* Security */}
        <SettingCard
          title="Security & Authentication"
          description="Enhanced security options for your account"
        >
          <div className="space-y-6">
            <SettingRow 
              label="Two-Factor Authentication" 
              description="Add an extra layer of security to your account"
            >
              <div className="flex items-center space-x-3">
                <Toggle
                  checked={formData.enableTwoFactor}
                  onChange={(checked) => updateField('enableTwoFactor', checked)}
                  id="preferences-2fa"
                  disabled={true}
                />
                <div className="flex-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800 dark:bg-warning-500/20 dark:text-warning-400">
                    Coming Soon
                  </span>
                </div>
              </div>
            </SettingRow>
          </div>
        </SettingCard>

        {/* Advanced Options */}
        <SettingCard
          title="Advanced Options"
          description="Additional system preferences for power users"
        >
          <div className="bg-surface-secondary rounded-lg p-6 border-2 border-dashed border-border-secondary">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-text-primary">More Options Available</h3>
              <p className="mt-2 text-text-secondary">
                Additional advanced preferences will be available in future updates
              </p>
            </div>
          </div>
        </SettingCard>
      </div>

      {/* Sticky form actions */}
      <FormActions
        isVisible={Boolean(isDirty)}
        isLoading={isSaving}
        isValid={true}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </>
  );
}

