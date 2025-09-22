import { PageStub } from '../../components';

const DEVICE_ICON = 'M8 5h8a2 2 0 012 2v10a2 2 0 01-2 2H8a2 2 0 01-2-2V7a2 2 0 012-2zm3 14h2m-3-16h4';

export default function Devices() {
  return (
    <PageStub
      title="Devices"
      description="Manage POS terminals, printers, and other hardware devices."
      icon={DEVICE_ICON}
      backPath="/manage"
      backLabel="Back to Manage"
      features={[
        'Register and configure POS terminals',
        'Manage receipt and kitchen printers',
        'Set device permissions and access',
        'Monitor device status and connectivity',
        'Configure device-specific settings',
        'Hardware troubleshooting and diagnostics',
        'Device firmware and software updates'
      ]}
    />
  );
}
