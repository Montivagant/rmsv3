import { useState, useEffect } from 'react';
import { accountService } from '../../services/account';
import { useFormGuard } from '../../hooks/useUnsavedGuard';
import { useToast } from '../../hooks/useToast';
import { useNotifications } from '../../components/feedback/NotificationSystem';
import type { Profile } from '../../types/account';
import { LANGUAGES } from '../../types/account';
import SettingCard from '../../settings/ui/SettingCard';
import SettingRow from '../../settings/ui/SettingRow';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { PhoneInputEG } from '../../components/PhoneInputEG';
import { PinInput, validatePin } from '../../components/ui/PinInput';
import FormActions from '../../components/ui/FormActions';
import { Button } from '../../components/Button';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { showToast } = useToast();
  const { showSuccess, showError } = useNotifications();

  // Check if form has unsaved changes
  const isDirty = profile && formData && JSON.stringify(profile) !== JSON.stringify(formData);
  
  // Protect against navigation with unsaved changes
  useFormGuard(Boolean(isDirty), 'You have unsaved changes to your profile. Are you sure you want to leave?');

  // Load initial profile data
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await accountService.profile.get();
      setProfile(data);
      setFormData(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
      showToast('Failed to load profile data', 'error');
      showError('Profile', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (data: Profile): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!data.name?.trim()) {
      newErrors.name = 'Name is required';
    } else if (data.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!data.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!data.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (data.phone.length < 9 || data.phone.length > 10) {
      newErrors.phone = 'Phone number must be 9-10 digits';
    }

    if (data.loginPin) {
      const pinValidation = validatePin(data.loginPin);
      if (!pinValidation.isValid) {
        newErrors.loginPin = pinValidation.error!;
      }
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
      const updatedProfile = await accountService.profile.update(formData);
      setProfile(updatedProfile);
      setFormData(updatedProfile);
      setErrors({});
      showToast('Profile updated successfully', 'success');
      showSuccess('Profile', 'Profile updated successfully');
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      const msg = error.message || 'Failed to update profile';
      showToast(msg, 'error');
      showError('Profile', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (profile) {
      setFormData(profile);
      setErrors({});
    }
  };

  const handleGeneratePin = async () => {
    if (!formData) return;

    try {
      setIsGeneratingPin(true);
      const result = await accountService.security.generatePin();
      setFormData({
        ...formData,
        loginPin: result.pin
      });
      showToast('New PIN generated successfully', 'success');
    } catch (error: any) {
      console.error('Failed to generate PIN:', error);
      showToast(error.message || 'Failed to generate PIN', 'error');
    } finally {
      setIsGeneratingPin(false);
    }
  };

  const updateField = (field: keyof Profile, value: string) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [field]: value
    });
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
        <p className="text-text-secondary">Failed to load profile data</p>
        <Button onClick={loadProfile} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Basic Information */}
        <SettingCard
          title="Basic Information"
          description="Update your personal details and contact information"
        >
          <div className="space-y-6">
            <SettingRow label="Full Name" htmlFor="profile-name">
              <Input
                id="profile-name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                error={errors.name}
                placeholder="Enter your full name"
                required
              />
            </SettingRow>

            <SettingRow label="Phone Number" htmlFor="profile-phone">
              <PhoneInputEG
                id="profile-phone"
                value={formData.phone}
                onChange={(digits) => updateField('phone', digits)}
                error={errors.phone}
                helpText="Egypt phone number without country code"
                required
              />
            </SettingRow>

            <SettingRow label="Email Address" htmlFor="profile-email">
              <Input
                id="profile-email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                error={errors.email}
                placeholder="your@email.com"
                required
              />
            </SettingRow>

            <SettingRow label="Language" htmlFor="profile-language">
              <Select
                id="profile-language"
                value={formData.language}
                onValueChange={(value) => updateField('language', value)}
                options={LANGUAGES.map(lang => ({
                  value: lang.value,
                  label: `${lang.label} (${lang.nativeLabel})`
                }))}
              />
            </SettingRow>
          </div>
        </SettingCard>

        {/* Security */}
        <SettingCard
          title="Login PIN"
          description="Set a 4-6 digit PIN for quick access to the system"
        >
          <SettingRow label="PIN" htmlFor="profile-pin">
            <PinInput
              id="profile-pin"
              value={formData.loginPin || ''}
              onChange={(pin) => updateField('loginPin', pin)}
              onGenerate={handleGeneratePin}
              isGenerating={isGeneratingPin}
              error={errors.loginPin}
              helpText="4-6 digits for quick system access"
              maxLength={6}
            />
          </SettingRow>
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
