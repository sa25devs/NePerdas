import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/src/i18n/useI18n';
import {
  FOOD_TYPES,
  FOOD_TYPE_LABEL_KEYS,
  type FoodType,
} from '@/src/utils/foodType';

type Props = {
  value: FoodType;
  onChange: (type: FoodType) => void;
  textColor: string;
  borderColor: string;
  mutedColor: string;
  tintColor: string;
  backgroundColor: string;
};

export function FoodTypeField({
  value,
  onChange,
  textColor,
  borderColor,
  mutedColor,
  tintColor,
  backgroundColor,
}: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: mutedColor }]}>{t('foodType')}</Text>
      <View style={styles.row}>
        {FOOD_TYPES.map((type) => {
          const selected = value === type;
          return (
            <Pressable
              key={type}
              onPress={() => onChange(type)}
              style={[
                styles.chip,
                {
                  borderColor: selected ? tintColor : borderColor,
                  backgroundColor: selected ? tintColor : backgroundColor,
                },
              ]}>
              <Text
                style={{
                  color: selected ? '#fff' : textColor,
                  fontWeight: '600',
                }}>
                {t(FOOD_TYPE_LABEL_KEYS[type])}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});
