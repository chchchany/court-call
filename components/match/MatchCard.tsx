import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Match } from '@/types';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadow } from '@/constants/theme';
import { StatusBadge, ApplicationBadge } from '@/components/ui/Badge';

const LEVEL_LABEL: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
  all: '전체',
};

const GENDER_LABEL: Record<string, string> = {
  open: '오픈',
  male: '남성',
  female: '여성',
  mixed: '혼복',
};

interface MatchCardProps {
  match: Match;
}

export default function MatchCard({ match }: MatchCardProps) {
  const router = useRouter();
  const remaining = match.max_players - match.confirmed_players;
  const matchDate = new Date(`${match.match_date}T${match.match_time}`);
  const isFull = match.status === 'full' || remaining <= 0;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/match/${match.id}`)}
      activeOpacity={0.88}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {match.title}
        </Text>
        <View style={styles.headerRight}>
          {isFull ? (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>마감</Text>
            </View>
          ) : (
            <View style={styles.remainingBadge}>
              <Text style={styles.remainingText}>잔여 {remaining}석</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.datetime}>
        {format(matchDate, 'M월 d일 (EEE) · a h시', { locale: ko })}
      </Text>

      <View style={styles.tags}>
        <Tag label={match.venue} />
        <Tag label={LEVEL_LABEL[match.level]} />
        <Tag label={GENDER_LABEL[match.gender_type]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.cost}>
          1인{' '}
          <Text style={styles.costAmount}>
            {match.cost_per_player.toLocaleString()}원
          </Text>
        </Text>

        {match.user_application ? (
          <ApplicationBadge
            status={match.user_application.status}
            paymentStatus={match.user_application.payment_status}
            applicationNumber={match.user_application.application_number}
          />
        ) : (
          !isFull && (
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>신청하기</Text>
            </View>
          )
        )}
      </View>
    </TouchableOpacity>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: Spacing.base,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.gray900,
  },
  headerRight: {
    flexShrink: 0,
  },
  remainingBadge: {
    backgroundColor: '#E8F5E3',
    borderRadius: BorderRadius.badge,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  remainingText: {
    fontSize: FontSize.label,
    fontWeight: FontWeight.medium,
    color: Colors.green700,
  },
  fullBadge: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.badge,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fullBadgeText: {
    fontSize: FontSize.label,
    fontWeight: FontWeight.medium,
    color: Colors.gray500,
  },
  datetime: {
    fontSize: FontSize.body2,
    color: Colors.gray700,
  },
  tags: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.tag,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: FontSize.caption,
    color: Colors.gray700,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    marginTop: Spacing.xs,
  },
  cost: {
    fontSize: FontSize.body2,
    color: Colors.gray500,
  },
  costAmount: {
    fontSize: FontSize.body1,
    fontWeight: FontWeight.bold,
    color: Colors.gray900,
  },
  ctaButton: {
    backgroundColor: Colors.lime,
    borderRadius: BorderRadius.button,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ctaText: {
    fontSize: FontSize.body2,
    fontWeight: FontWeight.semibold,
    color: Colors.green900,
  },
});
