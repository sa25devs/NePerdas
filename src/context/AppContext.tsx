import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { AppSettings, FoodItem } from '@/src/models/types';
import { listFoodItems } from '@/src/services/foodService';
import { loadSettings, saveSettings } from '@/src/storage/settings';
import { DEFAULT_SETTINGS } from '@/src/models/types';
import { syncLayoutDirection } from '@/src/i18n/rtl';

type AppContextValue = {
  items: FoodItem[];
  settings: AppSettings;
  loading: boolean;
  refreshItems: () => Promise<void>;
  updateSettings: (next: AppSettings) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refreshItems = useCallback(async () => {
    const list = await listFoodItems();
    setItems(list);
  }, []);

  const updateSettings = useCallback(async (next: AppSettings) => {
    await saveSettings(next);
    setSettings(next);
    await syncLayoutDirection(next.language);
  }, []);

  useEffect(() => {
    (async () => {
      const [s, list] = await Promise.all([loadSettings(), listFoodItems()]);
      setSettings(s);
      setItems(list);
      setLoading(false);
      await syncLayoutDirection(s.language);
    })();
  }, []);

  const value = useMemo(
    () => ({ items, settings, loading, refreshItems, updateSettings }),
    [items, settings, loading, refreshItems, updateSettings],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppData must be used within AppProvider');
  }
  return ctx;
}
