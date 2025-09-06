import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function Branches() {
  return (
    <PageStub
      title="Branches"
      description="Manage multiple restaurant locations and their configurations."
      icon={ADMIN_ICONS.branches}
      backPath="/manage"
      backLabel="Back to Manage"
      features={[
        'Add and configure restaurant locations',
        'Set branch-specific settings and hours',
        'Manage location-based inventory',
        'Configure local tax rates and regulations',
        'Set branch contact information and details',
        'Monitor branch performance and metrics',
        'Inter-branch transfer and operations'
      ]}
    />
  );
}
