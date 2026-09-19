import AsyncStorage from '@react-native-async-storage/async-storage';

import { languageFromDevice } from '@/src/i18n/deviceLanguage';
import {
    VALID_LANGUAGES,
    type AppLanguage,
} from '@/src/i18n/translations';
import {
    DEFAULT_SETTINGS,
    type AppSettings,
    type DaysBeforeExpiryByFoodType,
} from '@/src/models/types';
import { FOOD_TYPES } from '@/src/utils/foodType';

const SETTINGS_KEY = 'notires:settings';

function clampDays(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(30, Math.max(0, Math.round(n)));
}

function normalizeDaysByFoodType(
  parsed: Partial<DaysBeforeExpiryByFoodType> | undefined,
): DaysBeforeExpiryByFoodType {
  const defaults = DEFAULT_SETTINGS.daysBeforeExpiryByFoodType;
  const next = { ...defaults };
  for (const type of FOOD_TYPES) {
    next[type] = clampDays(parsed?.[type], defaults[type]);
  }
  return next;
}

export function defaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, language: languageFromDevice() };
}

export async function loadSettings(): Promise<AppSettings> {
  const fallback = defaultSettings();
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const language = VALID_LANGUAGES.has(parsed.language as AppLanguage)
      ? (parsed.language as AppLanguage)
      : fallback.language;
    return {
      ...fallback,
      ...parsed,
      daysBeforeExpiryByFoodType: normalizeDaysByFoodType(
        parsed.daysBeforeExpiryByFoodType,
      ),
      language,
    };
  } catch {
    return fallback;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
