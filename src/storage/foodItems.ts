import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FoodItem } from '@/src/models/types';
import { migratePhotoRef } from '@/src/storage/photos';

const ITEMS_KEY = 'neperdas:foodItems';

export async function loadFoodItems(): Promise<FoodItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as FoodItem[];
    const migrated = await migrateItemPhotos(items);
    return migrated.sort((a, b) =>
      a.expirationDate.localeCompare(b.expirationDate),
    );
  } catch {
    return [];
  }
}

async function migrateItemPhotos(items: FoodItem[]): Promise<FoodItem[]> {
  let changed = false;
  const next: FoodItem[] = [];
  for (const item of items) {
    const photoUri = await migratePhotoRef(item.photoUri, item.id);
    if (photoUri !== item.photoUri) {
      changed = true;
      next.push({ ...item, photoUri });
    } else {
      next.push(item);
    }
  }
  if (changed) {
    await persist(next);
  }
  return next;
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
