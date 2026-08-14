import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

import type { FoodItem } from '@/src/models/types';
import { formatDisplayDate, reminderDateTime } from '@/src/utils/dates';

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

  // Android: create a local calendar if none writable
  try {
    const sources = await Calendar.getSourcesAsync();
    const local =
      sources.find((s) => s.type === Calendar.SourceType.LOCAL) ?? sources[0];
    if (!local) return null;

    return await Calendar.createCalendarAsync({
      title: 'SimplyFresh',
      color: '#2E7D32',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: local.id,
      source: local,
      name: 'simplyfresh',
      ownerAccount: 'SimplyFresh',
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

/**
 * Create a calendar event with an alarm at the reminder datetime.
 * Returns the event id, or null on failure / denied permission.
 */
export async function addCalendarAlarm(
  item: FoodItem,
  hour: number,
  minute: number,
): Promise<string | null> {
  const granted = await ensureCalendarPermissions();
  if (!granted) return null;

  await removeCalendarEvent(item.calendarEventId);

  const calendarId = await getWritableCalendarId();
  if (!calendarId) return null;

  const start = reminderDateTime(item.reminderDate, hour, minute);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  try {
    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `SimplyFresh: ${item.name} expiring`,
      notes: `${item.name} expires on ${formatDisplayDate(item.expirationDate)}.`,
      startDate: start,
      endDate: end,
      allDay: false,
      alarms: [{ relativeOffset: 0 }],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return eventId;
  } catch {
    return null;
  }
}
