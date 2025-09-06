import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function Combos() {
  return (
    <PageStub
      title="Combos"
      description="Create combo meals and bundled offerings with special pricing."
      icon={ADMIN_ICONS.combos}
      backPath="/menu"
      backLabel="Back to Menu"
      features={[
        'Create combo meal packages',
        'Set bundle pricing and discounts',
        'Configure combo components and substitutions',
        'Manage combo availability and scheduling',
        'Set combo upgrade options and pricing',
        'Track combo performance and profitability'
      ]}
    />
  );
}
