import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FoodItem } from '@/src/models/types';

const ITEMS_KEY = 'simplyfresh:foodItems';

export async function loadFoodItems(): Promise<FoodItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as FoodItem[];
    return items.sort((a, b) =>
      a.expirationDate.localeCompare(b.expirationDate),
    );
  } catch {
    return [];
  }
}

async function persist(items: FoodItem[]): Promise<void> {
  await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export async function getFoodItem(id: string): Promise<FoodItem | null> {
  const items = await loadFoodItems();
  return items.find((i) => i.id === id) ?? null;
}

export async function upsertFoodItem(item: FoodItem): Promise<void> {
  const items = await loadFoodItems();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    items[idx] = item;
  } else {
    items.push(item);
  }
  items.sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
  await persist(items);
}

export async function deleteFoodItem(id: string): Promise<FoodItem | null> {
  const items = await loadFoodItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const [removed] = items.splice(idx, 1);
  await persist(items);
  return removed;
}
