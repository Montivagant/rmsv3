export type KdsSettings = {
  warningThresholdMinutes: number;
  dangerThresholdMinutes: number;
  autoRefreshSeconds: number;
  showPulse: boolean;
  showOnlyActive: boolean;
  defaultView: 'grid' | 'list';
  defaultDensity: 'compact' | 'comfortable';
};

const KDS_SETTINGS_KEY = 'kds_settings';

const DEFAULTS: KdsSettings = {
  warningThresholdMinutes: 7,
  dangerThresholdMinutes: 12,
  autoRefreshSeconds: 30,
  showPulse: true,
  showOnlyActive: false,
  defaultView: 'grid',
  defaultDensity: 'comfortable',
};

export function getKdsSettings(): KdsSettings {
  try {
    const raw = localStorage.getItem(KDS_SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveKdsSettings(partial: Partial<KdsSettings>): KdsSettings {
  const current = getKdsSettings();
  const next = { ...current, ...partial };
  try {
    localStorage.setItem(KDS_SETTINGS_KEY, JSON.stringify(next));
  } catch (error) {
    // Ignore localStorage errors - settings will use defaults
    console.warn('Failed to save KDS settings:', error);
  }
  return next;
}


