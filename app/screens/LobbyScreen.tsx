import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { colors } from '@/constants/colors';
import { useGameMode } from '@/contexts/GameModeContext';
import NeonButton from '@/components/NeonButton';
import NeonCard from '@/components/NeonCard';

const { width } = Dimensions.get('window');

interface GameCard {
  id: string;
  category: string;
  entryFee: number;
  playersJoined: number;
  maxPlayers: number;
  prize: number;
}

const mockGames: GameCard[] = [
  {
    id: '1',
    category: 'Science',
    entryFee: 50,
    playersJoined: 8,
    maxPlayers: 10,
    prize: 500,
  },
  {
    id: '2',
    category: 'History',
    entryFee: 100,
    playersJoined: 12,
    maxPlayers: 15,
    prize: 1500,
  },
  {
    id: '3',
    category: 'Sports',
    entryFee: 25,
    playersJoined: 5,
    maxPlayers: 8,
    prize: 200,
  },
  {
    id: '4',
    category: 'Entertainment',
    entryFee: 75,
    playersJoined: 20,
    maxPlayers: 25,
    prize: 1500,
  },
];

const categories = ['Science', 'History', 'Sports', 'Geography', 'Entertainment', 'Technology'];

export default function LobbyScreen() {
  const { gameMode, setGameMode } = useGameMode();

  // If no mode selected, redirect to home
  React.useEffect(() => {
    if (gameMode === null) {
      router.replace('/screens/HomeScreen');
    }
  }, [gameMode]);

  if (gameMode === null) {
    return null;
  }

  const handleCategorySelect = (category: string) => {
    if (gameMode === 'single') {
      // Single player - go directly to questions
      router.push({
        pathname: '/screens/QuestionScreen',
        params: { category },
      });
    } else {
      // Multiplayer - start matchmaking
      router.push({
        pathname: '/screens/MatchmakingScreen',
        params: { category },
      });
    }
  };

  return (
    <LinearGradient
      colors={[colors.background, '#0D1525', colors.neonPurple + '20']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Choose Category</Text>
        <Text style={styles.subtitle}>
          {gameMode === 'single' ? 'Single Player Mode' : 'Multiplayer Mode'}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((category) => (
          <NeonCard key={category} style={styles.gameCard}>
            <View style={styles.gameHeader}>
              <Text style={styles.category}>{category}</Text>
              <View style={styles.modeBadge}>
                <Text style={styles.modeBadgeText}>
                  {gameMode === 'single' ? '🎮' : '👥'}
                </Text>
              </View>
            </View>
            <NeonButton
              title={gameMode === 'single' ? 'Play Now' : 'Find Match'}
              onPress={() => handleCategorySelect(category)}
              style={styles.joinButton}
              variant={gameMode === 'single' ? 'primary' : 'secondary'}
            />
          </NeonCard>
        ))}
      </ScrollView>

      <View style={styles.bottomNav}>
        <NeonButton
          title="Back"
          onPress={() => {
            setGameMode(null);
            router.push('/screens/HomeScreen');
          }}
          variant="secondary"
          style={styles.navButton}
        />
        <NeonButton
          title="Wallet"
          onPress={() => router.push('/screens/WalletScreen')}
          variant="secondary"
          style={styles.navButton}
        />
      </View>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.primaryNeon,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text,
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  gameCard: {
    marginBottom: 16,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  category: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  modeBadge: {
    backgroundColor: colors.neonPurple + '30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modeBadgeText: {
    color: colors.neonPurple,
    fontWeight: '700',
    fontSize: 18,
  },
  joinButton: {
    width: '100%',
    marginTop: 12,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background + 'E0',
    borderTopWidth: 1,
    borderTopColor: colors.primaryNeon + '30',
    gap: 8,
  },
  navButton: {
    flex: 1,
  },
});

