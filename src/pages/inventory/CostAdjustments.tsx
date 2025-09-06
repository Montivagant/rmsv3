import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function CostAdjustments() {
  return (
    <PageStub
      title="Cost Adjustments"
      description="Manage inventory cost adjustments and price corrections."
      icon={ADMIN_ICONS.adjustments}
      backPath="/inventory"
      backLabel="Back to Inventory"
      features={[
        'Create cost adjustment entries',
        'Track price changes and variations',
        'Manage bulk cost updates',
        'Generate cost adjustment reports',
        'Audit cost change history',
        'Set up automatic cost adjustment rules',
        'Impact analysis for cost changes'
      ]}
    />
  );
}
