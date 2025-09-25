import { NAV_ICONS } from '../../config/nav.config';
import { PageStub } from '../../components';

export default function Groups() {
  return (
    <PageStub
      title="Groups"
      description="Organize menu items into groups for better management and display."
      icon={NAV_ICONS.groups}
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
