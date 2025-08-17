import { create } from 'zustand';
import { type Flags, loadFlags, saveFlags, loadDefaults, saveDefaults, resetFlags } from '../lib/flags';

interface FlagsState {
  flags: Flags;
  technicalDefaults: Flags;
  setFlag: (flag: keyof Flags, value: boolean) => void;
  setTechnicalDefaults: (defaults: Flags) => void;
  resetToDefaults: () => void;
  resetToTechnicalDefaults: () => void;
}

export const useFlags = create<FlagsState>()((set, get) => ({
  flags: loadFlags(),
  technicalDefaults: loadDefaults(),
  
  setFlag: (flag, value) => {
    const newFlags = { ...get().flags, [flag]: value };
    saveFlags(newFlags);
    set({ flags: newFlags });
  },
  
  setTechnicalDefaults: (technicalDefaults) => {
    saveDefaults(technicalDefaults);
    set({ technicalDefaults });
  },
  
  resetToDefaults: () => {
    const defaults = get().technicalDefaults;
    saveFlags(defaults);
    set({ flags: defaults });
  },
  
  resetToTechnicalDefaults: () => {
    const resetted = resetFlags();
    set({ flags: resetted, technicalDefaults: loadDefaults() });
  },
}));

// Helper to check if a feature is enabled
export const useFeature = (feature: keyof Flags): boolean => {
  return useFlags((state) => state.flags[feature]);
};