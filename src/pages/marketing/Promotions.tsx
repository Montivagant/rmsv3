import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function Promotions() {
  return (
    <PageStub
      title="Promotions"
      description="Design and manage promotional campaigns and special offers."
      icon={ADMIN_ICONS.promotions}
      backPath="/marketing"
      backLabel="Back to Marketing"
      features={[
        'Create promotional campaigns',
        'Design buy-one-get-one offers',
        'Set up happy hour and time-based promotions',
        'Manage seasonal and holiday campaigns',
        'Track promotion performance and ROI',
        'A/B testing for promotional offers',
        'Integration with social media and marketing channels'
      ]}
    />
  );
}
