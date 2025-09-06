import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function History() {
  return (
    <PageStub
      title="History"
      description="View detailed inventory transaction history and audit trails."
      icon={ADMIN_ICONS.history}
      backPath="/inventory"
      backLabel="Back to Inventory"
      features={[
        'View complete inventory transaction history',
        'Track stock movements and adjustments',
        'Audit inventory changes by user and date',
        'Search and filter transaction records',
        'Export historical data for analysis',
        'Generate inventory movement reports',
        'Track system and manual adjustments'
      ]}
    />
  );
}
