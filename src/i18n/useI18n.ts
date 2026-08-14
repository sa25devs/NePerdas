import { useCallback, useMemo } from 'react';

import { useAppData } from '@/src/context/AppContext';
import {
  localeForLanguage,
  translate,
  type AppLanguage,
  type TranslationKey,
} from '@/src/i18n/translations';
import { parseISODate } from '@/src/utils/dates';

export function useI18n() {
  const { settings } = useAppData();
  const language: AppLanguage = settings.language ?? 'en';
  const locale = localeForLanguage(language);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(language, key, vars),
    [language],
  );

  const formatDate = useCallback(
    (iso: string) => {
      const d = parseISODate(iso);
      return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    },
    [locale],
  );

  return useMemo(
    () => ({ language, locale, t, formatDate }),
    [language, locale, t, formatDate],
  );
}
