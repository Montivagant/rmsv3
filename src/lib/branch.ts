/**
 * Branch utilities
 * Reads the user's preferred/default branch for event enrichment and filters
 */

const DEFAULT_BRANCH_FALLBACK = 'main-restaurant';

export function getCurrentBranchId(): string {
  try {
    // Preference saved via account preferences flow
    const stored = localStorage.getItem('rms.preferences');
    if (stored) {
      const prefs = JSON.parse(stored) as { defaultBranchId?: string };
      if (prefs.defaultBranchId) return prefs.defaultBranchId;
    }

    // Fallback to user preferences mirror used elsewhere
    const userPrefs = localStorage.getItem('rms_user_preferences');
    if (userPrefs) {
      const prefs = JSON.parse(userPrefs) as { defaultBranch?: string };
      if (prefs.defaultBranch) return prefs.defaultBranch;
    }
  } catch {
    // Ignore errors from localStorage access or JSON parsing
  }
  return DEFAULT_BRANCH_FALLBACK;
}


