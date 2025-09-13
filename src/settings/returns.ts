export type ReturnStage = 'before_payment' | 'same_day' | 'anytime_with_approval';

export interface ReturnSettings {
  requirePin: boolean;
  pin: string;
  stage: ReturnStage;
}

const KEY_REQUIRE = 'rms_require_return_pin';
const KEY_PIN = 'rms_return_pin_code';
const KEY_STAGE = 'rms_return_stage';

const DEFAULTS: ReturnSettings = {
  requirePin: false,
  pin: '',
  stage: 'same_day',
};

export function getReturnSettings(): ReturnSettings {
  try {
    const requirePin = localStorage.getItem(KEY_REQUIRE);
    const pin = localStorage.getItem(KEY_PIN);
    const stage = localStorage.getItem(KEY_STAGE) as ReturnStage | null;
    return {
      requirePin: requirePin === '1',
      pin: pin || DEFAULTS.pin,
      stage: stage || DEFAULTS.stage,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveReturnSettings(next: Partial<ReturnSettings>): ReturnSettings {
  const current = getReturnSettings();
  const merged: ReturnSettings = {
    requirePin: next.requirePin ?? current.requirePin,
    pin: next.pin ?? current.pin,
    stage: next.stage ?? current.stage,
  };
  try {
    localStorage.setItem(KEY_REQUIRE, merged.requirePin ? '1' : '0');
    localStorage.setItem(KEY_PIN, merged.pin);
    localStorage.setItem(KEY_STAGE, merged.stage);
  } catch {}
  return merged;
}

export function requireReturnPin(): boolean {
  return getReturnSettings().requirePin;
}

export function getReturnPin(): string {
  return getReturnSettings().pin;
}

export function getReturnStage(): ReturnStage {
  return getReturnSettings().stage;
}


