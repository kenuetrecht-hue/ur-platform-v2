/**
 * Wallet Top-Up Screen
 * Allows users to add funds to their wallet via Stripe
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { walletPaymentService } from '@/lib/wallet-payment';
import { getUser } from '@/lib/store';

interface TopupState {
  selectedAmount: number | null;
  customAmount: string;
  isProcessing: boolean;
  showSuccessModal: boolean;
  showErrorModal: boolean;
  errorMessage: string;
  successMessage: string;
}

const PRESET_AMOUNTS = [
  { amount: 500, label: '$5' },
  { amount: 1000, label: '$10' },
  { amount: 2500, label: '$25' },
  { amount: 5000, label: '$50' },
  { amount: 10000, label: '$100' },
];

export default function WalletTopupScreen() {
  const colors = useColors();
  const [state, setState] = useState<TopupState>({
    selectedAmount: null,
    customAmount: '',
    isProcessing: false,
    showSuccessModal: false,
    showErrorModal: false,
    errorMessage: '',
    successMessage: '',
  });

  // Get current user from store
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [currentBalance, setCurrentBalance] = React.useState(0);

  React.useEffect(() => {
    getUser().then((user) => {
      setCurrentUser(user);
      setCurrentBalance(walletPaymentService.getBalance(user.id));
    });
  }, []);

  const getDisplayAmount = (): number | null => {
    if (state.selectedAmount !== null) {
      return state.selectedAmount;
    }
    if (state.customAmount) {
      const parsed = parseInt(state.customAmount) * 100; // Convert dollars to cents
      if (parsed > 0) {
        return parsed;
      }
    }
    return null;
  };

  const handleSelectPreset = (amount: number) => {
    setState((prev) => ({
      ...prev,
      selectedAmount: amount,
      customAmount: '',
    }));
  };

  const handleCustomAmountChange = (text: string) => {
    setState((prev) => ({
      ...prev,
      customAmount: text,
      selectedAmount: null,
    }));
  };

  const handleProcessPayment = async () => {
    if (!currentUser || !currentUser.id) {
      setState((prev) => ({
        ...prev,
        showErrorModal: true,
        errorMessage: 'Please log in to add funds',
      }));
      return;
    }

    const amount = getDisplayAmount();
    if (!amount) {
      setState((prev) => ({
        ...prev,
        showErrorModal: true,
        errorMessage: 'Please select or enter an amount',
      }));
      return;
    }

    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      // Create payment intent
      const response = await walletPaymentService.createTopupIntent({
        userId: currentUser?.id || 'user_1',
        amount,
        description: `Wallet top-up of $${(amount / 100).toFixed(2)}`,
      });

      if (!response.success) {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          showErrorModal: true,
          errorMessage: response.error || 'Failed to create payment',
        }));
        return;
      }

      // In a real app, this would open Stripe payment modal
      // For now, we&apos;ll simulate successful payment
      const confirmResponse = await walletPaymentService.confirmTopup(
        response.transactionId!,
        response.paymentIntentId!
      );

      if (!confirmResponse.success) {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          showErrorModal: true,
          errorMessage: confirmResponse.error || 'Payment failed',
        }));
        return;
      }

      // Update balance
      setCurrentBalance(confirmResponse.newBalance || 0);

      // Success
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        showSuccessModal: true,
        successMessage: `Successfully added $${(amount / 100).toFixed(2)} to your wallet!`,
        selectedAmount: null,
        customAmount: '',
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        showErrorModal: true,
        errorMessage: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  };

  const displayAmount = getDisplayAmount();
  const displayAmountFormatted = displayAmount
    ? `$${(displayAmount / 100).toFixed(2)}`
    : 'Select amount';

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="px-4 py-6 border-b border-border">
          <Text className="text-3xl font-bold text-foreground mb-2">💳 Add Funds</Text>
          <Text className="text-sm text-muted">Top up your wallet to use UR services</Text>
        </View>

        {/* Current Balance */}
        <View className="px-4 py-6 gap-2">
          <Text className="text-sm font-semibold text-muted">Current Balance</Text>
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>
              ${(currentBalance / 100).toFixed(2)}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>
              Available to spend
            </Text>
          </View>
        </View>

        {/* Preset Amounts */}
        <View className="px-4 py-6 gap-4">
          <Text className="text-sm font-semibold text-foreground">Quick Add</Text>
          <View className="gap-3">
            {PRESET_AMOUNTS.map((preset) => (
              <TouchableOpacity
                key={preset.amount}
                onPress={() => handleSelectPreset(preset.amount)}
                style={{
                  backgroundColor:
                    state.selectedAmount === preset.amount ? colors.primary : colors.surface,
                  borderRadius: 8,
                  padding: 12,
                  borderWidth: 2,
                  borderColor:
                    state.selectedAmount === preset.amount ? colors.primary : colors.border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color:
                      state.selectedAmount === preset.amount ? '#fff' : colors.foreground,
                    fontSize: 16,
                    fontWeight: '600',
                  }}
                >
                  {preset.label}
                </Text>
                <Text
                  style={{
                    color:
                      state.selectedAmount === preset.amount ? '#fff' : colors.muted,
                    fontSize: 14,
                  }}
                >
                  {state.selectedAmount === preset.amount ? '✓' : '→'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Amount */}
        <View className="px-4 py-6 gap-3">
          <Text className="text-sm font-semibold text-foreground">Custom Amount</Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 16, fontWeight: '600' }}>$</Text>
            <TextInput
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 8,
                color: colors.foreground,
                fontSize: 16,
              }}
              placeholder="Enter amount"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={state.customAmount}
              onChangeText={handleCustomAmountChange}
            />
          </View>
          <Text className="text-xs text-muted">
            Minimum: $1.00 | Maximum: $1000.00
          </Text>
        </View>

        {/* Payment Summary */}
        {displayAmount && (
          <View className="px-4 py-6 gap-3">
            <Text className="text-sm font-semibold text-foreground">Payment Summary</Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                gap: 8,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 14 }}>Amount</Text>
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>
                  ${(displayAmount / 100).toFixed(2)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 14 }}>Processing Fee</Text>
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>
                  Free
                </Text>
              </View>
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  paddingVertical: 8,
                  marginVertical: 8,
                }}
              />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: 'bold' }}>
                  Total
                </Text>
                <Text style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>
                  ${(displayAmount / 100).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Info Box */}
        <View className="px-4 py-6 gap-3">
            <View
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: 8,
                padding: 12,
                borderLeftWidth: 4,
                borderLeftColor: colors.primary,
              }}
            >
            <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 18 }}>
              💡 <Text style={{ fontWeight: '600' }}>Tip:</Text> Your wallet funds never expire.
              Use them anytime to purchase stickers, tip creators, or join paid chats.
            </Text>
          </View>
        </View>

        {/* Pay Button */}
        <View className="px-4 py-6">
          <TouchableOpacity
            onPress={handleProcessPayment}
            disabled={!displayAmount || state.isProcessing}
            style={{
              backgroundColor:
                !displayAmount || state.isProcessing ? colors.border : colors.primary,
              borderRadius: 8,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: !displayAmount || state.isProcessing ? 0.6 : 1,
            }}
          >
            {state.isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                Pay {displayAmountFormatted}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={state.showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setState((prev) => ({ ...prev, showSuccessModal: false }))
        }
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 24,
              alignItems: 'center',
              gap: 16,
            }}
          >
            <Text style={{ fontSize: 48 }}>✓</Text>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold' }}>
              Payment Successful
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              {state.successMessage}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setState((prev) => ({ ...prev, showSuccessModal: false }))
              }
              style={{
                backgroundColor: colors.primary,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={state.showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setState((prev) => ({ ...prev, showErrorModal: false }))
        }
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 24,
              alignItems: 'center',
              gap: 16,
            }}
          >
            <Text style={{ fontSize: 48 }}>✕</Text>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold' }}>
              Payment Failed
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              {state.errorMessage}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setState((prev) => ({ ...prev, showErrorModal: false }))
              }
              style={{
                backgroundColor: colors.primary,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
