import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';

interface NeonCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glowColor?: string;
}

function NeonCard({ children, style, glowColor = colors.primaryNeon }: NeonCardProps) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[colors.card, '#1A1F2E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.border, { borderColor: glowColor }]} />
        <View style={styles.content}>{children}</View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primaryNeon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  gradient: {
    borderRadius: 16,
    padding: 2,
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 2,
    opacity: 0.5,
  },
  content: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
  },
});

export default NeonCard;
