import { getCurrentUser } from '../rbac/roles';
import { useEventStore } from '../events/context';
import { getCurrentBranchId } from '../lib/branch';
import { getDeviceId } from '../lib/device';
import { createTimeEntry, updateTimeEntry, getCurrentShiftForUser } from './repository';

export interface ShiftSession {
  userId: string;
  userName: string;
  startedAt: number;
  endedAt?: number;
  branchId?: string;
  deviceId?: string;
  timeEntryId?: string; // Reference to time tracking entry
  shiftId?: string; // Reference to assigned shift if within shift hours
}

const ACTIVE_KEY = 'rms_active_shift';

function readStoredPin(): string | null {
  try {
    const stored = localStorage.getItem('rms_user_pin');
    if (stored) return stored;
    
    // Development fallback: Set default PIN for development user
    if (import.meta.env.DEV) {
      const currentUser = getCurrentUser();
      if (currentUser?.id === 'dev-admin') {
        const defaultPin = '1234';
        localStorage.setItem('rms_user_pin', defaultPin);
        return defaultPin;
      }
    }
    
    return null;
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

  async function startShift(pin: string): Promise<{ success: boolean; error?: string }> {
    const user = getCurrentUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const savedPin = readStoredPin();
    if (!savedPin || pin.trim() !== savedPin) {
      return { success: false, error: 'Invalid PIN' };
    }

    const now = new Date();
    const branchId = getCurrentBranchId();
    const deviceId = getDeviceId();

    // Check if user has an assigned shift at current time
    const currentShift = await getCurrentShiftForUser(user.id);

    // Create time entry in repository
    const timeEntry = await createTimeEntry({
      userId: user.id,
      userName: user.name,
      clockIn: now,
      ...(currentShift?.id && { shiftId: currentShift.id }),
      ...(branchId && { branchId }),
      ...(deviceId && { deviceId })
    });

    const shift: ShiftSession = { 
      userId: user.id, 
      userName: user.name, 
      startedAt: now.getTime(),
      ...(branchId && { branchId }),
      ...(deviceId && { deviceId }),
      timeEntryId: timeEntry.id,
      ...(currentShift?.id && { shiftId: currentShift.id }),
    };
    setActiveShift(shift);

    // Legacy event for backwards compatibility
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
      timestamp: now.getTime(),
      details: { branchId, deviceId, shiftId: currentShift?.id, timeEntryId: timeEntry.id },
    }, { key: `audit:${user.id}:${now.getTime()}:shift.start`, params: { userId: user.id, now: now.getTime() }, aggregate: { id: user.id, type: 'user' } });

    return { success: true };
  }

  async function endShift(): Promise<{ success: boolean; error?: string }> {
    const user = getCurrentUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const active = getActiveShift();
    if (!active) return { success: false, error: 'No active shift' };

    const endedAt = new Date();
    const duration = endedAt.getTime() - active.startedAt;

    // Update time entry in repository
    if (active.timeEntryId) {
      await updateTimeEntry(active.timeEntryId, {
        clockOut: endedAt,
        duration,
        status: 'completed'
      });
    }

    const finished: ShiftSession = { ...active, endedAt: endedAt.getTime() };
    setActiveShift(null);

    // Legacy event for backwards compatibility
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
      timestamp: endedAt.getTime(),
      details: { 
        branchId: finished.branchId, 
        deviceId: finished.deviceId,
        timeEntryId: active.timeEntryId,
        duration: duration
      },
    }, { key: `audit:${user.id}:${endedAt.getTime()}:shift.end`, params: { userId: user.id, endedAt: endedAt.getTime() }, aggregate: { id: user.id, type: 'user' } });

    return { success: true };
  }

  return { startShift, endShift, getActiveShift };
}
