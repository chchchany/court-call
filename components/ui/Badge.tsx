import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { ApplicationStatus, MatchStatus, PaymentStatus } from '@/types';

type BadgeType =
  | 'application_number'
  | 'pending'
  | 'payment_pending'
  | 'confirmed'
  | 'waiting_pool'
  | 'recruiting'
  | 'full'
  | 'cancelled'
  | 'completed'
  | 'noshow';

interface BadgeProps {
  type: BadgeType;
  value?: string | number;
}

const badgeConfig: Record<BadgeType, { bg: string; text: string; label?: string }> = {
  application_number: { bg: Colors.lime, text: Colors.green900 },
  pending: { bg: Colors.pendingBg, text: Colors.pendingText, label: '확정 대기' },
  payment_pending: { bg: Colors.paymentBg, text: Colors.paymentText, label: '송금 대기' },
  confirmed: { bg: Colors.confirmedBg, text: Colors.confirmedText, label: '참가 확정' },
  waiting_pool: { bg: Colors.waitingBg, text: Colors.waitingText, label: '대기풀' },
  recruiting: { bg: '#E8F5E3', text: Colors.green700, label: '모집 중' },
  full: { bg: Colors.pendingBg, text: Colors.pendingText, label: '마감' },
  cancelled: { bg: '#FFE8E8', text: Colors.danger, label: '취소' },
  completed: { bg: Colors.gray100, text: Colors.gray700, label: '종료' },
  noshow: { bg: '#FFE8E8', text: Colors.danger, label: '노쇼' },
};

export function Badge({ type, value }: BadgeProps) {
  const config = badgeConfig[type];
  const label = type === 'application_number' ? `${value}번째` : (config.label ?? String(value));

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: MatchStatus }) {
  const map: Record<MatchStatus, BadgeType> = {
    recruiting: 'recruiting',
    full: 'full',
    cancelled: 'cancelled',
    completed: 'completed',
  };
  return <Badge type={map[status]} />;
}

export function ApplicationBadge({
  status,
  paymentStatus,
  applicationNumber,
}: {
  status: ApplicationStatus;
  paymentStatus: PaymentStatus;
  applicationNumber: number;
}) {
  if (status === 'waiting_pool') return <Badge type="waiting_pool" />;
  if (status === 'pending') return <Badge type="application_number" value={applicationNumber} />;
  if (status === 'confirmed') {
    if (paymentStatus === 'confirmed') return <Badge type="confirmed" />;
    return <Badge type="payment_pending" />;
  }
  return null;
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.badge,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSize.label,
    fontWeight: FontWeight.medium,
  },
});
