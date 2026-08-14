import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAppData } from '@/src/context/AppContext';
import { useI18n } from '@/src/i18n/useI18n';
import type { FoodItem } from '@/src/models/types';
import { removeFoodEntries } from '@/src/services/foodService';
import { resolvePhotoUri } from '@/src/storage/photos';
import { daysUntil, isExpired } from '@/src/utils/dates';

function DaysBadge({
  expirationDate,
  colors,
  t,
}: {
  expirationDate: string;
  colors: (typeof Colors)['light'];
  t: ReturnType<typeof useI18n>['t'];
}) {
  const days = daysUntil(expirationDate);
  let label: string;
  let color = colors.muted;
  if (days < 0) {
    label = t('expiredAgo', { days: Math.abs(days) });
    color = colors.danger;
  } else if (days === 0) {
    label = t('expiresToday');
    color = colors.danger;
  } else if (days === 1) {
    label = t('dayLeft');
    color = colors.warning;
  } else if (days <= 3) {
    label = t('daysLeft', { days });
    color = colors.warning;
  } else {
    label = t('daysLeft', { days });
  }
  return <Text style={[styles.badge, { color }]}>{label}</Text>;
}

function ItemRow({
  item,
  colors,
  onPress,
  onLongPress,
  selecting,
  selected,
  t,
  formatDate,
}: {
  item: FoodItem;
  colors: (typeof Colors)['light'];
  onPress: () => void;
  onLongPress?: () => void;
  selecting: boolean;
  selected: boolean;
  t: ReturnType<typeof useI18n>['t'];
  formatDate: (iso: string) => string;
}) {
  const expired = isExpired(item.expirationDate);
  const pulse = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!expired || reduceMotion) {
      pulse.setValue(1);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => {
      anim.stop();
      pulse.setValue(1);
    };
  }, [expired, reduceMotion, pulse]);

  return (
    <Animated.View style={{ opacity: expired ? pulse : 1 }}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityHint={expired ? t('expiredAgo', { days: Math.abs(daysUntil(item.expirationDate)) }) : undefined}
        style={[
          styles.row,
          {
            backgroundColor: expired ? colors.dangerSoft : colors.card,
            borderColor: selected
              ? colors.tint
              : expired
                ? colors.danger
                : colors.border,
            borderWidth: expired || selected ? 1.5 : StyleSheet.hairlineWidth,
          },
        ]}>
        {selecting ? (
          <View
            style={[
              styles.checkbox,
              {
                borderColor: selected ? colors.tint : colors.border,
                backgroundColor: selected ? colors.tint : 'transparent',
              },
            ]}>
            {selected ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
        ) : null}
        {item.photoUri ? (
          <Image
            source={{ uri: resolvePhotoUri(item.photoUri, item.id) ?? item.photoUri }}
            style={styles.thumb}
          />
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
            {t('expiresOn', { date: formatDate(item.expirationDate) })}
          </Text>
          <DaysBadge
            expirationDate={item.expirationDate}
            colors={colors}
            t={t}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function InventoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { items, loading, refreshItems } = useAppData();
  const { t, formatDate } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();

  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshItems();
    }, [refreshItems]),
  );

  useEffect(() => {
    if (!selecting) setSelectedIds(new Set());
  }, [selecting]);

  const expiredIds = useMemo(
    () => items.filter((item) => isExpired(item.expirationDate)).map((item) => item.id),
    [items],
  );

  const allSelected =
    items.length > 0 && selectedIds.size === items.length;

  const enterSelectMode = useCallback((initialId?: string) => {
    setSelecting(true);
    setSelectedIds(initialId ? new Set([initialId]) : new Set());
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelecting(false);
    setSelectedIds(new Set());
  }, []);

  const toggleId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }, [allSelected, items]);

  const selectAllExpired = useCallback(() => {
    setSelectedIds(new Set(expiredIds));
  }, [expiredIds]);

  const confirmDeleteSelected = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) return;
    Alert.alert(
      t('deleteSelectedTitle'),
      t('deleteSelectedConfirm', { count }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await removeFoodEntries([...selectedIds]);
              await refreshItems();
              exitSelectMode();
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [selectedIds, t, refreshItems, exitSelectMode]);

  useLayoutEffect(() => {
    if (items.length === 0 || selecting) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }

    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => enterSelectMode()} hitSlop={8}>
          <Text style={[styles.headerBtn, { color: colors.tint }]}>
            {t('select')}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, items.length, selecting, colors.tint, t, enterSelectMode]);

  const selectedCountLabel = useMemo(
    () => t('selectedCount', { count: selectedIds.size }),
    [t, selectedIds.size],
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
      {selecting && items.length > 0 ? (
        <View
          style={[
            styles.selectToolbar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}>
          <Pressable onPress={toggleSelectAll} hitSlop={8}>
            <Text style={[styles.toolbarBtn, { color: colors.tint }]}>
              {allSelected ? t('deselectAll') : t('selectAll')}
            </Text>
          </Pressable>
          {expiredIds.length > 0 ? (
            <Pressable onPress={selectAllExpired} hitSlop={8}>
              <Text style={[styles.toolbarBtn, { color: colors.danger }]}>
                {t('selectAllExpired')}
              </Text>
            </Pressable>
          ) : null}
          <Pressable onPress={exitSelectMode} hitSlop={8} style={styles.toolbarCancel}>
            <Text style={[styles.toolbarBtn, { color: colors.tint }]}>
              {t('cancel')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          items.length === 0
            ? styles.emptyContainer
            : [styles.list, selecting ? styles.listSelecting : null]
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('emptyTitle')}
            </Text>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>
              {t('emptyBody')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            colors={colors}
            selecting={selecting}
            selected={selectedIds.has(item.id)}
            onPress={() => {
              if (selecting) toggleId(item.id);
              else router.push(`/item/${item.id}`);
            }}
            onLongPress={() => {
              if (!selecting) enterSelectMode(item.id);
            }}
            t={t}
            formatDate={formatDate}
          />
        )}
      />

      {selecting && items.length > 0 ? (
        <View
          style={[
            styles.selectionBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}>
          <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>
            {selectedCountLabel}
          </Text>
          <Pressable
            disabled={selectedIds.size === 0 || deleting}
            onPress={confirmDeleteSelected}
            style={[
              styles.deleteBtn,
              {
                backgroundColor: colors.danger,
                opacity: selectedIds.size === 0 || deleting ? 0.45 : 1,
              },
            ]}>
            {deleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.deleteBtnText}>{t('deleteSelected')}</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {!selecting ? (
        <Pressable
          style={[styles.fab, { backgroundColor: colors.tint }]}
          accessibilityLabel={t('takePhoto')}
          onPress={() => router.push('/scan')}>
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
  listSelecting: { paddingBottom: 120 },
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
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  thumbPlaceholder: {
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '600' },
  badge: { fontSize: 12, fontWeight: '600', marginTop: 2 },
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
  headerBtn: { fontSize: 16, fontWeight: '600', paddingHorizontal: 4 },
  selectToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: { fontSize: 16, fontWeight: '600' },
  toolbarCancel: { marginLeft: 'auto' },
  selectionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 88,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#fff', fontWeight: '700' },
});
