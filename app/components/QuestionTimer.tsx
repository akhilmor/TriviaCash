import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';
import CountdownRing from '@/components/CountdownRing';

interface QuestionTimerProps {
  duration: number; // in seconds
  onTimeUp: () => void;
  onTimeUpdate?: (remaining: number) => void;
}

function QuestionTimer({ duration, onTimeUp, onTimeUpdate }: QuestionTimerProps) {
  const [remaining, setRemaining] = useState(duration);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        onTimeUpdate?.(next);
        if (next <= 0) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        // Pulse animation when time is running low
        if (next <= 3) {
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.2,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <CountdownRing duration={duration} onComplete={onTimeUp} size={100} />
      </Animated.View>
      <View style={styles.timeContainer}>
        <LinearGradient
          colors={[colors.primaryNeon, colors.neonPurple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.timeGradient}
        >
          <Text style={styles.timeText}>{remaining}</Text>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timeContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryNeon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  timeText: {
    color: colors.background,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
});

export default QuestionTimer;
