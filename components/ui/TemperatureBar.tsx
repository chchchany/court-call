import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, FontWeight } from '@/constants/theme';

interface TemperatureBarProps {
  value: number;
  label?: string;
  size?: 'sm' | 'md';
}

function getTemperatureColor(value: number) {
  if (value >= 80) return Colors.success;
  if (value >= 50) return Colors.green500;
  if (value >= 30) return Colors.warning;
  return Colors.danger;
}

export default function TemperatureBar({ value, label, size = 'md' }: TemperatureBarProps) {
  const color = getTemperatureColor(value);
  const isSmall = size === 'sm';

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, isSmall && styles.labelSm]}>{label}</Text>}
      <View style={styles.row}>
        <View style={[styles.track, isSmall && styles.trackSm]}>
          <View
            style={[
              styles.fill,
              { width: `${Math.min(value, 100)}%`, backgroundColor: color },
            ]}
          />
        </View>
        <Text style={[styles.value, { color }, isSmall && styles.valueSm]}>
          {value}°
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    fontSize: FontSize.caption,
    color: Colors.gray500,
  },
  labelSm: {
    fontSize: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.gray100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackSm: {
    height: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  value: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    minWidth: 28,
    textAlign: 'right',
  },
  valueSm: {
    fontSize: 10,
    minWidth: 24,
  },
});
