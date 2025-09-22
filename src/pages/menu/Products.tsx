import { PageStub } from '../../components';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function Products() {
  return (
    <PageStub
      title="Products"
      description="Create and manage individual menu items and their configurations."
      icon={ADMIN_ICONS.products}
      backPath="/menu"
      backLabel="Back to Menu"
      features={[
        'Add and edit menu products',
        'Set pricing and cost information',
        'Configure product availability and scheduling',
        'Manage product images and descriptions',
        'Set dietary restrictions and allergen information',
        'Track product performance and popularity',
        'Bulk product import and export'
      ]}
    />
  );
}
