import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useI18n } from '@/src/i18n/useI18n';
import { formatISODate, parseISODate } from '@/src/utils/dates';

type Props = {
  label: string;
  valueISO: string;
  onChange: (iso: string) => void;
  textColor: string;
  borderColor: string;
  mutedColor: string;
};

export function DateField({
  label,
  valueISO,
  onChange,
  textColor,
  borderColor,
  mutedColor,
}: Props) {
  const [open, setOpen] = useState(false);
  const { t, formatDate, locale } = useI18n();
  const value = parseISODate(valueISO);

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setOpen(false);
    }
    if (event.type === 'dismissed') return;
    if (date) {
      onChange(formatISODate(date));
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: mutedColor }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, { borderColor }]}>
        <Text style={{ color: textColor, fontSize: 16 }}>
          {formatDate(valueISO)}
        </Text>
      </Pressable>
      {open ? (
        <>
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => setOpen(false)} style={styles.done}>
              <Text style={{ color: textColor, fontWeight: '600' }}>
                {t('done')}
              </Text>
            </Pressable>
          ) : null}
          <DateTimePicker
            value={value}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onPickerChange}
            locale={locale}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  field: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  done: { alignSelf: 'flex-end', paddingVertical: 4 },
});
