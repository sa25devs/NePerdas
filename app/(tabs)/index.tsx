import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAppData } from '@/src/context/AppContext';
import type { FoodItem } from '@/src/models/types';
import { daysUntil, formatDisplayDate } from '@/src/utils/dates';

function DaysBadge({
  expirationDate,
  colors,
}: {
  expirationDate: string;
  colors: (typeof Colors)['light'];
}) {
  const days = daysUntil(expirationDate);
  let label: string;
  let color = colors.muted;
  if (days < 0) {
    label = `Expired ${Math.abs(days)}d ago`;
    color = colors.danger;
  } else if (days === 0) {
    label = 'Expires today';
    color = colors.danger;
  } else if (days === 1) {
    label = '1 day left';
    color = colors.warning;
  } else if (days <= 3) {
    label = `${days} days left`;
    color = colors.warning;
  } else {
    label = `${days} days left`;
  }
  return <Text style={[styles.badge, { color }]}>{label}</Text>;
}

function ItemRow({
  item,
  colors,
  onPress,
}: {
  item: FoodItem;
  colors: (typeof Colors)['light'];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}>
      {item.photoUri ? (
        <Image source={{ uri: item.photoUri }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={{ color: colors.muted, fontSize: 20 }}>?</Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Expires {formatDisplayDate(item.expirationDate)}
        </Text>
        <DaysBadge expirationDate={item.expirationDate} colors={colors} />
      </View>
    </Pressable>
  );
}

export default function InventoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { items, loading, refreshItems } = useAppData();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      void refreshItems();
    }, [refreshItems]),
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          items.length === 0 ? styles.emptyContainer : styles.list
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No food tracked yet
            </Text>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>
              Scan a package or add an item manually to start tracking expiry
              dates.
            </Text>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/scan')}>
              <Text style={styles.primaryBtnText}>Scan a package</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.push('/manual-add')}>
              <Text style={{ color: colors.tint, fontWeight: '600' }}>
                Add manually
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            colors={colors}
            onPress={() => router.push(`/item/${item.id}`)}
          />
        )}
      />
      {items.length > 0 ? (
        <Pressable
          style={[styles.fab, { backgroundColor: colors.tint }]}
          accessibilityLabel="Add manually"
          onPress={() => router.push('/manual-add')}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 96, gap: 10 },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  empty: { alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  thumbPlaceholder: {
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '600' },
  badge: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  primaryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { paddingVertical: 8 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '400' },
});
