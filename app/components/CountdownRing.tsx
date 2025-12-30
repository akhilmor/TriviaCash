import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '@/constants/colors';
import Svg, { Circle } from 'react-native-svg';

interface CountdownRingProps {
  duration: number; // in seconds
  onComplete?: () => void;
  size?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CountdownRing({ duration, onComplete, size = 80 }: CountdownRingProps) {
  const animatedValue = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  const circumference = 2 * Math.PI * (size / 2 - 5);
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, circumference],
  });

  useEffect(() => {
    // Start countdown animation
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: duration * 1000,
      useNativeDriver: false,
    }).start(() => {
      onComplete?.();
    });

    // Rotation animation for glow effect
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, [duration]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={{
          transform: [{ rotate }],
          position: 'absolute',
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 5}
            stroke={colors.primaryNeon}
            strokeWidth={4}
            fill="none"
            opacity={0.3}
          />
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 5}
          stroke={colors.primaryNeon}
          strokeWidth={4}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CountdownRing;
