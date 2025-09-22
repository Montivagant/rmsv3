import { useState } from 'react';
import { accountService } from '../../services/account';
import { useToast } from '../../hooks/useToast';
import type { ChangePasswordRequest } from '../../types/account';
import SettingCard from '../../settings/ui/SettingCard';
import SettingRow from '../../settings/ui/SettingRow';
import { PasswordInput } from '../../components/PasswordInput';
import Toggle from '../../settings/ui/Toggle';
import { Button } from '../../components/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function SecurityPage() {
  const [passwordForm, setPasswordForm] = useState<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const { showToast } = useToast();

  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Password must contain uppercase, lowercase, and number';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) {
      showToast('Please fix the errors before continuing', 'error');
      return;
    }

    try {
      setIsChangingPassword(true);
      await accountService.security.changePassword(passwordForm);
      
      // Clear the form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordErrors({});
      
      showToast('Password changed successfully', 'success');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      showToast(error.message || 'Failed to change password', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const updatePasswordField = (field: keyof ChangePasswordRequest, value: string) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const isPasswordFormDirty = Object.values(passwordForm).some(value => value.trim() !== '');

  return (
    <>
      <div className="space-y-6">
        {/* Change Password */}
        <SettingCard
          title="Change Password"
          description="Update your account password for enhanced security"
        >
          <div className="space-y-6">
            <SettingRow label="Current Password" htmlFor="current-password">
              <PasswordInput
                id="current-password"
                value={passwordForm.currentPassword}
                onChange={(e) => updatePasswordField('currentPassword', e.target.value)}
                error={passwordErrors.currentPassword}
                placeholder="Enter your current password"
                autoComplete="current-password"
              />
            </SettingRow>

            <SettingRow label="New Password" htmlFor="new-password">
              <PasswordInput
                id="new-password"
                value={passwordForm.newPassword}
                onChange={(e) => updatePasswordField('newPassword', e.target.value)}
                error={passwordErrors.newPassword}
                placeholder="Enter your new password"
                autoComplete="new-password"
                helpText="At least 8 characters with uppercase, lowercase, and number"
              />
            </SettingRow>

            <SettingRow label="Confirm New Password" htmlFor="confirm-password">
              <PasswordInput
                id="confirm-password"
                value={passwordForm.confirmPassword}
                onChange={(e) => updatePasswordField('confirmPassword', e.target.value)}
                error={passwordErrors.confirmPassword}
                placeholder="Confirm your new password"
                autoComplete="new-password"
              />
            </SettingRow>

            <div className="flex justify-end">
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!isPasswordFormDirty || isChangingPassword}
                variant="primary"
              >
                {isChangingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </div>
          </div>
        </SettingCard>

        {/* Two-Factor Authentication */}
        <SettingCard
          title="Two-Factor Authentication"
          description="Add an extra layer of security to your account with 2FA"
        >
          <div className="space-y-6">
            <SettingRow 
              label="Enable 2FA" 
              description="Require a verification code from your phone to sign in"
            >
              <div className="flex items-center space-x-3">
                <Toggle
                  checked={false}
                  onChange={() => {}}
                  id="2fa-toggle"
                  disabled={true}
                />
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800 dark:bg-warning-500/20 dark:text-warning-400">
                  Coming Soon
                </span>
              </div>
            </SettingRow>

            <div className="bg-surface-secondary rounded-lg p-6 border-2 border-dashed border-border-secondary">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-text-primary">Enhanced Security</h3>
                <p className="mt-2 text-text-secondary">
                  Two-factor authentication will be available in future updates
                </p>
              </div>
            </div>
          </div>
        </SettingCard>

        {/* Security Information */}
        <SettingCard
          title="Security Information"
          description="View your account security details and activity"
        >
          <div className="space-y-4">
            <SettingRow 
              label="Last Password Change" 
              description="When you last updated your password"
            >
              <span className="text-sm text-text-secondary">
                Never changed
              </span>
            </SettingRow>

            <SettingRow 
              label="Active Sessions" 
              description="Devices currently signed into your account"
            >
              <span className="text-sm text-text-secondary">
                1 active session (current device)
              </span>
            </SettingRow>

            <div className="bg-surface-secondary rounded-lg p-4 border-2 border-dashed border-border-secondary">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm text-text-secondary">
                  Detailed security logs and session management will be available in future updates
                </p>
              </div>
            </div>
          </div>
        </SettingCard>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => {
          setShowConfirmDialog(false);
          handlePasswordChange();
        }}
        title="Change Password"
        description="Are you sure you want to change your password? You'll need to use the new password for all future logins."
        confirmText="Change Password"
        variant="default"
        isLoading={isChangingPassword}
      />
    </>
  );
}
