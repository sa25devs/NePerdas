import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

import {
    localeForLanguage,
    translate,
    type AppLanguage,
} from '@/src/i18n/translations';
import type { FoodItem } from '@/src/models/types';
import { parseISODate, reminderDateTime } from '@/src/utils/dates';

export async function ensureCalendarPermissions(): Promise<boolean> {
  const current = await Calendar.getCalendarPermissionsAsync();
  if (current.granted) return true;
  const requested = await Calendar.requestCalendarPermissionsAsync();
  return requested.granted;
}

async function getWritableCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );
  const writable = calendars.find((c) => c.allowsModifications);
  if (writable) return writable.id;

  if (Platform.OS === 'ios') {
    try {
      const defaultCal = await Calendar.getDefaultCalendarAsync();
      return defaultCal?.id ?? null;
    } catch {
      return null;
    }
  }

  try {
    const sources = await Calendar.getSourcesAsync();
    const local =
      sources.find((s) => s.type === Calendar.SourceType.LOCAL) ?? sources[0];
    if (!local) return null;

    return await Calendar.createCalendarAsync({
      title: 'Notires',
      color: '#2E7D32',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: local.id,
      source: local,
      name: 'notires',
      ownerAccount: 'Notires',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  } catch {
    return null;
  }
}

export async function removeCalendarEvent(
  eventId: string | null,
): Promise<void> {
  if (!eventId) return;
  try {
    await Calendar.deleteEventAsync(eventId);
  } catch {
    // already gone
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
 * Create a calendar event with an alarm at the reminder datetime.
 * Optionally also alarms 15 minutes before the expiration date/time.
 * Returns the event id, or null on failure / denied permission.
 */
export async function addCalendarAlarm(
  item: FoodItem,
  hour: number,
  minute: number,
  language: AppLanguage = 'en',
  alarm15MinBeforeExpiry = true,
): Promise<string | null> {
  const granted = await ensureCalendarPermissions();
  if (!granted) return null;

  await removeCalendarEvent(item.calendarEventId);

  const calendarId = await getWritableCalendarId();
  if (!calendarId) return null;

  const start = reminderDateTime(item.reminderDate, hour, minute);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const dateLabel = formatDate(item.expirationDate, language);

  const alarms: { relativeOffset: number }[] = [{ relativeOffset: 0 }];
  if (alarm15MinBeforeExpiry) {
    const expiryAt = reminderDateTime(item.expirationDate, hour, minute);
    const fifteenBefore = new Date(expiryAt.getTime() - 15 * 60 * 1000);
    const offsetMinutes = Math.round(
      (fifteenBefore.getTime() - start.getTime()) / (60 * 1000),
    );
    if (offsetMinutes !== 0) {
      alarms.push({ relativeOffset: offsetMinutes });
    }
  }

  try {
    const eventId = await Calendar.createEventAsync(calendarId, {
      title: translate(language, 'calendarEventTitle', { name: item.name }),
      notes: translate(language, 'calendarEventNotes', {
        name: item.name,
        date: dateLabel,
      }),
      startDate: start,
      endDate: end,
      allDay: false,
      alarms,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return eventId;
  } catch {
    return null;
  }
}
