import { reloadAppAsync } from 'expo';
import { I18nManager, Platform } from 'react-native';

import { isRtlLanguage, type AppLanguage } from '@/src/i18n/translations';

/** Apply RTL/LTR to match the selected language. Reloads if the direction changed. */
export async function syncLayoutDirection(language: AppLanguage): Promise<void> {
  if (Platform.OS === 'web') return;
  const shouldBeRtl = isRtlLanguage(language);
  if (shouldBeRtl === I18nManager.isRTL) return;
  I18nManager.allowRTL(shouldBeRtl);
  I18nManager.forceRTL(shouldBeRtl);
  await reloadAppAsync('layout-direction');
}
