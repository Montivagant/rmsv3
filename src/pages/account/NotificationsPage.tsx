import React, { useState, useEffect } from 'react';
import { accountService } from '../../services/account';
import { useFormGuard } from '../../hooks/useUnsavedGuard';
import { useToast } from '../../hooks/useToast';
import type { Notifications, NotificationKey } from '../../types/account';
import { NOTIFICATION_CONFIGS } from '../../types/account';
import SettingCard from '../../settings/ui/SettingCard';
import SettingRow from '../../settings/ui/SettingRow';
import Toggle from '../../settings/ui/Toggle';
import FormActions from '../../components/ui/FormActions';
import { Button } from '../../components/Button';

type NotificationCategory = 'inventory' | 'purchasing' | 'transfers' | 'alerts';

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  inventory: 'Inventory Management',
  purchasing: 'Purchasing & Suppliers',
  transfers: 'Stock Transfers',
  alerts: 'System Alerts'
};

const CATEGORY_DESCRIPTIONS: Record<NotificationCategory, string> = {
  inventory: 'Notifications related to inventory counts, adjustments, and production',
  purchasing: 'Notifications about purchase orders, supplier returns, and approvals',
  transfers: 'Notifications for stock transfers between locations',
  alerts: 'Important alerts about stock levels and system events'
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notifications | null>(null);
  const [formData, setFormData] = useState<Notifications | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  
  const { showToast } = useToast();

  // Check if form has unsaved changes
  const isDirty = notifications && formData && JSON.stringify(notifications) !== JSON.stringify(formData);
  
  // Protect against navigation with unsaved changes
  useFormGuard(Boolean(isDirty), 'You have unsaved changes to your notification preferences. Are you sure you want to leave?');

  // Load initial notifications data
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await accountService.notifications.get();
      setNotifications(data);
      setFormData(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      showToast('Failed to load notification settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData) return;

    try {
      setSaving(true);
      const updatedNotifications = await accountService.notifications.update(formData);
      setNotifications(updatedNotifications);
      setFormData(updatedNotifications);
      showToast('Notification preferences updated successfully', 'success');
    } catch (error: any) {
      console.error('Failed to save notifications:', error);
      showToast(error.message || 'Failed to update notifications', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (notifications) {
      setFormData(notifications);
    }
  };

  const updateNotification = (key: NotificationKey, value: boolean) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [key]: value
    });
  };

  const handleToggleAll = (enabled: boolean) => {
    if (!formData) return;
    
    const updatedData = { ...formData };
    NOTIFICATION_CONFIGS.forEach(config => {
      updatedData[config.key] = enabled;
    });
    setFormData(updatedData);
  };

  // Calculate toggle all state
  const getToggleAllState = (): { checked: boolean; indeterminate: boolean } => {
    if (!formData) return { checked: false, indeterminate: false };
    
    const values = NOTIFICATION_CONFIGS.map(config => formData[config.key]);
    const enabledCount = values.filter(Boolean).length;
    
    if (enabledCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (enabledCount === values.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  };

  // Group notifications by category
  const notificationsByCategory = React.useMemo(() => {
    const grouped: Record<NotificationCategory, typeof NOTIFICATION_CONFIGS> = {
      inventory: [],
      purchasing: [],
      transfers: [],
      alerts: []
    };

    NOTIFICATION_CONFIGS.forEach(config => {
      grouped[config.category].push(config);
    });

    return grouped;
  }, []);

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
        <p className="text-text-secondary">Failed to load notification settings</p>
        <Button onClick={loadNotifications} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const toggleAllState = getToggleAllState();

  return (
    <>
      <div className="space-y-6">
        {/* Master Toggle */}
        <SettingCard
          title="Notification Preferences"
          description="Configure when you want to receive notifications about system events"
        >
          <SettingRow 
            label="All Notifications" 
            description="Enable or disable all notification types at once"
          >
            <Toggle
              checked={toggleAllState.checked}
              onChange={handleToggleAll}
              id="notifications-toggle-all"
            />
          </SettingRow>
        </SettingCard>

        {/* Notification Categories */}
        {(Object.keys(notificationsByCategory) as NotificationCategory[]).map(category => {
          const categoryNotifications = notificationsByCategory[category];
          
          if (categoryNotifications.length === 0) return null;

          return (
            <SettingCard
              key={category}
              title={CATEGORY_LABELS[category]}
              description={CATEGORY_DESCRIPTIONS[category]}
            >
              <div className="space-y-4">
                {categoryNotifications.map(config => (
                  <SettingRow
                    key={config.key}
                    label={config.label}
                    description={config.description}
                  >
                    <Toggle
                      checked={formData[config.key]}
                      onChange={(checked) => updateNotification(config.key, checked)}
                      id={`notification-${config.key}`}
                      size="sm"
                    />
                  </SettingRow>
                ))}
              </div>
            </SettingCard>
          );
        })}

        {/* Delivery Methods */}
        <SettingCard
          title="Delivery Methods"
          description="Choose how you want to receive notifications"
        >
          <div className="bg-surface-secondary rounded-lg p-6 border-2 border-dashed border-border-secondary">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-text-primary">Email & SMS Delivery</h3>
              <p className="mt-2 text-text-secondary">
                Notification delivery methods will be available in future updates
              </p>
            </div>
          </div>
        </SettingCard>
      </div>

      {/* Sticky form actions */}
      <FormActions
        isVisible={Boolean(isDirty)}
        isLoading={isSaving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </>
  );
}
