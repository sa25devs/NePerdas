import { DEFAULT_SETTINGS, type AppSettings, type FoodItem } from '@/src/models/types';
import { addCalendarAlarm, removeCalendarEvent } from '@/src/calendar/events';
import {
  cancelReminder,
  scheduleReminder,
} from '@/src/notifications/reminders';
import {
  deleteFoodItem,
  getFoodItem,
  loadFoodItems,
  upsertFoodItem,
} from '@/src/storage/foodItems';
import { deletePhoto, persistPhoto } from '@/src/storage/photos';
import { loadSettings } from '@/src/storage/settings';
import {
  computeReminderDate,
  todayISO,
} from '@/src/utils/dates';

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export type SaveFoodInput = {
  id?: string;
  name: string;
  expirationDate: string;
  reminderDate?: string;
  photoSourceUri?: string | null;
  existingPhotoUri?: string | null;
  addToCalendar: boolean;
};

export async function saveFoodEntry(input: SaveFoodInput): Promise<FoodItem> {
  const settings = await loadSettings();
  const id = input.id ?? newId();

  let photoUri = input.existingPhotoUri ?? null;
  if (input.photoSourceUri) {
    photoUri = await persistPhoto(input.photoSourceUri, id);
  }

  const reminderDate =
    input.reminderDate ??
    computeReminderDate(input.expirationDate, settings.daysBeforeExpiry);

  const existing = input.id ? await getFoodItem(input.id) : null;

  let item: FoodItem = {
    id,
    name: input.name.trim() || 'Untitled food',
    photoUri,
    createdAt: existing?.createdAt ?? todayISO(),
    expirationDate: input.expirationDate,
    reminderDate,
    notificationId: existing?.notificationId ?? null,
    calendarEventId: existing?.calendarEventId ?? null,
  };

  const notificationId = await scheduleReminder(
    item,
    settings.reminderHour,
    settings.reminderMinute,
  );
  item = { ...item, notificationId };

  if (input.addToCalendar) {
    const calendarEventId = await addCalendarAlarm(
      item,
      settings.reminderHour,
      settings.reminderMinute,
    );
    item = { ...item, calendarEventId };
  } else if (existing?.calendarEventId) {
    await removeCalendarEvent(existing.calendarEventId);
    item = { ...item, calendarEventId: null };
  }

  await upsertFoodItem(item);
  return item;
}

export async function removeFoodEntry(id: string): Promise<void> {
  const removed = await deleteFoodItem(id);
  if (!removed) return;
  await cancelReminder(removed.notificationId);
  await removeCalendarEvent(removed.calendarEventId);
  await deletePhoto(removed.photoUri);
}

export async function listFoodItems(): Promise<FoodItem[]> {
  return loadFoodItems();
}

export async function getSettings(): Promise<AppSettings> {
  return loadSettings();
}

export { DEFAULT_SETTINGS };
