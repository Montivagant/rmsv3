import React from 'react';
import { PageStub } from '../../../components/PageStub';
import { ADMIN_ICONS } from '../../../config/admin-nav.config';

export default function Allergens() {
  return (
    <PageStub
      title="Allergens"
      description="Manage allergen information and compliance for menu items."
      icon={ADMIN_ICONS.allergens}
      backPath="/menu"
      backLabel="Back to Menu"
      features={[
        'Define allergen types and categories',
        'Assign allergens to menu items',
        'Generate allergen warnings and labels',
        'Compliance reporting and documentation',
        'Custom allergen information and descriptions',
        'Allergen-based menu filtering and search'
      ]}
    />
  );
}
