import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, HeaderBar, SectionHeader, PrimaryButton } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getUser, getTransactions, User, Transaction } from "@/lib/store";
import { mediaUploadIntegration, type UploadProgress } from "@/lib/media-upload-integration";

interface MediaFile {
  id: string;
  name: string;
  cdnUrl: string;
  uploadedAt: Date;
}

export default function CreatorDashboardScreen() {
  const colors = useColors();
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useFocusEffect(useCallback(() => {
    getUser().then(setUser);
    getTransactions().then(setTransactions);
  }, []));

  const handleMediaUpload = useCallback(async () => {
    setIsUploading(true);
    try {
      const mockFile = new File(['mock video data'], `video-${Date.now()}.mp4`, {
        type: 'video/mp4',
      });
      const progress = await mediaUploadIntegration.uploadMedia(mockFile, user?.id || 'creator-123');
      setUploads((prev) => new Map(prev).set(progress.fileId, progress));

      const checkCompletion = setInterval(() => {
        const currentProgress = mediaUploadIntegration.getProgress(progress.fileId);
        if (currentProgress) {
          setUploads((prev) => new Map(prev).set(progress.fileId, currentProgress));
          if (currentProgress.status === 'complete' && currentProgress.cdnUrl) {
            clearInterval(checkCompletion);
            const newFile: MediaFile = {
              id: progress.fileId,
              name: progress.fileName,
              cdnUrl: currentProgress.cdnUrl,
              uploadedAt: new Date(),
            };
            setMediaFiles((prev) => [newFile, ...prev]);
            setUploads((prev) => {
              const newMap = new Map(prev);
              newMap.delete(progress.fileId);
              return newMap;
            });
          }
        }
      }, 1000);
    } catch (error) {
      Alert.alert('Upload Error', error instanceof Error ? error.message : 'Failed to upload media');
    } finally {
      setIsUploading(false);
    }
  }, [user?.id]);

  if (!user) return <ScreenContainer><HeaderBar title="Creator Dashboard" onBack={() => router.back()} /></ScreenContainer>;

  // Simulated creator metrics
  const earningsThisMonth = user.earnings || 142.50;
  const earningsLastMonth = 98.30;
  const change = ((earningsThisMonth - earningsLastMonth) / earningsLastMonth) * 100;
  const newMembers = 12;
  const totalMembers = 47;
  const messagesReceived = 89;
  const tipsCount = 23;

  // Earnings breakdown
  const earningsBreakdown = {
    subscriptions: 89.50,
    tips: 34.20,
    loyaltyBonuses: 12.80,
    referrals: 6.00,
  };

  const tools = [
    { icon: "chart.bar.fill", label: "Analytics", description: "Detailed performance reports", color: colors.primary, route: "/analytics" },
    { icon: "person.2.fill", label: "Members", description: `Manage ${totalMembers} subscribers`, color: colors.success, route: "/members" },
    { icon: "calendar.badge.plus", label: "Content Scheduler", description: "Plan posts ahead", color: colors.warning, route: "/scheduler" },
    { icon: "trophy.fill", label: "Run a Contest", description: "Engage your community", color: "#EC4899", route: "/contests" },
    { icon: "gift.fill", label: "Host a Giveaway", description: "Free promotion tool", color: "#8B5CF6", route: "/contests" },
    { icon: "person.badge.plus", label: "Collab Tools", description: "Partner with creators", color: "#06B6D4", route: "/collab" },
  ];

  return (
    <ScreenContainer>
      <HeaderBar title="Creator Dashboard" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        {/* Earnings Card */}
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 24, gap: 14 }}
        >
          <View>
            <Text style={{ color: "#FFFFFF", fontSize: 14, opacity: 0.9 }}>Earnings This Month</Text>
            <Text style={{ color: "#FFFFFF", fontSize: 40, fontWeight: "800", marginTop: 4 }}>${earningsThisMonth.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <IconSymbol name={change >= 0 ? "arrow.up" : "arrow.down"} size={14} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 13, opacity: 0.95, fontWeight: "600" }}>
              {change >= 0 ? "+" : ""}{change.toFixed(1)}% from last month
            </Text>
          </View>
          <Pressable
            onPress={() => Alert.alert("Withdraw Earnings", `Available to withdraw: $${earningsThisMonth.toFixed(2)}\n\nFunds typically arrive in 1–2 business days.`, [
              { text: "Cancel", style: "cancel" },
              { text: "Withdraw", onPress: () => Alert.alert("Withdrawal requested", "You'll receive an email once funds are sent.") },
            ])}
            style={({ pressed }) => ({
              backgroundColor: "rgba(255,255,255,0.25)",
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <IconSymbol name="arrow.up" size={16} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>Withdraw to Bank</Text>
          </Pressable>
        </LinearGradient>

        {/* Earnings Breakdown */}
        <Card style={{ gap: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>Earnings Breakdown</Text>
          <View style={{ gap: 10 }}>
            <EarningsRow label="Subscriptions" amount={earningsBreakdown.subscriptions} icon="lock.fill" color={colors.primary} />
            <EarningsRow label="Tips" amount={earningsBreakdown.tips} icon="heart.fill" color="#EC4899" />
            <EarningsRow label="Loyalty Bonuses" amount={earningsBreakdown.loyaltyBonuses} icon="star.fill" color={colors.warning} />
            <EarningsRow label="Referrals" amount={earningsBreakdown.referrals} icon="person.badge.plus" color={colors.success} />
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>Total This Month</Text>
              <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "800" }}>${earningsThisMonth.toFixed(2)}</Text>
            </View>
          </View>
        </Card>

        {/* Stats grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatCard label="New Members" value={`+${newMembers}`} icon="person.badge.plus" color={colors.success} />
          <StatCard label="Total Members" value={totalMembers.toString()} icon="person.2.fill" color={colors.primary} />
          <StatCard label="Messages" value={messagesReceived.toString()} icon="bubble.left.fill" color={colors.warning} />
          <StatCard label="Tips Received" value={tipsCount.toString()} icon="heart.fill" color="#EC4899" />
        </View>

        {/* 85/15 Split */}
        <Card style={{ gap: 10 }}>
          <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>Your Split</Text>
          <View style={{ flexDirection: "row", height: 32, borderRadius: 8, overflow: "hidden" }}>
            <View style={{ flex: 85, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>You: 85%</Text>
            </View>
            <View style={{ flex: 15, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}>15%</Text>
            </View>
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
            UR keeps 15% — significantly less than other platforms (OnlyFans 20%, Patreon 8–12%+ payment fees).
          </Text>
        </Card>

        {/* Pricing Settings */}
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "700" }}>Pricing Settings</Text>
            <Pressable
              onPress={() => Alert.alert("Pricing Editor", "Configure your rates for minute, hour, week, month, and year billing periods. Tap each field to edit.")}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="pencil" size={18} color={colors.primary} />
            </Pressable>
          </View>
          <View style={{ gap: 10 }}>
            <PricingRow label="Per Minute" price="$0.99" icon="clock.fill" />
            <PricingRow label="Per Hour" price="$29.99" icon="hourglass" />
            <PricingRow label="Per Week" price="$49.99" icon="calendar" />
            <PricingRow label="Per Month" price="$9.99" icon="lock.fill" />
            <PricingRow label="Per Year" price="$99.99" icon="star.fill" />
            <PricingRow label="Per Message" price="$2.99" icon="bubble.left.fill" />
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
            Set flexible pricing for different subscription lengths. Users choose the billing period that works best for them.
          </Text>
        </Card>

        {/* Media Upload Section */}
        <View>
          <SectionHeader title="Media Library" />
          <Pressable
            onPress={handleMediaUpload}
            disabled={isUploading}
            style={({ pressed }) => ({
              paddingVertical: 16,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: colors.primary,
              backgroundColor: colors.surface,
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
              marginBottom: 12,
            })}
          >
            <Text style={{ fontSize: 24, marginBottom: 8 }}>📹</Text>
            <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 14 }}>
              {isUploading ? 'Uploading...' : 'Upload Video'}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              MP4, WebM • Max 5GB
            </Text>
          </Pressable>

          {uploads.size > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                Uploading ({uploads.size})
              </Text>
              {Array.from(uploads.values()).map((progress) => (
                <View key={progress.fileId} style={{ backgroundColor: colors.surface, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '500', flex: 1 }}>{progress.fileName}</Text>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>{progress.progress}%</Text>
                  </View>
                  <View style={{ width: '100%', height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${progress.progress}%`, backgroundColor: colors.primary }} />
                  </View>
                </View>
              ))}
            </View>
          )}

          {mediaFiles.length > 0 && (
            <View>
              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
                Your Videos ({mediaFiles.length})
              </Text>
              {mediaFiles.map((file) => (
                <View key={file.id} style={{ backgroundColor: colors.surface, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '500' }}>{file.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Alert.alert('Copy URL', file.cdnUrl, [
                        { text: 'Close', style: 'cancel' },
                      ]);
                    }}
                    style={({ pressed }) => ({
                      marginTop: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                      backgroundColor: colors.primary,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Copy CDN URL</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Creator Tools */}
        <View>
          <SectionHeader title="Creator Tools" />
          <View style={{ gap: 8 }}>
            {tools.map((tool) => (
              <Pressable
                key={tool.label}
                onPress={() => Alert.alert(tool.label, `${tool.description}\n\nThis tool is part of UR's full creator suite.`)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  padding: 14,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: tool.color + "20", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name={tool.icon as any} size={20} color={tool.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>{tool.label}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{tool.description}</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        <Card style={{ gap: 8, backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <IconSymbol name="doc.fill" size={18} color={colors.primary} />
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>Tax & SSI Documentation</Text>
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
            UR automatically tracks all your earnings for tax filing and Social Security reporting. 1099 forms are issued each January.
          </Text>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const colors = useColors();
  return (
    <View style={{ width: "48%", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "500" }}>{label}</Text>
        <IconSymbol name={icon as any} size={14} color={color} />
      </View>
      <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

function EarningsRow({ label, amount, icon, color }: { label: string; amount: number; icon: string; color: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconSymbol name={icon as any} size={16} color={color} />
        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500" }}>{label}</Text>
      </View>
      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>${amount.toFixed(2)}</Text>
    </View>
  );
}

function PricingRow({ label, price, icon }: { label: string; price: string; icon: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconSymbol name={icon as any} size={16} color={colors.primary} />
        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500" }}>{label}</Text>
      </View>
      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>{price}</Text>
    </View>
  );
}
