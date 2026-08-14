import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
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
import { useI18n } from '@/src/i18n/useI18n';
import type { FoodItem } from '@/src/models/types';
import {
  removeFoodEntry,
  saveFoodEntry,
} from '@/src/services/foodService';
import { getFoodItem } from '@/src/storage/foodItems';
import { resolvePhotoUri } from '@/src/storage/photos';
import { daysUntil } from '@/src/utils/dates';
import { inferFoodType, reminderDateForFoodType } from '@/src/utils/foodType';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { settings, refreshItems } = useAppData();
  const { t, formatDate } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();

  const [item, setItem] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const found = await getFoodItem(id);
    setItem(found);
    if (found) {
      setName(found.name);
      setExpirationDate(found.expirationDate);
      setReminderDate(found.reminderDate);
      setAddToCalendar(Boolean(found.calendarEventId));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: item?.name ?? t('itemTitle'),
      headerRight: () =>
        item ? (
          <Pressable
            onPress={() => setEditing((e) => !e)}
            style={{ marginRight: 8 }}>
            <Text style={{ color: colors.tint, fontWeight: '600' }}>
              {editing ? t('cancel') : t('edit')}
            </Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, item, editing, colors.tint, t]);

  async function onDelete() {
    if (!item) return;
    Alert.alert(t('deleteItem'), t('deleteConfirm', { name: item.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await removeFoodEntry(item.id);
          await refreshItems();
          router.back();
        },
      },
    ]);
  }

  async function onSaveEdits() {
    if (!item) return;
    if (!name.trim()) {
      Alert.alert(t('nameRequired'), t('nameRequiredBody'));
      return;
    }
    setSaving(true);
    try {
      const updated = await saveFoodEntry({
        id: item.id,
        name,
        expirationDate,
        reminderDate,
        existingPhotoUri: item.photoUri,
        addToCalendar,
      });
      setItem(updated);
      setEditing(false);
      await refreshItems();
    } catch (e) {
      Alert.alert(
        t('couldNotSave'),
        e instanceof Error ? e.message : 'Unknown error',
      );
    } finally {
      setSaving(false);
    }
  }

  function onExpiryChange(iso: string) {
    setExpirationDate(iso);
    setReminderDate(
      reminderDateForFoodType(
        iso,
        inferFoodType(name),
        settings.daysBeforeExpiryByFoodType,
      ),
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{t('itemNotFound')}</Text>
      </View>
    );
  }

  const days = daysUntil(item.expirationDate);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      {item.photoUri ? (
        <Image
          source={{
            uri: resolvePhotoUri(item.photoUri, item.id) ?? item.photoUri,
          }}
          style={styles.photo}
        />
      ) : null}

      {editing ? (
        <>
          <Text style={[styles.label, { color: colors.muted }]}>
            {t('name')}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
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
              {t('calendarAlarm')}
            </Text>
            <Switch value={addToCalendar} onValueChange={setAddToCalendar} />
          </View>
          <Pressable
            style={[
              styles.btn,
              { backgroundColor: colors.tint },
              saving && { opacity: 0.6 },
            ]}
            onPress={onSaveEdits}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{t('saveChanges')}</Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.title, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={{ color: colors.muted }}>
            {t('addedOn', { date: formatDate(item.createdAt) })}
          </Text>
          <Text style={[styles.meta, { color: colors.text }]}>
            {t('expiresOn', { date: formatDate(item.expirationDate) })}
          </Text>
          <Text
            style={{
              color:
                days <= 0
                  ? colors.danger
                  : days <= 3
                    ? colors.warning
                    : colors.muted,
              fontWeight: '600',
            }}>
            {days < 0
              ? t('expiredDaysAgo', { days: Math.abs(days) })
              : days === 0
                ? t('expiresToday')
                : t('daysLeftLong', { days })}
          </Text>
          <Text style={{ color: colors.muted }}>
            {t('reminderOn', { date: formatDate(item.reminderDate) })}
          </Text>
          <Text style={{ color: colors.muted }}>
            {t('calendarAlarmLabel', {
              value: item.calendarEventId ? t('calendarYes') : t('calendarNo'),
            })}
          </Text>
        </>
      )}

      <Pressable
        style={[styles.btn, { backgroundColor: colors.danger, marginTop: 16 }]}
        onPress={onDelete}>
        <Text style={styles.btnText}>{t('delete')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  photo: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '700' },
  meta: { fontSize: 16, fontWeight: '600' },
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
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
