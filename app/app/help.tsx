import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { Card, HeaderBar } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const FAQS = [
  {
    q: "How does UR work?",
    a: "UR connects creators with their communities through messaging, paid chats, and tipping. Creators keep 85% of every transaction — UR takes only 15%.",
  },
  {
    q: "How do I become a creator?",
    a: "Tap your Profile tab → Creator Dashboard → Get Started. Set your pricing, customize your profile, and share your link. You can be earning within minutes.",
  },
  {
    q: "What does it cost to use UR?",
    a: "Browsing UR is free. Tips, monthly chats, and per-message rates are set by each creator. New users get 7 days free, then 50% off the first month.",
  },
  {
    q: "How does the loyalty program work?",
    a: "Earn points by tipping creators, subscribing to paid chats, sending messages, and referring friends. Climb tiers (Bronze → Silver → Gold → Platinum) for discounts and perks.",
  },
  {
    q: "How do I refer friends?",
    a: "Profile → Refer Friends. Share your code. They get 50% off their first month, you earn $5 + 100 points when they subscribe to any creator.",
  },
  {
    q: "How do I add money to my wallet?",
    a: "Go to Wallet → Top Up. We accept all major credit/debit cards via secure Stripe processing.",
  },
  {
    q: "How do creators get paid?",
    a: "Earnings are deposited to your linked bank account weekly. Set up payouts in Settings → Payment Methods. Tax forms (1099) are issued each January.",
  },
  {
    q: "Is my information safe?",
    a: "Yes. UR is age-verified (18+ only), uses end-to-end encrypted payments, and has 24/7 moderation. Report any issues using the report button on any profile.",
  },
  {
    q: "How do I cancel a subscription?",
    a: "Go to the creator's profile → Following → Cancel Subscription. You'll keep access until the end of your current billing period.",
  },
];

export default function HelpScreen() {
  const colors = useColors();
  const [expanded, setExpanded] = useState<number | null>(null);

  function handleContact() {
    Alert.alert(
      "Contact Support",
      "How would you like to reach us?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Email support@ur-app.com", onPress: () => Alert.alert("Email", "Open your email app and write to support@ur-app.com") },
        { text: "Live Chat", onPress: () => Alert.alert("Live Chat", "Live chat is available Mon–Fri 9am–6pm EST.") },
      ]
    );
  }

  return (
    <ScreenContainer>
      <HeaderBar title="Help & Support" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        {/* Our Mission */}
        <Card style={{ gap: 12, padding: 20, backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Our Mission</Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>
            UR a space for all creators. Whether you share art, life, or your mental health journey, UR welcome here.
          </Text>
        </Card>

        {/* Quick actions */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={handleContact}
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
          >
            <Card style={{ alignItems: "center", gap: 8, padding: 18 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + "20", alignItems: "center", justifyContent: "center" }}>
                <IconSymbol name="bubble.left.fill" size={22} color={colors.primary} />
              </View>
              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600", textAlign: "center" }}>Contact Us</Text>
            </Card>
          </Pressable>
          <Pressable
            onPress={() => Alert.alert("Report Issue", "Use the report button on any profile or message to flag specific content.")}
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
          >
            <Card style={{ alignItems: "center", gap: 8, padding: 18 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.warning + "20", alignItems: "center", justifyContent: "center" }}>
                <IconSymbol name="exclamationmark.triangle.fill" size={22} color={colors.warning} />
              </View>
              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600", textAlign: "center" }}>Report Issue</Text>
            </Card>
          </Pressable>
        </View>

        {/* FAQs */}
        <View>
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700", marginBottom: 12 }}>Frequently Asked Questions</Text>
          <View style={{ gap: 8 }}>
            {FAQS.map((faq, idx) => {
              const isOpen = expanded === idx;
              return (
                <Pressable
                  key={faq.q}
                  onPress={() => setExpanded(isOpen ? null : idx)}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 16,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <Text style={{ flex: 1, color: colors.foreground, fontSize: 15, fontWeight: "600" }}>{faq.q}</Text>
                    <IconSymbol name={isOpen ? "chevron.right" : "chevron.right"} size={16} color={colors.muted} style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }} />
                  </View>
                  {isOpen && (
                    <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 12 }}>{faq.a}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <Card style={{ alignItems: "center", gap: 10, padding: 24, backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }}>
          <IconSymbol name="heart.fill" size={28} color={colors.primary} />
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", textAlign: "center" }}>Still need help?</Text>
          <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19 }}>
            Our team responds within 24 hours. We&apos;re here to help you succeed on UR.
          </Text>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}
