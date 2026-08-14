import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DateField } from '@/components/DateField';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAppData } from '@/src/context/AppContext';
import { saveFoodEntry } from '@/src/services/foodService';
import {
  computeReminderDate,
  todayISO,
} from '@/src/utils/dates';

function firstParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

export default function ReviewScreen() {
  const params = useLocalSearchParams<{
    photoUri?: string;
    name?: string;
    expirationDate?: string;
    rawText?: string;
  }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { settings, refreshItems } = useAppData();
  const router = useRouter();

  const photoUri = firstParam(params.photoUri) || null;
  const initialExpiry = firstParam(params.expirationDate) || todayISO();

  const [name, setName] = useState(firstParam(params.name));
  const [expirationDate, setExpirationDate] = useState(initialExpiry);
  const [reminderDate, setReminderDate] = useState(
    computeReminderDate(initialExpiry, settings.daysBeforeExpiry),
  );
  const [addToCalendar, setAddToCalendar] = useState(
    settings.addToCalendarByDefault,
  );
  const [saving, setSaving] = useState(false);

  const rawText = useMemo(() => firstParam(params.rawText), [params.rawText]);

  function onExpiryChange(iso: string) {
    setExpirationDate(iso);
    setReminderDate(computeReminderDate(iso, settings.daysBeforeExpiry));
  }

  async function onSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter a name for this food item.');
      return;
    }
    setSaving(true);
    try {
      await saveFoodEntry({
        name,
        expirationDate,
        reminderDate,
        photoSourceUri: photoUri,
        addToCalendar,
      });
      await refreshItems();
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert(
        'Could not save',
        e instanceof Error ? e.message : 'Unknown error',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={{ color: colors.muted }}>No photo</Text>
        </View>
      )}

      <Text style={[styles.label, { color: colors.muted }]}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Milk"
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
      />

      <DateField
        label="Expiration date"
        valueISO={expirationDate}
        onChange={onExpiryChange}
        textColor={colors.text}
        borderColor={colors.border}
        mutedColor={colors.muted}
      />

      <DateField
        label="Remind me on"
        valueISO={reminderDate}
        onChange={setReminderDate}
        textColor={colors.text}
        borderColor={colors.border}
        mutedColor={colors.muted}
      />

      <View style={styles.switchRow}>
        <Text style={[styles.label, { color: colors.text, flex: 1 }]}>
          Add calendar alarm
        </Text>
        <Switch value={addToCalendar} onValueChange={setAddToCalendar} />
      </View>

      {rawText ? (
        <Text style={[styles.raw, { color: colors.muted }]} numberOfLines={4}>
          OCR: {rawText}
        </Text>
      ) : null}

      <Pressable
        style={[styles.saveBtn, { backgroundColor: colors.tint }, saving && { opacity: 0.6 }]}
        onPress={onSave}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Save reminder</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#ddd',
  },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  raw: { fontSize: 12, lineHeight: 16 },
  saveBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
