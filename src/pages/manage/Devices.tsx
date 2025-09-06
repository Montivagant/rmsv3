import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function Devices() {
  return (
    <PageStub
      title="Devices"
      description="Manage POS terminals, printers, and other hardware devices."
      icon={ADMIN_ICONS.devices}
      backPath="/manage"
      backLabel="Back to Manage"
      features={[
        'Register and configure POS terminals',
        'Manage receipt and kitchen printers',
        'Set device permissions and access',
        'Monitor device status and connectivity',
        'Configure device-specific settings',
        'Hardware troubleshooting and diagnostics',
        'Device firmware and software updates'
      ]}
    />
  );
}
