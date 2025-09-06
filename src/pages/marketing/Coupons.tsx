import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function Coupons() {
  return (
    <PageStub
      title="Coupons"
      description="Create and distribute digital and physical coupons."
      icon={ADMIN_ICONS.coupons}
      backPath="/marketing"
      backLabel="Back to Marketing"
      features={[
        'Design digital and printable coupons',
        'Set coupon values and usage limits',
        'Generate unique coupon codes',
        'Track coupon distribution and redemption',
        'Set expiry dates and usage restrictions',
        'Bulk coupon generation and management',
        'Integration with email and SMS campaigns'
      ]}
    />
  );
}
