/**
 * Sticker Store Screen
 * Browse and purchase sticker packs
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { stickerStoreService, StickerPack } from '@/lib/sticker-store';
import { walletPaymentService } from '@/lib/wallet-payment';
import { getUser } from '@/lib/store';
import StickerGallery, { STICKER_SAMPLES } from '@/components/sticker-gallery';

interface StoreState {
  packs: StickerPack[];
  selectedPack: StickerPack | null;
  showPurchaseModal: boolean;
  isProcessing: boolean;
  showSuccessModal: boolean;
  showErrorModal: boolean;
  errorMessage: string;
  successMessage: string;
  paymentMethod: 'wallet' | 'stripe' | 'loyalty_points';
  userBalance: number;
  userStickers: number;
}

export default function StickerStoreScreen() {
  const colors = useColors();
  const [state, setState] = useState<StoreState>({
    packs: [],
    selectedPack: null,
    showPurchaseModal: false,
    isProcessing: false,
    showSuccessModal: false,
    showErrorModal: false,
    errorMessage: '',
    successMessage: '',
    paymentMethod: 'wallet',
    userBalance: 0,
    userStickers: 0,
  });

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Load sticker packs
    const packs = stickerStoreService.getStickerPacks();
    setState((prev) => ({ ...prev, packs }));

    // Load user data
    getUser().then((user) => {
      setCurrentUser(user);
      const balance = walletPaymentService.getBalance(user.id);
      const userStickers = stickerStoreService.getUserStickers(user.id);
      setState((prev) => ({
        ...prev,
        userBalance: balance,
        userStickers: userStickers.totalStickers,
      }));
    });
  }, []);

  const handleSelectPack = (pack: StickerPack) => {
    setState((prev) => ({
      ...prev,
      selectedPack: pack,
      showPurchaseModal: true,
      paymentMethod: 'wallet',
    }));
  };

  const handlePurchase = async () => {
    if (!currentUser || !state.selectedPack) {
      setState((prev) => ({
        ...prev,
        showErrorModal: true,
        errorMessage: 'Please log in to purchase stickers',
      }));
      return;
    }

    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      let result: any;

      if (state.paymentMethod === 'wallet') {
        result = await stickerStoreService.createWalletPurchase(
          currentUser.id,
          state.selectedPack.id
        );
      } else if (state.paymentMethod === 'stripe') {
        result = await stickerStoreService.createStripePurchase(
          currentUser.id,
          state.selectedPack.id
        );

        if (result.success) {
          // In real app, would open Stripe modal
          // For now, simulate confirmation
          const confirmResult = await stickerStoreService.confirmStripePurchase(
            result.purchaseId,
            result.clientSecret
          );

          if (!confirmResult.success) {
            throw new Error(confirmResult.error);
          }

          result = confirmResult;
        }
      } else if (state.paymentMethod === 'loyalty_points') {
        // Would need loyalty points from user store
        result = await stickerStoreService.createLoyaltyPointsPurchase(
          currentUser.id,
          state.selectedPack.id,
          100 // Mock loyalty points
        );
      }

      if (!result.success) {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          showErrorModal: true,
          errorMessage: result.error || 'Purchase failed',
        }));
        return;
      }

      // Update user balance and stickers
      const newBalance = walletPaymentService.getBalance(currentUser.id);
      const userStickers = stickerStoreService.getUserStickers(currentUser.id);

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        showPurchaseModal: false,
        showSuccessModal: true,
        successMessage: `Successfully purchased ${state.selectedPack!.stickers} stickers!`,
        userBalance: newBalance,
        userStickers: userStickers.totalStickers,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        showErrorModal: true,
        errorMessage: error instanceof Error ? error.message : 'Purchase failed',
      }));
    }
  };

  const handleClaimStarterPack = async () => {
    if (!currentUser) {
      setState((prev) => ({
        ...prev,
        showErrorModal: true,
        errorMessage: 'Please log in to claim starter pack',
      }));
      return;
    }

    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      const result = await stickerStoreService.getMonthlyStarterPack(currentUser.id);

      if (!result.success) {
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          showErrorModal: true,
          errorMessage: result.error || 'Failed to claim starter pack',
        }));
        return;
      }

      const userStickers = stickerStoreService.getUserStickers(currentUser.id);

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        showSuccessModal: true,
        successMessage: `Successfully claimed ${result.stickersReceived} free stickers!`,
        userStickers: userStickers.totalStickers,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        showErrorModal: true,
        errorMessage: error instanceof Error ? error.message : 'Failed to claim starter pack',
      }));
    }
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="px-4 py-6 border-b border-border">
          <Text className="text-3xl font-bold text-foreground mb-2">✨ Sticker Store</Text>
          <Text className="text-sm text-muted mb-3">Express yourself with stickers</Text>
          <View
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: 6,
              padding: 8,
              borderLeftWidth: 3,
              borderLeftColor: colors.primary,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 16 }}>
              💙 <Text style={{ fontWeight: '600' }}>100% of proceeds go to UR</Text> to help us build the best creator platform!
            </Text>
          </View>
        </View>

        {/* User Stats */}
        <View className="px-4 py-6 gap-3">
          <View className="flex-row gap-3">
            <View
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 12 }}>Stickers</Text>
              <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: 'bold' }}>
                {state.userStickers}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 12 }}>Wallet</Text>
              <Text style={{ color: colors.primary, fontSize: 20, fontWeight: 'bold' }}>
                ${(state.userBalance / 100).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Starter Pack CTA */}
        <View className="px-4 py-2">
          <TouchableOpacity
            onPress={handleClaimStarterPack}
            disabled={state.isProcessing}
            style={{
              backgroundColor: '#10B981',
              borderRadius: 8,
              padding: 12,
              alignItems: 'center',
              opacity: state.isProcessing ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
              🎁 Claim Free 20 Stickers (1st of Month)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sticker Sampler Gallery */}
        <View className="px-4 py-6 gap-6">
          <View
            style={{
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              borderRadius: 8,
              padding: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#a855f7',
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 16 }}>
              📝 <Text style={{ fontWeight: '600' }}>Note:</Text> These are sample previews. Your actual stickers will be created and added to your collection upon purchase!
            </Text>
          </View>

          <StickerGallery
            title="✨ Sticker Sampler"
            description="Preview of stickers you can collect"
            stickers={STICKER_SAMPLES.basic}
            columns={4}
          />
          <StickerGallery
            title="🌟 Premium Collection"
            description="Exclusive designs in higher tiers"
            stickers={STICKER_SAMPLES.ultraPremium}
            columns={4}
          />
        </View>

        {/* Sticker Packs */}
        <View className="px-4 py-6 gap-3">
          <Text className="text-sm font-semibold text-foreground mb-2">Available Packs</Text>
          <View>
            {state.packs.map((pack) => (
              <TouchableOpacity
                key={pack.id}
                onPress={() => handleSelectPack(pack)}
                style={{
                  backgroundColor: pack.popular ? colors.primary : colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: pack.popular ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text
                      style={{
                        color: pack.popular ? '#fff' : colors.foreground,
                        fontSize: 16,
                        fontWeight: '600',
                      }}
                    >
                      {pack.name}
                    </Text>
                    <Text
                      style={{
                        color: pack.popular ? 'rgba(255,255,255,0.8)' : colors.muted,
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {pack.description}
                    </Text>
                  </View>
                  {pack.popular && (
                    <View
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
                        POPULAR
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row justify-between items-end">
                  <View className="gap-1">
                    <Text
                      style={{
                        color: pack.popular ? 'rgba(255,255,255,0.8)' : colors.muted,
                        fontSize: 11,
                      }}
                    >
                      {pack.stickers} stickers
                    </Text>
                    <Text
                      style={{
                        color: pack.popular ? 'rgba(255,255,255,0.8)' : colors.muted,
                        fontSize: 11,
                      }}
                    >
                      +{pack.loyaltyPoints} points
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: pack.popular ? '#fff' : colors.foreground,
                      fontSize: 18,
                      fontWeight: 'bold',
                    }}
                  >
                    ${(pack.price / 100).toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info */}
        <View className="px-4 py-6 gap-3">
          <View
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderRadius: 8,
              padding: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#22c55e',
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 18 }}>
              💡 <Text style={{ fontWeight: '600' }}>Tip:</Text> Every purchase earns loyalty points! Use them to get free stickers.
            </Text>
          </View>
          <View
            style={{
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              borderRadius: 8,
              padding: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#a855f7',
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 18 }}>
              ✨ <Text style={{ fontWeight: '600' }}>Quality Tiers:</Text> Cheaper packs have basic stickers. Higher tiers unlock top-notch, exclusive designs!
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Purchase Modal */}
      <Modal
        visible={state.showPurchaseModal}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setState((prev) => ({ ...prev, showPurchaseModal: false }))
        }
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              gap: 16,
            }}
          >
            {state.selectedPack && (
              <>
                <View className="gap-2">
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 20,
                      fontWeight: 'bold',
                    }}
                  >
                    {state.selectedPack.name}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 14 }}>
                    {state.selectedPack.stickers} stickers + {state.selectedPack.loyaltyPoints}{' '}
                    loyalty points
                  </Text>
                </View>

                {/* Payment Method Selection */}
                <View className="gap-2">
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>
                    Pay with:
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setState((prev) => ({ ...prev, paymentMethod: 'wallet' }))
                    }
                    style={{
                      backgroundColor:
                        state.paymentMethod === 'wallet' ? colors.primary : colors.background,
                      borderRadius: 8,
                      padding: 12,
                      borderWidth: 2,
                      borderColor:
                        state.paymentMethod === 'wallet' ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: state.paymentMethod === 'wallet' ? '#fff' : colors.foreground,
                        fontWeight: '600',
                      }}
                    >
                      💳 Wallet (${(state.userBalance / 100).toFixed(2)})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      setState((prev) => ({ ...prev, paymentMethod: 'stripe' }))
                    }
                    style={{
                      backgroundColor:
                        state.paymentMethod === 'stripe' ? colors.primary : colors.background,
                      borderRadius: 8,
                      padding: 12,
                      borderWidth: 2,
                      borderColor:
                        state.paymentMethod === 'stripe' ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: state.paymentMethod === 'stripe' ? '#fff' : colors.foreground,
                        fontWeight: '600',
                      }}
                    >
                      💳 Credit Card
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Total */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.foreground, fontWeight: '600' }}>Total:</Text>
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 18,
                      fontWeight: 'bold',
                    }}
                  >
                    ${(state.selectedPack.price / 100).toFixed(2)}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() =>
                      setState((prev) => ({ ...prev, showPurchaseModal: false }))
                    }
                    style={{
                      flex: 1,
                      backgroundColor: colors.border,
                      borderRadius: 8,
                      paddingVertical: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handlePurchase}
                    disabled={state.isProcessing}
                    style={{
                      flex: 1,
                      backgroundColor: colors.primary,
                      borderRadius: 8,
                      paddingVertical: 12,
                      alignItems: 'center',
                      opacity: state.isProcessing ? 0.6 : 1,
                    }}
                  >
                    {state.isProcessing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Purchase</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

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
              Purchase Successful
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
              Purchase Failed
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
