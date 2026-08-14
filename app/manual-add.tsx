import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function ManualAddScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { settings, refreshItems } = useAppData();
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();

  const initialExpiry = todayISO();
  const [name, setName] = useState('');
  const [foodType, setFoodType] = useState<FoodType>('unknown');
  const [typeLocked, setTypeLocked] = useState(false);
  const [expirationDate, setExpirationDate] = useState(initialExpiry);
  const [reminderDate, setReminderDate] = useState(
    reminderDateForFoodType(
      initialExpiry,
      'unknown',
      settings.daysBeforeExpiryByFoodType,
    ),
  );
  const [addToCalendar, setAddToCalendar] = useState(
    settings.addToCalendarByDefault,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: t('manualAddTitle') });
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
      applyFoodType(inferFoodType(value));
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
        addToCalendar,
      });
      await refreshItems();
      router.back();
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
      <Text style={[styles.label, { color: colors.muted }]}>{t('name')}</Text>
      <TextInput
        value={name}
        onChangeText={onNameChange}
        placeholder={t('namePlaceholderYogurt')}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border },
        ]}
        autoFocus
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

      <View style={styles.actions}>
        <Pressable
          style={[
            styles.cancelBtn,
            { borderColor: colors.border },
            saving && { opacity: 0.6 },
          ]}
          onPress={() => router.back()}
          disabled={saving}>
          <Text style={[styles.cancelText, { color: colors.text }]}>
            {t('cancel')}
          </Text>
        </Pressable>
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
            <Text style={styles.saveText}>{t('save')}</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
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
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelText: { fontWeight: '700', fontSize: 16 },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
