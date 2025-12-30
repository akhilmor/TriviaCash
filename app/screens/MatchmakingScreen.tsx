import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/colors';
import { useMatchmaking } from '@/hooks/useMatchmaking';
import { useGameMode } from '@/contexts/GameModeContext';
import NeonButton from '@/components/NeonButton';

const MATCHMAKING_TIMEOUT = 15000; // 15 seconds

export default function MatchmakingScreen() {
  const params = useLocalSearchParams();
  const category = params.category as string || 'Science';
  const { gameMode, setGameMode } = useGameMode();
  
  const [spinAnim] = useState(new Animated.Value(0));
  const [status, setStatus] = useState<string>('Looking for opponent...');
  const [showTimeoutFallback, setShowTimeoutFallback] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Guard: Only allow matchmaking in multiplayer mode
  useEffect(() => {
    if (gameMode !== 'multi') {
      Alert.alert('Invalid Mode', 'Multiplayer mode required for matchmaking.', [
        { text: 'OK', onPress: () => router.replace('/screens/HomeScreen') },
      ]);
    }
  }, [gameMode]);

  const { isMatchmaking, room, error, playerUsername, startMatchmaking, cancelMatchmaking } = useMatchmaking((result) => {
    // Match found! Navigate to game screen
    console.log('[MatchmakingScreen] 🎉 Match found! Room status:', result.status);
    if (result.room && result.status === 'active' && result.roomId && result.playerId) {
      try {
        const questions = JSON.stringify(result.room.questions || []);
        console.log('[MatchmakingScreen] Navigating to GameScreen (MULTIPLAYER), questions:', result.room.questions?.length || 0);
        router.replace({
          pathname: '/screens/GameScreen',
          params: {
            roomId: result.roomId,
            playerId: result.playerId,
            playerNumber: result.playerNumber.toString(),
            category: result.room.category || '',
            questions,
          },
        });
      } catch (e) {
        console.error('[MatchmakingScreen] Failed to stringify questions:', e);
      }
    }
  });

  useEffect(() => {
    if (gameMode !== 'multi') {
      console.log('[MatchmakingScreen] ❌ Not in multiplayer mode, redirecting');
      router.replace('/screens/HomeScreen');
      return;
    }

    if (!category) {
      console.warn('[MatchmakingScreen] No category provided');
      Alert.alert('Error', 'Category is required. Returning to lobby.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }

    console.log('[MatchmakingScreen] 🎮 Starting MULTIPLAYER matchmaking for category:', category);
    // Start matchmaking (this will trigger host to fetch questions ONCE)
    startMatchmaking(category);

    // Set timeout for matchmaking
    timeoutRef.current = setTimeout(() => {
      if (isMatchmaking && room?.status !== 'active') {
        setShowTimeoutFallback(true);
        cancelMatchmaking();
      }
    }, MATCHMAKING_TIMEOUT);

    // Spinning loader animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Update status based on matchmaking state
    if (room?.status === 'waiting') {
      setStatus('Waiting for opponent...');
    } else if (room?.status === 'active') {
      setStatus('Match found! Starting game...');
      setShowTimeoutFallback(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }

    return () => {
      cancelMatchmaking();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [category, gameMode, startMatchmaking, cancelMatchmaking, isMatchmaking, room?.status]);

  useEffect(() => {
    if (error && !showTimeoutFallback) {
      Alert.alert('Matchmaking Error', error, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [error, showTimeoutFallback]);

  const handleSwitchToSinglePlayer = () => {
    setGameMode('single');
    cancelMatchmaking();
    router.replace({
      pathname: '/screens/QuestionScreen',
      params: { category },
    });
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Get opponent info if room exists
  const opponentUsername = room?.player1_id === room?.player2_id 
    ? null 
    : room?.player1_username === playerUsername 
      ? room?.player2_username 
      : room?.player1_username;

  if (showTimeoutFallback) {
    return (
      <LinearGradient
        colors={[colors.background, '#0D1525', colors.neonPurple + '20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.title}>No Players Available</Text>
          <Text style={styles.subtitle}>
            No opponent found within {MATCHMAKING_TIMEOUT / 1000} seconds.
          </Text>
          <Text style={styles.message}>
            Try again later or play Single Player mode.
          </Text>

          <View style={styles.buttonContainer}>
            <NeonButton
              title="Switch to Single Player"
              onPress={handleSwitchToSinglePlayer}
              style={styles.button}
              variant="primary"
            />
            <NeonButton
              title="Try Again"
              onPress={() => {
                setShowTimeoutFallback(false);
                startMatchmaking(category);
              }}
              style={styles.button}
              variant="secondary"
            />
            <NeonButton
              title="Back to Categories"
              onPress={() => router.back()}
              style={styles.button}
              variant="secondary"
            />
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.background, '#0D1525', colors.neonPurple + '20']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.loaderContainer,
            { transform: [{ rotate: spin }] },
          ]}
        >
          <View style={styles.loaderRing} />
          <View style={[styles.loaderRing, styles.loaderRingInner]} />
        </Animated.View>

        <Text style={styles.title}>Finding Opponent...</Text>
        <Text style={styles.subtitle}>{status}</Text>
        
        <Text style={styles.categoryText}>Category: {category}</Text>
        <Text style={styles.playerText}>You: {playerUsername}</Text>

        {opponentUsername && (
          <View style={styles.opponentBadge}>
            <Text style={styles.opponentText}>👤 Opponent: {opponentUsername}</Text>
          </View>
        )}

        <Text style={styles.hintText}>
          {isMatchmaking 
            ? 'Searching for players...' 
            : 'Match found! Starting game...'}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  loaderContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  loaderRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.primaryNeon,
    borderTopColor: 'transparent',
    shadowColor: colors.primaryNeon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  loaderRingInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderColor: colors.neonPurple,
    borderTopColor: 'transparent',
    shadowColor: colors.neonPurple,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primaryNeon,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: colors.text,
    opacity: 0.8,
    marginBottom: 20,
    fontWeight: '600',
  },
  categoryText: {
    fontSize: 16,
    color: colors.primaryNeon,
    marginBottom: 12,
    fontWeight: '600',
  },
  playerText: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.8,
    marginBottom: 20,
  },
  opponentBadge: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryNeon + '40',
    marginBottom: 20,
    minWidth: 200,
  },
  opponentText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  hintText: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.6,
    marginTop: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.text,
    opacity: 0.8,
    marginTop: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
  },
  button: {
    width: '100%',
  },
});

