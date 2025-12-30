import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { colors } from '@/constants/colors';
import { useWallet } from '@/hooks/useWallet';
import NeonCard from '@/components/NeonCard';
import NeonButton from '@/components/NeonButton';
import WalletBalance from '@/components/WalletBalance';

interface MatchHistory {
  id: string;
  date: string;
  category: string;
  result: 'won' | 'lost';
  coins: number;
  score: number;
}

const mockHistory: MatchHistory[] = [
  {
    id: '1',
    date: '2024-01-15',
    category: 'Science',
    result: 'won',
    coins: 150,
    score: 4200,
  },
  {
    id: '2',
    date: '2024-01-14',
    category: 'History',
    result: 'won',
    coins: 200,
    score: 5500,
  },
  {
    id: '3',
    date: '2024-01-13',
    category: 'Sports',
    result: 'lost',
    coins: -50,
    score: 2100,
  },
  {
    id: '4',
    date: '2024-01-12',
    category: 'Entertainment',
    result: 'won',
    coins: 100,
    score: 3800,
  },
  {
    id: '5',
    date: '2024-01-11',
    category: 'Geography',
    result: 'won',
    coins: 175,
    score: 4600,
  },
];

export default function WalletScreen() {
  const { balance, walletInfo, loadWallet } = useWallet();

  React.useEffect(() => {
    loadWallet();
  }, []);

  return (
    <LinearGradient
      colors={[colors.background, '#0D1525', colors.neonPurple + '20']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <NeonButton
          title="← Back"
          onPress={() => router.back()}
          variant="secondary"
          style={styles.backButton}
        />
        <Text style={styles.title}>Wallet</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <NeonCard style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <WalletBalance showLabel={false} textStyle={styles.balanceAmount} />
          <Text style={styles.balanceSubtext}>USD</Text>
        </NeonCard>

        <View style={styles.statsGrid}>
          <NeonCard style={styles.statCard}>
            <Text style={styles.statLabel}>Total Earned</Text>
            <Text style={styles.statValue}>$1,250</Text>
          </NeonCard>
          <NeonCard style={styles.statCard}>
            <Text style={styles.statLabel}>Games Won</Text>
            <Text style={styles.statValue}>42</Text>
          </NeonCard>
          <NeonCard style={styles.statCard}>
            <Text style={styles.statLabel}>Games Played</Text>
            <Text style={styles.statValue}>58</Text>
          </NeonCard>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent History</Text>
          {mockHistory.map((match) => (
            <NeonCard key={match.id} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyCategory}>{match.category}</Text>
                  <Text style={styles.historyDate}>{match.date}</Text>
                </View>
                <View style={styles.historyResult}>
                  <Text
                    style={[
                      styles.historyCoins,
                      { color: match.result === 'won' ? colors.success : colors.error },
                    ]}
                  >
                    {match.coins > 0 ? '+' : ''}${match.coins}
                  </Text>
                  <Text style={styles.historyScore}>{match.score.toLocaleString()} pts</Text>
                </View>
              </View>
            </NeonCard>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 80,
  },
  backButtonPlaceholder: {
    width: 80, // To balance the back button on the left
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.primaryNeon,
    textTransform: 'uppercase',
    letterSpacing: 4,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  balanceCard: {
    marginBottom: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    color: colors.text,
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  balanceAmount: {
    color: colors.warning,
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 4,
  },
  balanceSubtext: {
    color: colors.text,
    fontSize: 14,
    opacity: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: colors.text,
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statValue: {
    color: colors.primaryNeon,
    fontSize: 24,
    fontWeight: '700',
  },
  historySection: {
    marginTop: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  historyItem: {
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCategory: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDate: {
    color: colors.text,
    fontSize: 12,
    opacity: 0.6,
  },
  historyResult: {
    alignItems: 'flex-end',
  },
  historyCoins: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  historyScore: {
    color: colors.text,
    fontSize: 14,
    opacity: 0.7,
  },
});

