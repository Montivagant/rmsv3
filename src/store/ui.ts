import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Density = 'comfortable' | 'compact';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type NumberFormat = '1,234.56' | '1.234,56';

interface UIState {
  // Layout preferences
  density: Density;
  sidebarCollapsed: boolean;
  
  // Format preferences
  dateFormat: DateFormat;
  numberFormat: NumberFormat;
  
  // Actions
  setDensity: (density: Density) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setDateFormat: (format: DateFormat) => void;
  setNumberFormat: (format: NumberFormat) => void;
  resetToDefaults: () => void;
  reset: () => void;
}

const defaultState = {
  density: 'comfortable' as Density,
  sidebarCollapsed: false,
  dateFormat: 'DD/MM/YYYY' as DateFormat,
  numberFormat: '1,234.56' as NumberFormat,
};

export const useUI = create<UIState>()(persist(
  (set) => ({
    ...defaultState,
    
    setDensity: (density) => set({ density }),
    setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    setDateFormat: (dateFormat) => set({ dateFormat }),
    setNumberFormat: (numberFormat) => set({ numberFormat }),
    resetToDefaults: () => set(defaultState),
    reset: () => set(defaultState),
  }),
  {
    name: 'rms-ui-preferences',
  }
));

// Helper to get density classes
export const getDensityClasses = (density: Density) => {
  return density === 'compact' ? 'rms-compact' : 'rms-comfortable';
};

// Helper to format dates (mock implementation)
export const formatDate = (date: Date, format: DateFormat): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return format === 'DD/MM/YYYY' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
};

// Helper to format numbers (mock implementation)
export const formatNumber = (num: number, format: NumberFormat): string => {
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return format === '1.234,56' ? formatted.replace(/,/g, ' ').replace(/\./g, ',').replace(/ /g, '.') : formatted;
};