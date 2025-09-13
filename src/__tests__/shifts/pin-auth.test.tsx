import React, { useState } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { EventStoreProvider } from '../../events/context';
import { eventStore } from '../../events/store';
import { useShiftService } from '../../shifts/service';
import { setCurrentUser } from '../../rbac/roles';

function ShiftTestHarness() {
  const { startShift } = useShiftService();
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');

  return (
    <div>
      <input aria-label="pin-input" value={pin} onChange={(e) => setPin(e.target.value)} />
      <button
        onClick={async () => {
          const result = await startShift(pin);
          setMsg(result.success ? 'started' : (result.error || 'error'));
        }}
      >
        start
      </button>
      <div aria-label="result">{msg}</div>
    </div>
  );
}

describe('Shifts PIN Authentication', () => {
  beforeEach(async () => {
    // Reset store and localStorage
    await eventStore.reset();
    localStorage.clear();
    setCurrentUser({ id: 'user-1', name: 'Test User', role: 'BUSINESS_OWNER' as any });
  });

  it('rejects invalid PIN on shift start', async () => {
    // Save PIN and mark user eligible
    localStorage.setItem('rms_user_pin', '1234');
    localStorage.setItem('rms_shift_eligible_map', JSON.stringify({ 'user-1': true }));

    function Gate() {
      const [mounted, setMounted] = React.useState(false);
      React.useEffect(() => { setMounted(true); }, []);
      return mounted ? <ShiftTestHarness /> : null;
    }

    render(
      <EventStoreProvider store={eventStore}>
        <Gate />
      </EventStoreProvider>
    );

    fireEvent.change(screen.getByLabelText('pin-input'), { target: { value: '9999' } });
    fireEvent.click(screen.getByText('start'));

    await waitFor(() => {
      expect(screen.getByLabelText('result')).toHaveTextContent('Invalid PIN');
    });
  });

  it('starts shift with valid PIN and eligibility', async () => {
    localStorage.setItem('rms_user_pin', '1234');
    localStorage.setItem('rms_shift_eligible_map', JSON.stringify({ 'user-1': true }));

    function Gate2() {
      const [mounted, setMounted] = React.useState(false);
      React.useEffect(() => { setMounted(true); }, []);
      return mounted ? <ShiftTestHarness /> : null;
    }

    render(
      <EventStoreProvider store={eventStore}>
        <Gate2 />
      </EventStoreProvider>
    );

    fireEvent.change(screen.getByLabelText('pin-input'), { target: { value: '1234' } });
    fireEvent.click(screen.getByText('start'));

    await waitFor(() => {
      expect(screen.getByLabelText('result')).toHaveTextContent('started');
    });

    // Ensure event was appended
    const events = eventStore.getAll();
    expect(events.some(e => e.type === 'shift.started')).toBe(true);
  });
});


