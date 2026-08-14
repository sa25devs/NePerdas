import { useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAppData } from '@/src/context/AppContext';
import { LANGUAGES, type AppLanguage } from '@/src/i18n/translations';
import { useI18n } from '@/src/i18n/useI18n';
import { DEFAULT_SETTINGS, type DaysBeforeExpiryByFoodType } from '@/src/models/types';
import {
  FOOD_TYPES,
  FOOD_TYPE_LABEL_KEYS,
  type FoodType,
} from '@/src/utils/foodType';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function daysStateFromSettings(
  daysByType: DaysBeforeExpiryByFoodType,
): Record<FoodType, string> {
  return {
    dairy: String(daysByType.dairy),
    meat: String(daysByType.meat),
    fish: String(daysByType.fish),
    vegetables: String(daysByType.vegetables),
    unknown: String(daysByType.unknown),
  };
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { settings, updateSettings } = useAppData();
  const { t } = useI18n();
  const [daysByType, setDaysByType] = useState(
    daysStateFromSettings(settings.daysBeforeExpiryByFoodType),
  );
  const [hour, setHour] = useState(String(settings.reminderHour));
  const [minute, setMinute] = useState(
    settings.reminderMinute.toString().padStart(2, '0'),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDaysByType(daysStateFromSettings(settings.daysBeforeExpiryByFoodType));
    setHour(String(settings.reminderHour));
    setMinute(settings.reminderMinute.toString().padStart(2, '0'));
  }, [settings]);

  async function onSave() {
    const daysBeforeExpiryByFoodType = Object.fromEntries(
      FOOD_TYPES.map((type) => {
        const raw = daysByType[type].trim();
        const parsed = Number(raw);
        const fallback = DEFAULT_SETTINGS.daysBeforeExpiryByFoodType[type];
        return [
          type,
          clamp(raw === '' || !Number.isFinite(parsed) ? fallback : parsed, 0, 30),
        ];
      }),
    ) as DaysBeforeExpiryByFoodType;
    const next = {
      ...settings,
      daysBeforeExpiryByFoodType,
      reminderHour: clamp(Number(hour) || 9, 0, 23),
      reminderMinute: clamp(Number(minute) || 0, 0, 59),
    };
    await updateSettings(next);
    setDaysByType(daysStateFromSettings(next.daysBeforeExpiryByFoodType));
    setHour(String(next.reminderHour));
    setMinute(next.reminderMinute.toString().padStart(2, '0'));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function onSelectLanguage(language: AppLanguage) {
    if (language === settings.language) return;
    await updateSettings({ ...settings, language });
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <Text style={[styles.heading, { color: colors.text }]}>
        {t('language')}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}>
        <View style={styles.langRow}>
          {LANGUAGES.map((lang) => {
            const selected = settings.language === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => onSelectLanguage(lang.code)}
                style={[
                  styles.langChip,
                  {
                    borderColor: selected ? colors.tint : colors.border,
                    backgroundColor: selected
                      ? colors.tint
                      : colors.background,
                  },
                ]}>
                <Text
                  style={{
                    color: selected ? '#fff' : colors.text,
                    fontWeight: '600',
                  }}>
                  {lang.nativeLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={[styles.heading, { color: colors.text }]}>
        {t('settingsReminders')}
      </Text>
      <Text style={[styles.help, { color: colors.muted }]}>
        {t('settingsHelp')}
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}>
        <Text style={[styles.label, { color: colors.text }]}>
          {t('daysBeforeExpiry')}
        </Text>
        {FOOD_TYPES.map((type) => (
          <View key={type} style={styles.daysRow}>
            <Text style={[styles.daysLabel, { color: colors.text }]}>
              {t(FOOD_TYPE_LABEL_KEYS[type])}
            </Text>
            <TextInput
              value={daysByType[type]}
              onChangeText={(value) =>
                setDaysByType((current) => ({ ...current, [type]: value }))
              }
              keyboardType="number-pad"
              maxLength={2}
              style={[
                styles.timeInput,
                { color: colors.text, borderColor: colors.border },
              ]}
            />
          </View>
        ))}

        <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
          {t('reminderTime')}
        </Text>
        <View style={styles.timeRow}>
          <TextInput
            value={hour}
            onChangeText={setHour}
            keyboardType="number-pad"
            style={[
              styles.timeInput,
              { color: colors.text, borderColor: colors.border },
            ]}
            maxLength={2}
          />
          <Text style={{ color: colors.text, fontSize: 20 }}>:</Text>
          <TextInput
            value={minute}
            onChangeText={setMinute}
            keyboardType="number-pad"
            style={[
              styles.timeInput,
              { color: colors.text, borderColor: colors.border },
            ]}
            maxLength={2}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text, flex: 1 }]}>
            {t('addCalendarDefault')}
          </Text>
          <Switch
            value={settings.addToCalendarByDefault}
            onValueChange={async (v) => {
              await updateSettings({ ...settings, addToCalendarByDefault: v });
            }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text, flex: 1 }]}>
            {t('calendarAlarm15MinBefore')}
          </Text>
          <Switch
            value={settings.calendarAlarm15MinBeforeExpiry}
            onValueChange={async (v) => {
              await updateSettings({
                ...settings,
                calendarAlarm15MinBeforeExpiry: v,
              });
            }}
          />
        </View>
      </View>

      <Pressable
        style={[styles.saveBtn, { backgroundColor: colors.tint }]}
        onPress={onSave}>
        <Text style={styles.saveText}>
          {saved ? t('saved') : t('saveSettings')}
        </Text>
      </Pressable>

      <Text style={[styles.footnote, { color: colors.muted }]}>
        {t('settingsFootnote')}
      </Text>

      <Text style={[styles.heading, { color: colors.text, marginTop: 8 }]}>
        {t('about')}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}>
        <Text style={[styles.aboutText, { color: colors.muted }]}>
          {t('aboutCredit')}
        </Text>
        <Pressable
          onPress={() => {
            void Linking.openURL('mailto:sa25.devs@gmail.com');
          }}>
          <Text style={[styles.aboutEmail, { color: colors.tint }]}>
            sa25.devs@gmail.com
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 12 },
  heading: { fontSize: 22, fontWeight: '700' },
  help: { fontSize: 14, lineHeight: 20 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
  },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  daysLabel: { flex: 1, fontSize: 15 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: {
    width: 56,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footnote: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  aboutText: { fontSize: 15, lineHeight: 22 },
  aboutEmail: { fontSize: 15, lineHeight: 22, marginTop: 4 },
});
