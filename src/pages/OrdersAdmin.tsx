import React from 'react';
import { NAV_ICONS } from '../config/nav.config';
import { PageStub } from '../components/PageStub';

export const OrdersAdmin: React.FC = () => {
  return (
    <PageStub
      title="Orders"
      description="This is where you would manage incoming and historical orders."
      icon={NAV_ICONS.orders}
    />
  );
};
