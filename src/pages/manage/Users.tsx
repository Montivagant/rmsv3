import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function Users() {
  return (
    <PageStub
      title="Users"
      description="Manage system users, their profiles, and account settings."
      icon={ADMIN_ICONS.users}
      backPath="/manage"
      backLabel="Back to Manage"
      features={[
        'Add and edit user accounts',
        'Assign roles and permissions',
        'Manage user status (active/inactive)',
        'Set user contact information and preferences',
        'Track user login history and activity',
        'Bulk user operations and imports',
        'Password reset and security settings'
      ]}
    />
  );
}
