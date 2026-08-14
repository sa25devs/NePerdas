/** Pad number to 2 digits. */
function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Format a Date as YYYY-MM-DD in local time. */
export function formatISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Parse YYYY-MM-DD into a local Date at midnight. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Today's date as YYYY-MM-DD. */
export function todayISO(): string {
  return formatISODate(new Date());
}

/**
 * Reminder date = expiration minus daysBefore, clamped to not be before today.
 * Returns YYYY-MM-DD.
 */
export function computeReminderDate(
  expirationISO: string,
  daysBefore: number,
): string {
  const expiry = parseISODate(expirationISO);
  const reminder = new Date(expiry);
  reminder.setDate(reminder.getDate() - Math.max(0, daysBefore));

  const today = parseISODate(todayISO());
  if (reminder < today) {
    return todayISO();
  }
  return formatISODate(reminder);
}

/** Whole days from today until expiration (negative if past). */
export function daysUntil(expirationISO: string): number {
  const today = parseISODate(todayISO());
  const expiry = parseISODate(expirationISO);
  const ms = expiry.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Combine reminder date + hour/minute into a Date for scheduling. */
export function reminderDateTime(
  reminderISO: string,
  hour: number,
  minute: number,
): Date {
  const d = parseISODate(reminderISO);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export function formatDisplayDate(iso: string): string {
  const d = parseISODate(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
