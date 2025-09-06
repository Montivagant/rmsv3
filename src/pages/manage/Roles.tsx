import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function Roles() {
  return (
    <PageStub
      title="Roles"
      description="Define user roles and configure their permissions and access levels."
      icon={ADMIN_ICONS.roles}
      backPath="/manage"
      backLabel="Back to Manage"
      features={[
        'Create custom user roles',
        'Configure granular permissions',
        'Set role-based access controls',
        'Manage role hierarchies',
        'Assign roles to users',
        'Audit role usage and permissions',
        'System role templates and presets'
      ]}
    />
  );
}
