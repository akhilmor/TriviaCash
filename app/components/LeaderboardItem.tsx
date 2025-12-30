import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';

interface LeaderboardItemProps {
  rank: number;
  username: string;
  score: number;
  isCurrentUser?: boolean;
  coins?: number;
}

function LeaderboardItem({
  rank,
  username,
  score,
  isCurrentUser = false,
  coins,
}: LeaderboardItemProps) {
  const getRankColor = () => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return colors.text;
  };

  const getRankEmoji = () => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
  };

  return (
    <View
      style={[
        styles.container,
        isCurrentUser && styles.currentUserContainer,
        isCurrentUser && { borderWidth: 2, borderColor: colors.primaryNeon },
      ]}
    >
      <LinearGradient
        colors={
          isCurrentUser
            ? [colors.primaryNeon + '30', colors.neonPurple + '30']
            : [colors.card, '#1A1F2E']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, { color: getRankColor() }]}>
            {getRankEmoji()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text
            style={[
              styles.username,
              isCurrentUser && styles.currentUserText,
            ]}
          >
            {username} {isCurrentUser && '(You)'}
          </Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
            {coins !== undefined && (
              <Text style={styles.coinsText}>💰 {coins}</Text>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  currentUserContainer: {
    shadowColor: colors.primaryNeon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  gradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 24,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  username: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentUserText: {
    color: colors.primaryNeon,
    fontWeight: '700',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  coinsText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LeaderboardItem;
