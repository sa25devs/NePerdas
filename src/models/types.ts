import type { AppLanguage } from '@/src/i18n/translations';
import {
  DAYS_BEFORE_BY_FOOD_TYPE,
  type FoodType,
} from '@/src/utils/foodType';

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

export type DaysBeforeExpiryByFoodType = Record<FoodType, number>;

export type AppSettings = {
  daysBeforeExpiryByFoodType: DaysBeforeExpiryByFoodType;
  reminderHour: number;
  reminderMinute: number;
  addToCalendarByDefault: boolean;
  /** Calendar event also gets an alarm 15 minutes before expiration. */
  calendarAlarm15MinBeforeExpiry: boolean;
  language: AppLanguage;
};

export const DEFAULT_SETTINGS: AppSettings = {
  daysBeforeExpiryByFoodType: { ...DAYS_BEFORE_BY_FOOD_TYPE },
  reminderHour: 9,
  reminderMinute: 0,
  addToCalendarByDefault: false,
  calendarAlarm15MinBeforeExpiry: true,
  language: 'en',
};
