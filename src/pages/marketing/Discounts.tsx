import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function Discounts() {
  return (
    <PageStub
      title="Discounts"
      description="Create and manage discount rules and promotional offers."
      icon={ADMIN_ICONS.discounts}
      backPath="/marketing"
      backLabel="Back to Marketing"
      features={[
        'Create percentage and fixed amount discounts',
        'Set discount conditions and rules',
        'Time-based and quantity-based discounts',
        'Customer-specific discount offers',
        'Automatic discount application',
        'Track discount usage and performance',
        'Bulk discount operations and management'
      ]}
    />
  );
}
