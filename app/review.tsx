import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { FoodTypeField } from '@/components/FoodTypeField';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAppData } from '@/src/context/AppContext';
import { useI18n } from '@/src/i18n/useI18n';
import { saveFoodEntry } from '@/src/services/foodService';
import { todayISO } from '@/src/utils/dates';
import {
  inferFoodType,
  reminderDateForFoodType,
  type FoodType,
} from '@/src/utils/foodType';

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
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();

  const photoUri = firstParam(params.photoUri) || null;
  const initialName = firstParam(params.name);
  const initialExpiry = firstParam(params.expirationDate) || todayISO();
  const rawText = useMemo(() => firstParam(params.rawText), [params.rawText]);
  const initialType = inferFoodType(initialName, rawText);

  const [name, setName] = useState(initialName);
  const [foodType, setFoodType] = useState<FoodType>(initialType);
  const [typeLocked, setTypeLocked] = useState(false);
  const [expirationDate, setExpirationDate] = useState(initialExpiry);
  const [reminderDate, setReminderDate] = useState(
    reminderDateForFoodType(initialExpiry, initialType, settings.daysBeforeExpiryByFoodType),
  );
  const [addToCalendar, setAddToCalendar] = useState(
    settings.addToCalendarByDefault,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: t('reviewTitle') });
  }, [navigation, t]);

  function applyFoodType(next: FoodType, expiry = expirationDate) {
    setFoodType(next);
    setReminderDate(
      reminderDateForFoodType(
        expiry,
        next,
        settings.daysBeforeExpiryByFoodType,
      ),
    );
  }

  function onNameChange(value: string) {
    setName(value);
    if (!typeLocked) {
      applyFoodType(inferFoodType(value, rawText));
    }
  }

  function onFoodTypeChange(next: FoodType) {
    setTypeLocked(true);
    applyFoodType(next);
  }

  function onExpiryChange(iso: string) {
    setExpirationDate(iso);
    setReminderDate(
      reminderDateForFoodType(
        iso,
        foodType,
        settings.daysBeforeExpiryByFoodType,
      ),
    );
  }

  async function onSave() {
    if (!name.trim()) {
      Alert.alert(t('nameRequired'), t('nameRequiredBody'));
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
        t('couldNotSave'),
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
          <Text style={{ color: colors.muted }}>{t('noPhoto')}</Text>
        </View>
      )}

      <Text style={[styles.label, { color: colors.muted }]}>{t('name')}</Text>
      <TextInput
        value={name}
        onChangeText={onNameChange}
        placeholder={t('namePlaceholder')}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
      />

      <FoodTypeField
        value={foodType}
        onChange={onFoodTypeChange}
        textColor={colors.text}
        borderColor={colors.border}
        mutedColor={colors.muted}
        tintColor={colors.tint}
        backgroundColor={colors.background}
      />

      <DateField
        label={t('expirationDate')}
        valueISO={expirationDate}
        onChange={onExpiryChange}
        textColor={colors.text}
        borderColor={colors.border}
        mutedColor={colors.muted}
      />

      <DateField
        label={t('remindMeOn')}
        valueISO={reminderDate}
        onChange={setReminderDate}
        textColor={colors.text}
        borderColor={colors.border}
        mutedColor={colors.muted}
      />

      <View style={styles.switchRow}>
        <Text style={[styles.label, { color: colors.text, flex: 1 }]}>
          {t('addCalendarAlarm')}
        </Text>
        <Switch value={addToCalendar} onValueChange={setAddToCalendar} />
      </View>

      {rawText ? (
        <Text style={[styles.raw, { color: colors.muted }]} numberOfLines={4}>
          OCR: {rawText}
        </Text>
      ) : null}

      <Pressable
        style={[
          styles.saveBtn,
          { backgroundColor: colors.tint },
          saving && { opacity: 0.6 },
        ]}
        onPress={onSave}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>{t('saveReminder')}</Text>
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
