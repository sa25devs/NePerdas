import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { FoodItem } from '@/src/models/types';
import { formatDisplayDate, reminderDateTime } from '@/src/utils/dates';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    await ensureAndroidChannel();
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  if (requested.granted) {
    await ensureAndroidChannel();
    return true;
  }
  return false;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('expiry', {
      name: 'Food expiry',
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

/**
 * Schedule a local notification for the item's reminder date/time.
 * Returns the notification identifier, or null if scheduling failed / past.
 */
export async function scheduleReminder(
  item: FoodItem,
  hour: number,
  minute: number,
): Promise<string | null> {
  await cancelReminder(item.notificationId);

  const granted = await ensureNotificationPermissions();
  if (!granted) return null;

  const when = reminderDateTime(item.reminderDate, hour, minute);
  if (when.getTime() <= Date.now()) {
    // If already due, schedule a few seconds from now so the user still gets it
    when.setTime(Date.now() + 5000);
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'SimplyFresh',
      body: `${item.name} expires on ${formatDisplayDate(item.expirationDate)}`,
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
