import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

interface Subscription {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorImage?: string;
  tier: 'Basic' | 'Pro' | 'Premium';
  monthlyPrice: number;
  startDate: Date;
  renewalDate: Date;
  status: 'active' | 'paused' | 'cancelled';
  autoRenew: boolean;
  billingHistory: BillingRecord[];
}

interface BillingRecord {
  id: string;
  date: Date;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
}

export default function SubscriptionManagement() {
  const colors = useColors();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      // TODO: Fetch from API
      const mockSubscriptions: Subscription[] = [
        {
          id: '1',
          creatorId: 'creator1',
          creatorName: 'AI Crypto Analyst',
          tier: 'Pro',
          monthlyPrice: 19.99,
          startDate: new Date('2026-01-15'),
          renewalDate: new Date('2026-06-27'),
          status: 'active',
          autoRenew: true,
          billingHistory: [
            {
              id: 'b1',
              date: new Date('2026-05-27'),
              amount: 19.99,
              status: 'paid',
              description: 'Monthly subscription renewal',
            },
            {
              id: 'b2',
              date: new Date('2026-04-27'),
              amount: 19.99,
              status: 'paid',
              description: 'Monthly subscription renewal',
            },
          ],
        },
        {
          id: '2',
          creatorId: 'creator2',
          creatorName: 'AI News Daily',
          tier: 'Basic',
          monthlyPrice: 7.99,
          startDate: new Date('2026-03-01'),
          renewalDate: new Date('2026-06-01'),
          status: 'active',
          autoRenew: true,
          billingHistory: [
            {
              id: 'b3',
              date: new Date('2026-05-01'),
              amount: 7.99,
              status: 'paid',
              description: 'Monthly subscription renewal',
            },
          ],
        },
      ];
      setSubscriptions(mockSubscriptions);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      Alert.alert('Error', 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = (subscriptionId: string) => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel this subscription? You will lose access immediately.',
      [
        { text: 'Keep Subscription', onPress: () => {}, style: 'cancel' },
        {
          text: 'Cancel Subscription',
          onPress: () => cancelSubscription(subscriptionId),
          style: 'destructive',
        },
      ]
    );
  };

  const cancelSubscription = async (subscriptionId: string) => {
    try {
      // TODO: Call API to cancel subscription
      setSubscriptions(
        subscriptions.map((sub) =>
          sub.id === subscriptionId ? { ...sub, status: 'cancelled' as const } : sub
        )
      );
      Alert.alert('Success', 'Subscription cancelled');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      Alert.alert('Error', 'Failed to cancel subscription');
    }
  };

  const handlePauseSubscription = (subscriptionId: string) => {
    try {
      setSubscriptions(
        subscriptions.map((sub) =>
          sub.id === subscriptionId ? { ...sub, status: 'paused' as const } : sub
        )
      );
      Alert.alert('Success', 'Subscription paused for 30 days');
    } catch (error) {
      console.error('Error pausing subscription:', error);
      Alert.alert('Error', 'Failed to pause subscription');
    }
  };

  const handleToggleAutoRenew = (subscriptionId: string) => {
    try {
      setSubscriptions(
        subscriptions.map((sub) =>
          sub.id === subscriptionId ? { ...sub, autoRenew: !sub.autoRenew } : sub
        )
      );
    } catch (error) {
      console.error('Error toggling auto-renew:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'paused':
        return colors.warning;
      case 'cancelled':
        return colors.error;
      default:
        return colors.muted;
    }
  };

  const totalMonthlySpend = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + s.monthlyPrice, 0);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground mb-2">My Subscriptions</Text>
          <Text className="text-base text-muted">Manage your creator subscriptions</Text>
        </View>

        {/* Monthly Spend Summary */}
        <View
          className="bg-surface rounded-lg p-4 mb-6 border border-border"
          style={{ borderColor: colors.border }}
        >
          <Text className="text-sm text-muted mb-1">Total Monthly Spend</Text>
          <Text className="text-3xl font-bold text-foreground">${totalMonthlySpend.toFixed(2)}</Text>
          <Text className="text-xs text-muted mt-2">
            {subscriptions.filter((s) => s.status === 'active').length} active subscription
            {subscriptions.filter((s) => s.status === 'active').length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Subscriptions List */}
        {loading ? (
          <View className="items-center justify-center py-8">
            <Text className="text-muted">Loading subscriptions...</Text>
          </View>
        ) : subscriptions.length === 0 ? (
          <View className="items-center justify-center py-8">
            <Text className="text-muted">No subscriptions yet</Text>
          </View>
        ) : (
          subscriptions.map((subscription) => (
            <View
              key={subscription.id}
              className="bg-surface rounded-lg mb-4 border border-border overflow-hidden"
              style={{ borderColor: colors.border }}
            >
              {/* Subscription Header */}
              <TouchableOpacity
                onPress={() =>
                  setExpandedId(expandedId === subscription.id ? null : subscription.id)
                }
                className="p-4 flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-foreground">
                    {subscription.creatorName}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: getStatusColor(subscription.status) }}
                    >
                      <Text className="text-xs font-semibold text-white capitalize">
                        {subscription.status}
                      </Text>
                    </View>
                    <Text className="text-sm text-muted">{subscription.tier}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-lg font-bold text-primary">
                    ${subscription.monthlyPrice.toFixed(2)}
                  </Text>
                  <Text className="text-xs text-muted">/month</Text>
                </View>
              </TouchableOpacity>

              {/* Expanded Details */}
              {expandedId === subscription.id && (
                <View className="border-t border-border px-4 py-4" style={{ borderColor: colors.border }}>
                  {/* Renewal Date */}
                  <View className="mb-4">
                    <Text className="text-sm text-muted mb-1">Next Renewal</Text>
                    <Text className="text-base font-semibold text-foreground">
                      {subscription.renewalDate.toLocaleDateString()}
                    </Text>
                  </View>

                  {/* Auto-Renew Toggle */}
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-sm text-foreground">Auto-Renew</Text>
                    <TouchableOpacity
                      onPress={() => handleToggleAutoRenew(subscription.id)}
                      className={`w-12 h-7 rounded-full items-center justify-center ${
                        subscription.autoRenew ? 'bg-primary' : 'bg-border'
                      }`}
                    >
                      <View
                        className={`w-6 h-6 rounded-full bg-white ${
                          subscription.autoRenew ? 'ml-3' : '-ml-3'
                        }`}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Billing History */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-foreground mb-2">Billing History</Text>
                    {subscription.billingHistory.map((record) => (
                      <View key={record.id} className="flex-row justify-between items-center mb-2">
                        <View className="flex-1">
                          <Text className="text-sm text-foreground">{record.description}</Text>
                          <Text className="text-xs text-muted">{record.date.toLocaleDateString()}</Text>
                        </View>
                        <Text className="text-sm font-semibold text-foreground">
                          ${record.amount.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Action Buttons */}
                  <View className="gap-2">
                    {subscription.status === 'active' && (
                      <>
                        <TouchableOpacity
                          onPress={() => handlePauseSubscription(subscription.id)}
                          className="bg-warning px-4 py-3 rounded-lg items-center"
                        >
                          <Text className="text-white font-semibold">Pause for 30 Days</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleCancelSubscription(subscription.id)}
                          className="bg-error px-4 py-3 rounded-lg items-center"
                        >
                          <Text className="text-white font-semibold">Cancel Subscription</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {subscription.status === 'paused' && (
                      <TouchableOpacity
                        onPress={() =>
                          setSubscriptions(
                            subscriptions.map((sub) =>
                              sub.id === subscription.id
                                ? { ...sub, status: 'active' as const }
                                : sub
                            )
                          )
                        }
                        className="bg-primary px-4 py-3 rounded-lg items-center"
                      >
                        <Text className="text-white font-semibold">Resume Subscription</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          ))
        )}

        {/* FTC Compliance Notice */}
        <View className="bg-primary/10 rounded-lg p-4 mt-6 border border-primary">
          <Text className="text-xs font-semibold text-primary mb-1">💳 Easy Cancellation</Text>
          <Text className="text-xs text-foreground">
            You can cancel any subscription at any time with one click. No hidden fees or long-term
            commitments.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
