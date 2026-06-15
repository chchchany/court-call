import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { MatchFilterParams, MatchLevel, MatchGenderType } from '@/types';

const DAY_OPTIONS = [
  { value: '1', label: '월' },
  { value: '2', label: '화' },
  { value: '3', label: '수' },
  { value: '4', label: '목' },
  { value: '5', label: '금' },
  { value: '6', label: '토' },
  { value: '0', label: '일' },
];

const LEVEL_OPTIONS: { value: MatchLevel; label: string }[] = [
  { value: 'beginner', label: '초급' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '고급' },
  { value: 'all', label: '전체' },
];

const GENDER_OPTIONS: { value: MatchGenderType; label: string }[] = [
  { value: 'open', label: '오픈' },
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'mixed', label: '혼복' },
];

interface MatchFilterProps {
  filters: MatchFilterParams;
  onChange: (filters: MatchFilterParams) => void;
}

export default function MatchFilter({ filters, onChange }: MatchFilterProps) {
  function toggleItem<T extends string>(list: T[] | undefined, item: T): T[] {
    const current = list ?? [];
    return current.includes(item)
      ? current.filter((v) => v !== item)
      : [...current, item];
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Text style={styles.sectionLabel}>요일</Text>
        {DAY_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={(filters.days ?? []).includes(opt.value)}
            onPress={() => onChange({ ...filters, days: toggleItem(filters.days, opt.value) })}
          />
        ))}
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>레벨</Text>
        {LEVEL_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={(filters.levels ?? []).includes(opt.value)}
            onPress={() => onChange({ ...filters, levels: toggleItem(filters.levels, opt.value) })}
          />
        ))}
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>성별</Text>
        {GENDER_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            active={(filters.genderTypes ?? []).includes(opt.value)}
            onPress={() =>
              onChange({ ...filters, genderTypes: toggleItem(filters.genderTypes, opt.value) })
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  sectionLabel: {
    fontSize: FontSize.caption,
    color: Colors.gray500,
    marginRight: 2,
  },
  chip: {
    borderRadius: BorderRadius.badge,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  chipActive: {
    backgroundColor: Colors.green900,
    borderColor: Colors.green900,
  },
  chipText: {
    fontSize: FontSize.body2,
    color: Colors.gray700,
    fontWeight: FontWeight.medium,
  },
  chipTextActive: {
    color: Colors.white,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.gray100,
    marginHorizontal: Spacing.xs,
  },
});
