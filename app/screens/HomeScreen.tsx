import NeonButton from '@/components/NeonButton';
import NeonCard from '@/components/NeonCard';
import WalletBalance from '@/components/WalletBalance';
import { colors } from '@/constants/colors';
import { useGameMode } from '@/contexts/GameModeContext';
import { useSupabase } from '@/hooks/useSupabase';
import { useWallet } from '@/hooks/useWallet';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { loadWallet } = useWallet();
  const { supabaseEnabled } = useSupabase();
  const { gameMode, setGameMode } = useGameMode();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadWallet();
  }, []);

  useEffect(() => {
    // Bounce-in animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(logoGlowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const logoOpacity = logoGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const logoScale = logoGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <LinearGradient
      colors={[colors.background, '#0D1525', colors.neonPurple + '20']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          <Text style={styles.logo}>TRIVIA</Text>
          <Text style={styles.logoCash}>CASH</Text>
        </Animated.View>

        {!supabaseEnabled && (
          <Text style={styles.offlineBanner}>
            ⚠️ Supabase Disabled — Running Offline Mode
          </Text>
        )}

        <NeonCard style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <WalletBalance showLabel textStyle={styles.statValue} />
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>72%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>🔥 5</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
        </NeonCard>

        {gameMode === null ? (
          <View style={styles.modeSelection}>
            <Text style={styles.modeTitle}>Choose Game Mode</Text>
            <NeonButton
              title="🎮 Single Player"
              onPress={() => {
                setGameMode('single');
                router.push('/screens/LobbyScreen');
              }}
              style={styles.modeButton}
              variant="primary"
            />
            <NeonButton
              title="👥 Multiplayer"
              onPress={() => {
                setGameMode('multi');
                router.push('/screens/LobbyScreen');
              }}
              style={styles.modeButton}
              variant="secondary"
              disabled={!supabaseEnabled}
            />
            {!supabaseEnabled && (
              <Text style={styles.disabledText}>
                Multiplayer requires Supabase to be enabled
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.modeSelected}>
            <Text style={styles.modeLabel}>
              Mode: <Text style={styles.modeValue}>{gameMode === 'single' ? 'Single Player' : 'Multiplayer'}</Text>
            </Text>
            <NeonButton
              title="Select Category"
              onPress={() => router.push('/screens/LobbyScreen')}
              style={styles.enterButton}
            />
            <NeonButton
              title="Change Mode"
              onPress={() => setGameMode(null)}
              style={styles.changeModeButton}
              variant="secondary"
            />
          </View>
        )}
      </Animated.View>
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
  logo: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.primaryNeon,
    textAlign: 'center',
    letterSpacing: 8,
    textShadowColor: colors.primaryNeon,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  logoCash: {
    fontSize: 64,
    fontWeight: '900',
    color: colors.neonPurple,
    textAlign: 'center',
    letterSpacing: 8,
    marginTop: -10,
    textShadowColor: colors.neonPurple,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
  },
  statsCard: {
    marginVertical: 40,
    width: '100%',
    maxWidth: 400,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.text + '30',
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: colors.text,
    fontSize: 12,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  enterButton: {
    marginTop: 20,
    width: '100%',
    maxWidth: 300,
  },
  offlineBanner: {
    color: colors.warning,
    textAlign: 'center',
    padding: 12,
    backgroundColor: colors.warning + '20',
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
    fontWeight: '600',
  },
  modeSelection: {
    width: '100%',
    maxWidth: 300,
    marginTop: 20,
    alignItems: 'center',
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modeButton: {
    width: '100%',
    marginBottom: 16,
    minHeight: 60,
  },
  disabledText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
  modeSelected: {
    width: '100%',
    maxWidth: 300,
    marginTop: 20,
    alignItems: 'center',
  },
  modeLabel: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 16,
    opacity: 0.8,
  },
  modeValue: {
    color: colors.primaryNeon,
    fontWeight: '700',
  },
  changeModeButton: {
    marginTop: 12,
    width: '100%',
  },
});

