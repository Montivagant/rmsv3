import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function More() {
  return (
    <PageStub
      title="More"
      description="Additional management tools and system utilities."
      icon={ADMIN_ICONS.more}
      backPath="/manage"
      backLabel="Back to Manage"
      features={[
        'System backup and restore',
        'Data import and export tools',
        'Integration management',
        'Third-party service connections',
        'System maintenance utilities',
        'Advanced configuration options',
        'Developer and API settings'
      ]}
    />
  );
}
