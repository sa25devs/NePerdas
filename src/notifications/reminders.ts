import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AppLanguage } from '@/src/i18n/translations';
import {
    localeForLanguage,
    translate,
} from '@/src/i18n/translations';
import type { FoodItem } from '@/src/models/types';
import { parseISODate, reminderDateTime } from '@/src/utils/dates';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermissions(
  language: AppLanguage = 'en',
): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    await ensureAndroidChannel(language);
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  if (requested.granted) {
    await ensureAndroidChannel(language);
    return true;
  }
  return false;
}

async function ensureAndroidChannel(language: AppLanguage): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('expiry', {
      name: translate(language, 'notificationChannel'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

export async function cancelReminder(
  notificationId: string | null,
): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // already cancelled
  }
}

function formatDate(iso: string, language: AppLanguage): string {
  return parseISODate(iso).toLocaleDateString(localeForLanguage(language), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Schedule a local notification for the item's reminder date/time.
 * Returns the notification identifier, or null if scheduling failed / past.
 */
export async function scheduleReminder(
  item: FoodItem,
  hour: number,
  minute: number,
  language: AppLanguage = 'en',
): Promise<string | null> {
  await cancelReminder(item.notificationId);

  const granted = await ensureNotificationPermissions(language);
  if (!granted) return null;

  const when = reminderDateTime(item.reminderDate, hour, minute);
  if (when.getTime() <= Date.now()) {
    when.setTime(Date.now() + 5000);
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Notires',
      body: translate(language, 'notificationBody', {
        name: item.name,
        date: formatDate(item.expirationDate, language),
      }),
      data: { itemId: item.id },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'expiry' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
    },
  });

  return id;
}
