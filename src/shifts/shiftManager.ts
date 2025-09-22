/**
 * Shift Management System
 * 
 * Handles employee clock in/out and shift tracking
 */

// Mock implementation for now - would connect to actual backend in production
const SHIFTS_STORAGE_KEY = 'rms_active_shift';

interface ShiftResult {
  success: boolean;
  error?: string;
}

interface Shift {
  active: boolean;
  startTime?: Date;
  endTime?: Date;
  employee?: string;
}

// Get current active shift
export function getActiveShift(): Shift | null {
  try {
    const stored = localStorage.getItem(SHIFTS_STORAGE_KEY);
    if (!stored) return null;
    
    const shift = JSON.parse(stored);
    
    // Convert string dates back to Date objects
    if (shift.startTime) {
      shift.startTime = new Date(shift.startTime);
    }
    if (shift.endTime) {
      shift.endTime = new Date(shift.endTime);
    }
    
    return shift;
  } catch (error) {
    console.error('Error getting active shift:', error);
    return null;
  }
}

// Start a new shift
export async function startShift(pin: string): Promise<ShiftResult> {
  try {
    // Validate PIN
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return { success: false, error: 'Invalid PIN. Must be 4-6 digits.' };
    }
    
    // Check if already on shift
    const currentShift = getActiveShift();
    if (currentShift?.active) {
      return { success: false, error: 'Already clocked in. End current shift first.' };
    }
    
    // In a real app, we would validate the PIN against the database
    // For now, we'll just accept any valid PIN format
    
    // Create new shift
    const newShift: Shift = {
      active: true,
      startTime: new Date(),
      employee: 'Current User', // Would be fetched based on PIN in real app
    };
    
    // Save to storage
    localStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(newShift));
    
    return { success: true };
  } catch (error) {
    console.error('Error starting shift:', error);
    return { success: false, error: 'Failed to start shift' };
  }
}

// End current shift
export async function endShift(): Promise<ShiftResult> {
  try {
    // Check if on shift
    const currentShift = getActiveShift();
    if (!currentShift?.active) {
      return { success: false, error: 'Not currently on shift.' };
    }
    
    // End shift
    currentShift.active = false;
    currentShift.endTime = new Date();
    
    // In a real app, we would save the completed shift to the database
    // and clear the active shift
    
    // For now, just clear the active shift
    localStorage.removeItem(SHIFTS_STORAGE_KEY);
    
    return { success: true };
  } catch (error) {
    console.error('Error ending shift:', error);
    return { success: false, error: 'Failed to end shift' };
  }
}

// Get shift history
export async function getShiftHistory(): Promise<Shift[]> {
  // In a real app, this would fetch from the database
  // For now, return empty array
  return [];
}
