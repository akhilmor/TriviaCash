import { useState, useEffect, useCallback } from 'react';

export interface WalletInfo {
  balance: number;
  currency: string;
}

export function useWallet() {
  // Mock wallet - simple local state for now
  const [balance, setBalance] = useState<number>(1250); // Starting balance
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    balance: 1250,
    currency: 'USD',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load wallet info (mock)
  const loadWallet = useCallback(async () => {
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => {
      setBalance(1250);
      setWalletInfo({ balance: 1250, currency: 'USD' });
      setIsLoading(false);
    }, 100);
  }, []);

  // Refresh balance (mock)
  const refreshBalance = useCallback(async () => {
    return balance;
  }, [balance]);

  // Check if user has sufficient balance (mock)
  const checkBalance = useCallback(async (amount: number): Promise<boolean> => {
    return balance >= amount;
  }, [balance]);

  // Deduct credits (mock - for entry fees)
  const deductCredits = useCallback(async (amount: number, description?: string, category?: string) => {
    if (balance < amount) {
      throw new Error('Insufficient balance');
    }
    const newBalance = balance - amount;
    setBalance(newBalance);
    setWalletInfo({ balance: newBalance, currency: 'USD' });
    return { success: true, balance: newBalance };
  }, [balance]);

  // Add credits (mock - for winnings, bonuses)
  const creditWallet = useCallback(async (amount: number, description?: string, category?: string) => {
    const newBalance = balance + amount;
    setBalance(newBalance);
    setWalletInfo({ balance: newBalance, currency: 'USD' });
    return { success: true, balance: newBalance };
  }, [balance]);

  // Load wallet on mount
  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  return {
    balance,
    walletInfo,
    isLoading,
    error: null,
    loadWallet,
    refreshBalance,
    checkBalance,
    deductCredits,
    creditWallet,
  };
}

// Prevent route warnings - this file is not a route
export default function Placeholder() {
  return null;
}

