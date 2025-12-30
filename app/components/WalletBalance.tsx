import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '@/constants/colors';
import { useWallet } from '@/hooks/useWallet';

interface WalletBalanceProps {
  showLabel?: boolean;
  style?: any;
  textStyle?: any;
}

export default function WalletBalance({ showLabel = true, style, textStyle }: WalletBalanceProps) {
  const { balance, isLoading } = useWallet();

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color={colors.primaryNeon} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {showLabel && <Text style={styles.label}>Balance</Text>}
      <Text style={[styles.amount, textStyle]}>${balance.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    color: colors.text,
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amount: {
    color: colors.warning,
    fontSize: 24,
    fontWeight: '900',
  },
});

