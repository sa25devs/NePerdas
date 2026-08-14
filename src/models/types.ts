export type FoodItem = {
  id: string;
  name: string;
  photoUri: string | null;
  createdAt: string; // YYYY-MM-DD
  expirationDate: string; // YYYY-MM-DD
  reminderDate: string; // YYYY-MM-DD
  notificationId: string | null;
  calendarEventId: string | null;
};

export type AppSettings = {
  daysBeforeExpiry: number;
  reminderHour: number;
  reminderMinute: number;
  addToCalendarByDefault: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  daysBeforeExpiry: 1,
  reminderHour: 9,
  reminderMinute: 0,
  addToCalendarByDefault: false,
};
