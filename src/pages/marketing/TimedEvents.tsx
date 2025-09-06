import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function TimedEvents() {
  return (
    <PageStub
      title="Timed Events"
      description="Schedule and manage time-sensitive marketing events and campaigns."
      icon={ADMIN_ICONS.timedEvents}
      backPath="/marketing"
      backLabel="Back to Marketing"
      features={[
        'Schedule promotional events',
        'Set up flash sales and limited-time offers',
        'Create countdown timers and urgency marketing',
        'Automate event start and end times',
        'Manage recurring promotional events',
        'Send event notifications to customers',
        'Track event performance and engagement'
      ]}
    />
  );
}
