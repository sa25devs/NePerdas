import { useEffect, useState } from 'react';
import {
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

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { settings, updateSettings } = useAppData();
  const [days, setDays] = useState(String(settings.daysBeforeExpiry));
  const [hour, setHour] = useState(String(settings.reminderHour));
  const [minute, setMinute] = useState(
    settings.reminderMinute.toString().padStart(2, '0'),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDays(String(settings.daysBeforeExpiry));
    setHour(String(settings.reminderHour));
    setMinute(settings.reminderMinute.toString().padStart(2, '0'));
  }, [settings]);

  async function onSave() {
    const next = {
      ...settings,
      daysBeforeExpiry: clamp(Number(days) || 1, 0, 30),
      reminderHour: clamp(Number(hour) || 9, 0, 23),
      reminderMinute: clamp(Number(minute) || 0, 0, 59),
    };
    await updateSettings(next);
    setDays(String(next.daysBeforeExpiry));
    setHour(String(next.reminderHour));
    setMinute(next.reminderMinute.toString().padStart(2, '0'));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <Text style={[styles.heading, { color: colors.text }]}>Reminders</Text>
      <Text style={[styles.help, { color: colors.muted }]}>
        Default reminder is one day before the expiration date. You can still
        change the date when reviewing each scan.
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}>
        <Text style={[styles.label, { color: colors.text }]}>
          Days before expiry
        </Text>
        <TextInput
          value={days}
          onChangeText={setDays}
          keyboardType="number-pad"
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border },
          ]}
        />

        <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>
          Reminder time (24h)
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
            Add calendar alarm by default
          </Text>
          <Switch
            value={settings.addToCalendarByDefault}
            onValueChange={async (v) => {
              await updateSettings({ ...settings, addToCalendarByDefault: v });
            }}
          />
        </View>
      </View>

      <Pressable
        style={[styles.saveBtn, { backgroundColor: colors.tint }]}
        onPress={onSave}>
        <Text style={styles.saveText}>{saved ? 'Saved' : 'Save settings'}</Text>
      </Pressable>

      <Text style={[styles.footnote, { color: colors.muted }]}>
        Label reading uses on-device OCR (free, offline). A paid Firebase AI
        Logic option can be added later without changing the scan flow.
      </Text>
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
  label: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
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
});
