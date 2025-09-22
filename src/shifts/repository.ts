/**
 * Shifts Repository
 * Event-sourced shift management for business scheduling and time tracking
 */

import { bootstrapEventStore } from '../bootstrap/persist';
import { stableHash } from '../events/hash';
import type { VersionedEvent } from '../events/validation';

// Core Shift Entity
export interface Shift {
  id: string;
  name: string;
  description?: string;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc.
  assignedUserIds: string[];
  branchId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Time tracking correlation
export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  clockIn: Date;
  clockOut?: Date;
  duration?: number; // milliseconds
  shiftId?: string; // Associated shift if within shift hours
  branchId?: string;
  deviceId?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

// Internal state for repository management
interface ShiftState extends Omit<Shift, 'createdAt' | 'updatedAt'> {
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

interface TimeEntryState extends Omit<TimeEntry, 'clockIn' | 'clockOut' | 'createdAt' | 'updatedAt'> {
  clockIn: number;
  clockOut?: number;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

// Event interfaces
interface ShiftCreatedEvent extends VersionedEvent {
  type: 'shift.created.v1';
  version: 1;
  payload: {
    id: string;
    name: string;
    description?: string;
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
    assignedUserIds: string[];
    branchId?: string;
    isActive: boolean;
  };
}

interface ShiftUpdatedEvent extends VersionedEvent {
  type: 'shift.updated.v1';
  version: 1;
  payload: {
    id: string;
    changes: Partial<Pick<ShiftState, 'name' | 'description' | 'startTime' | 'endTime' | 'daysOfWeek' | 'assignedUserIds' | 'branchId' | 'isActive'>>;
  };
}

interface ShiftDeletedEvent extends VersionedEvent {
  type: 'shift.deleted.v1';
  version: 1;
  payload: {
    id: string;
  };
}

interface TimeEntryCreatedEvent extends VersionedEvent {
  type: 'time.entry.created.v1';
  version: 1;
  payload: {
    id: string;
    userId: string;
    userName: string;
    clockIn: number;
    shiftId?: string;
    branchId?: string;
    deviceId?: string;
  };
}

interface TimeEntryUpdatedEvent extends VersionedEvent {
  type: 'time.entry.updated.v1';
  version: 1;
  payload: {
    id: string;
    changes: Partial<Pick<TimeEntryState, 'clockOut' | 'duration' | 'shiftId' | 'status'>>;
  };
}

// Repository functions
async function loadShiftMap(): Promise<Map<string, ShiftState>> {
  const { store } = await bootstrapEventStore();
  const events = store.getAll();
  const map = new Map<string, ShiftState>();

  for (const event of events) {
    if (event.type === 'shift.created.v1' || event.type === 'shift.created') {
      const payload = (event as ShiftCreatedEvent).payload;
      const state: ShiftState = {
        id: payload.id,
        name: payload.name,
        ...(payload.description && { description: payload.description }),
        startTime: payload.startTime,
        endTime: payload.endTime,
        daysOfWeek: payload.daysOfWeek,
        assignedUserIds: payload.assignedUserIds,
        ...(payload.branchId && { branchId: payload.branchId }),
        isActive: payload.isActive,
        createdAt: event.at,
        updatedAt: event.at,
        deleted: false
      };
      map.set(payload.id, state);
    }

    if (event.type === 'shift.updated.v1' || event.type === 'shift.updated') {
      const payload = (event as ShiftUpdatedEvent).payload;
      const existing = map.get(payload.id);
      if (existing) {
        Object.assign(existing, payload.changes);
        existing.updatedAt = event.at;
      }
    }

    if (event.type === 'shift.deleted.v1' || event.type === 'shift.deleted') {
      const payload = (event as ShiftDeletedEvent).payload;
      const existing = map.get(payload.id);
      if (existing) {
        existing.deleted = true;
        existing.updatedAt = event.at;
      }
    }
  }

  return map;
}

async function loadTimeEntryMap(): Promise<Map<string, TimeEntryState>> {
  const { store } = await bootstrapEventStore();
  const events = store.getAll();
  const map = new Map<string, TimeEntryState>();

  for (const event of events) {
    if (event.type === 'time.entry.created.v1' || event.type === 'time.entry.created') {
      const payload = (event as TimeEntryCreatedEvent).payload;
      const state: TimeEntryState = {
        id: payload.id,
        userId: payload.userId,
        userName: payload.userName,
        clockIn: payload.clockIn,
        ...(payload.shiftId && { shiftId: payload.shiftId }),
        ...(payload.branchId && { branchId: payload.branchId }),
        ...(payload.deviceId && { deviceId: payload.deviceId }),
        status: 'active',
        createdAt: event.at,
        updatedAt: event.at,
        deleted: false
      };
      map.set(payload.id, state);
    }

    if (event.type === 'time.entry.updated.v1' || event.type === 'time.entry.updated') {
      const payload = (event as TimeEntryUpdatedEvent).payload;
      const existing = map.get(payload.id);
      if (existing) {
        Object.assign(existing, payload.changes);
        existing.updatedAt = event.at;
      }
    }
  }

  return map;
}

// Public API
export async function listShifts(): Promise<Shift[]> {
  const map = await loadShiftMap();
  return Array.from(map.values())
    .filter(shift => !shift.deleted)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(state => ({
      id: state.id,
      name: state.name,
      ...(state.description && { description: state.description }),
      startTime: state.startTime,
      endTime: state.endTime,
      daysOfWeek: state.daysOfWeek,
      assignedUserIds: state.assignedUserIds,
      ...(state.branchId && { branchId: state.branchId }),
      isActive: state.isActive,
      createdAt: new Date(state.createdAt),
      updatedAt: new Date(state.updatedAt),
    }));
}

export async function getShift(id: string): Promise<Shift | null> {
  const map = await loadShiftMap();
  const state = map.get(id);
  if (!state || state.deleted) return null;

  return {
    id: state.id,
    name: state.name,
    ...(state.description && { description: state.description }),
    startTime: state.startTime,
    endTime: state.endTime,
    daysOfWeek: state.daysOfWeek,
    assignedUserIds: state.assignedUserIds,
    ...(state.branchId && { branchId: state.branchId }),
    isActive: state.isActive,
    createdAt: new Date(state.createdAt),
    updatedAt: new Date(state.updatedAt),
  };
}

export interface CreateShiftInput {
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  assignedUserIds?: string[];
  branchId?: string;
  isActive?: boolean;
}

export async function createShift(input: CreateShiftInput): Promise<Shift> {
  const { store } = await bootstrapEventStore();
  const id = `shift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const result = store.append('shift.created.v1', {
    id,
    name: input.name.trim(),
    description: input.description?.trim(),
    startTime: input.startTime,
    endTime: input.endTime,
    daysOfWeek: input.daysOfWeek,
    assignedUserIds: input.assignedUserIds ?? [],
    branchId: input.branchId,
    isActive: input.isActive ?? true
  }, {
    key: `create-shift-${id}`,
    params: input,
    aggregate: { id, type: 'shift' }
  });

  return {
    id,
    name: input.name.trim(),
    ...(input.description?.trim() && { description: input.description.trim() }),
    startTime: input.startTime,
    endTime: input.endTime,
    daysOfWeek: input.daysOfWeek,
    assignedUserIds: input.assignedUserIds ?? [],
    ...(input.branchId && { branchId: input.branchId }),
    isActive: input.isActive ?? true,
    createdAt: new Date(result.event.at),
    updatedAt: new Date(result.event.at),
  };
}

export interface UpdateShiftInput {
  name?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: number[];
  assignedUserIds?: string[];
  branchId?: string;
  isActive?: boolean;
}

export async function updateShift(id: string, input: UpdateShiftInput): Promise<Shift | null> {
  const existing = await getShift(id);
  if (!existing) return null;

  const { store } = await bootstrapEventStore();
  const changes = Object.fromEntries(
    Object.entries(input).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(changes).length === 0) return existing;

  store.append('shift.updated.v1', {
    id,
    changes
  }, {
    key: `update-shift-${id}-${stableHash(input)}`,
    params: input,
    aggregate: { id, type: 'shift' }
  });

  return {
    ...existing,
    ...changes,
    updatedAt: new Date()
  };
}

export async function deleteShift(id: string): Promise<boolean> {
  const existing = await getShift(id);
  if (!existing) return false;

  const { store } = await bootstrapEventStore();
  store.append('shift.deleted.v1', {
    id
  }, {
    key: `delete-shift-${id}`,
    params: { id },
    aggregate: { id, type: 'shift' }
  });

  return true;
}

// Time tracking functions
export async function createTimeEntry(input: {
  userId: string;
  userName: string;
  clockIn: Date;
  shiftId?: string;
  branchId?: string;
  deviceId?: string;
}): Promise<TimeEntry> {
  const { store } = await bootstrapEventStore();
  const id = `time_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const result = store.append('time.entry.created.v1', {
    id,
    userId: input.userId,
    userName: input.userName,
    clockIn: input.clockIn.getTime(),
    shiftId: input.shiftId,
    branchId: input.branchId,
    deviceId: input.deviceId
  }, {
    key: `create-time-entry-${id}`,
    params: input,
    aggregate: { id: input.userId, type: 'user' }
  });

  return {
    id,
    userId: input.userId,
    userName: input.userName,
    clockIn: input.clockIn,
    ...(input.shiftId && { shiftId: input.shiftId }),
    ...(input.branchId && { branchId: input.branchId }),
    ...(input.deviceId && { deviceId: input.deviceId }),
    status: 'active',
    createdAt: new Date(result.event.at),
    updatedAt: new Date(result.event.at),
  };
}

export async function updateTimeEntry(id: string, input: {
  clockOut?: Date;
  duration?: number;
  shiftId?: string;
  status?: 'active' | 'completed' | 'cancelled';
}): Promise<TimeEntry | null> {
  const map = await loadTimeEntryMap();
  const state = map.get(id);
  if (!state || state.deleted) return null;

  const { store } = await bootstrapEventStore();
  const changes: any = {};
  
  if (input.clockOut) changes.clockOut = input.clockOut.getTime();
  if (input.duration !== undefined) changes.duration = input.duration;
  if (input.shiftId !== undefined) changes.shiftId = input.shiftId;
  if (input.status) changes.status = input.status;

  if (Object.keys(changes).length === 0) return null;

  store.append('time.entry.updated.v1', {
    id,
    changes
  }, {
    key: `update-time-entry-${id}-${stableHash(input)}`,
    params: input,
    aggregate: { id: state.userId, type: 'user' }
  });

  return {
    id: state.id,
    userId: state.userId,
    userName: state.userName,
    clockIn: new Date(state.clockIn),
    ...(changes.clockOut ? { clockOut: new Date(changes.clockOut) } : state.clockOut ? { clockOut: new Date(state.clockOut) } : {}),
    ...(changes.duration !== undefined ? { duration: changes.duration } : state.duration !== undefined ? { duration: state.duration } : {}),
    ...(changes.shiftId ? { shiftId: changes.shiftId } : state.shiftId ? { shiftId: state.shiftId } : {}),
    ...(state.branchId && { branchId: state.branchId }),
    ...(state.deviceId && { deviceId: state.deviceId }),
    status: changes.status ?? state.status,
    createdAt: new Date(state.createdAt),
    updatedAt: new Date(),
  };
}

export async function listTimeEntries(): Promise<TimeEntry[]> {
  const map = await loadTimeEntryMap();
  return Array.from(map.values())
    .filter(entry => !entry.deleted)
    .sort((a, b) => b.clockIn - a.clockIn) // Most recent first
    .map(state => ({
      id: state.id,
      userId: state.userId,
      userName: state.userName,
      clockIn: new Date(state.clockIn),
      ...(state.clockOut && { clockOut: new Date(state.clockOut) }),
      ...(state.duration !== undefined && { duration: state.duration }),
      ...(state.shiftId && { shiftId: state.shiftId }),
      ...(state.branchId && { branchId: state.branchId }),
      ...(state.deviceId && { deviceId: state.deviceId }),
      status: state.status,
      createdAt: new Date(state.createdAt),
      updatedAt: new Date(state.updatedAt),
    }));
}

export async function getUserTimeEntries(userId: string): Promise<TimeEntry[]> {
  const entries = await listTimeEntries();
  return entries.filter(entry => entry.userId === userId);
}

// Utility functions for shift correlation
export async function getCurrentShiftForUser(userId: string): Promise<Shift | null> {
  const shifts = await listShifts();
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Find shifts assigned to user that are active on current day and time
  const activeShifts = shifts.filter(shift => 
    shift.isActive &&
    shift.assignedUserIds.includes(userId) &&
    shift.daysOfWeek.includes(currentDay) &&
    currentTime >= shift.startTime &&
    currentTime <= shift.endTime
  );

  return activeShifts[0] || null; // Return first matching shift
}

export async function getShiftsByUser(userId: string): Promise<Shift[]> {
  const shifts = await listShifts();
  return shifts.filter(shift => shift.assignedUserIds.includes(userId));
}
