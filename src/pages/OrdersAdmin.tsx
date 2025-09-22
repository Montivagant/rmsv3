import { PageStub } from '../components';
import { ADMIN_ICONS } from '../config/admin-nav.config';

export default function OrdersAdmin() {
  return (
    <PageStub
      title="Orders"
      description="Comprehensive order management and tracking for all restaurant operations."
      icon={ADMIN_ICONS.orders}
      comingSoon={false}
      features={[
        'View all current and historical orders',
        'Track order status and fulfillment',
        'Manage order modifications and cancellations',
        'Handle order disputes and refunds',
        'Generate order analytics and reports',
        'Monitor order performance by location',
        'Integration with kitchen display and POS systems'
      ]}
    />
  );
}
