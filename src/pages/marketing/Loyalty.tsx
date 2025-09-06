import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function Loyalty() {
  return (
    <PageStub
      title="Loyalty"
      description="Manage customer loyalty programs, points, and rewards."
      icon={ADMIN_ICONS.loyalty}
      backPath="/marketing"
      backLabel="Back to Marketing"
      features={[
        'Configure loyalty program rules',
        'Set point earning and redemption rates',
        'Create loyalty tiers and benefits',
        'Manage customer loyalty accounts',
        'Track loyalty program performance',
        'Design custom rewards and incentives',
        'Loyalty program reporting and analytics'
      ]}
    />
  );
}
