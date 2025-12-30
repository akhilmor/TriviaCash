import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';

interface NeonButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'error';
  style?: ViewStyle;
}

function NeonButton({ 
  title, 
  onPress, 
  disabled = false, 
  variant = 'primary',
  style 
}: NeonButtonProps) {
  const getGradientColors = (): [string, string] => {
    switch (variant) {
      case 'secondary':
        return [colors.neonPurple, '#7B2FFF'];
      case 'success':
        return [colors.success, '#00CC6A'];
      case 'error':
        return [colors.error, '#CC0044'];
      default:
        return [colors.primaryNeon, '#00B8E5'];
    }
  };

  const borderColor = variant === 'primary' ? colors.primaryNeon :
                      variant === 'secondary' ? colors.neonPurple :
                      variant === 'success' ? colors.success : colors.error;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.container, style, disabled && styles.disabled]}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Text style={[styles.text, disabled && styles.textDisabled]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.primaryNeon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  text: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.5,
    shadowOpacity: 0.3,
  },
  textDisabled: {
    opacity: 0.7,
  },
});

export default NeonButton;
