import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function Modifiers() {
  return (
    <PageStub
      title="Modifiers"
      description="Create modifier groups and options for customizable menu items."
      icon={ADMIN_ICONS.modifiers}
      backPath="/menu"
      backLabel="Back to Menu"
      features={[
        'Create modifier groups (size, extras, cooking style)',
        'Set modifier pricing and rules',
        'Configure required vs. optional modifiers',
        'Set min/max selection limits',
        'Manage modifier availability by time or location',
        'Create conditional modifiers based on product selection'
      ]}
    />
  );
}
