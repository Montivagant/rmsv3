import { PageStub } from '../../components';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function Groups() {
  return (
    <PageStub
      title="Groups"
      description="Organize menu items into groups for better management and display."
      icon={ADMIN_ICONS.groups}
      backPath="/menu"
      backLabel="Back to Menu"
      features={[
        'Create product groups for organization',
        'Set group-level pricing rules',
        'Configure group display settings',
        'Manage group-specific modifiers',
        'Set group availability schedules',
        'Bulk operations on grouped items'
      ]}
    />
  );
}
