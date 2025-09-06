import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function GiftCards() {
  return (
    <PageStub
      title="Gift Cards"
      description="Manage gift card sales, redemptions, and balances."
      icon={ADMIN_ICONS.giftCards}
      backPath="/marketing"
      backLabel="Back to Marketing"
      features={[
        'Create and design gift cards',
        'Set gift card denominations and rules',
        'Track gift card sales and redemptions',
        'Manage gift card balances and expiry',
        'Generate gift card reports',
        'Handle gift card refunds and transfers',
        'Promotional gift card campaigns'
      ]}
    />
  );
}
