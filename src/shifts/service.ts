import { getCurrentUser } from '../rbac/roles';
import { useEventStore } from '../events/context';
import { getCurrentBranchId } from '../lib/branch';
import { getDeviceId } from '../lib/device';

export interface ShiftSession {
  userId: string;
  userName: string;
  startedAt: number;
  endedAt?: number;
  branchId?: string;
  deviceId?: string;
}

const ACTIVE_KEY = 'rms_active_shift';

function readStoredPin(): string | null {
  try {
    return localStorage.getItem('rms_user_pin');
  } catch {
    return null;
  }
}

export function getActiveShift(): ShiftSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as ShiftSession) : null;
  } catch {
    return null;
  }
}

export function setActiveShift(shift: ShiftSession | null) {
  try {
    if (shift) localStorage.setItem(ACTIVE_KEY, JSON.stringify(shift));
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}

export function useShiftService() {
  const store = useEventStore();
  const SHIFT_ELIGIBLE_KEY = 'rms_shift_eligible_map';

  function isUserShiftEligible(userId: string): boolean {
    try {
      const raw = localStorage.getItem(SHIFT_ELIGIBLE_KEY);
      if (!raw) return false;
      const map = JSON.parse(raw) as Record<string, boolean>;
      return !!map[userId];
    } catch {
      return false;
    }
  }

  async function startShift(pin: string): Promise<{ success: boolean; error?: string }> {
    const user = getCurrentUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (!isUserShiftEligible(user.id)) {
      return { success: false, error: 'User is not shift-eligible' };
    }

    const savedPin = readStoredPin();
    if (!savedPin || pin.trim() !== savedPin) {
      return { success: false, error: 'Invalid PIN' };
    }

    const now = Date.now();
    const shift: ShiftSession = { 
      userId: user.id, 
      userName: user.name, 
      startedAt: now,
      branchId: getCurrentBranchId(),
      deviceId: getDeviceId(),
    };
    setActiveShift(shift);

    const idempotencyKey = `shift:${user.id}:${new Date(now).toDateString()}:start`;
    store.append('shift.started', shift, {
      key: idempotencyKey,
      params: shift,
      aggregate: { id: user.id, type: 'user' },
    });

    store.append('audit.logged', {
      userId: user.id,
      userRole: user.role,
      userName: user.name,
      action: 'shift.start',
      resource: 'shifts',
      timestamp: now,
      details: { branchId: shift.branchId, deviceId: shift.deviceId },
    }, { key: `audit:${user.id}:${now}:shift.start`, params: { userId: user.id, now }, aggregate: { id: user.id, type: 'user' } });

    return { success: true };
  }

  async function endShift(): Promise<{ success: boolean; error?: string }> {
    const user = getCurrentUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const active = getActiveShift();
    if (!active) return { success: false, error: 'No active shift' };

    const endedAt = Date.now();
    const finished: ShiftSession = { ...active, endedAt };
    setActiveShift(null);

    const idempotencyKey = `shift:${user.id}:${active.startedAt}:end`;
    store.append('shift.ended', finished, {
      key: idempotencyKey,
      params: finished,
      aggregate: { id: user.id, type: 'user' },
    });

    store.append('audit.logged', {
      userId: user.id,
      userRole: user.role,
      userName: user.name,
      action: 'shift.end',
      resource: 'shifts',
      timestamp: endedAt,
      details: { branchId: finished.branchId, deviceId: finished.deviceId },
    }, { key: `audit:${user.id}:${endedAt}:shift.end`, params: { userId: user.id, endedAt }, aggregate: { id: user.id, type: 'user' } });

    return { success: true };
  }

  return { startShift, endShift, getActiveShift };
}


