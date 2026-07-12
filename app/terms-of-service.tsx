/**
 * Terms of Service Screen
 * Legal protection for UR platform and creators
 * Covers both Copyright Infringement AND Plagiarism
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

export default function TermsOfServiceScreen() {
  const colors = useColors();
  const [accepted, setAccepted] = useState(false);

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="px-4 py-6 border-b border-border">
          <Text className="text-3xl font-bold text-foreground mb-2">⚖️ Terms of Service</Text>
          <Text className="text-sm text-muted">Last Updated: May 2026</Text>
        </View>

        {/* Content */}
        <View className="px-4 py-6 gap-6">
          {/* Section 1: User-Generated Content, Plagiarism & Copyright Disclaimer */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-3">1. User-Generated Content, Plagiarism & Copyright Disclaimer</Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                borderLeftWidth: 4,
                borderLeftColor: colors.primary,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20 }}>
                U R acts strictly as a passive interactive service provider and host for independent creators. U R does not monitor, verify, or guarantee the originality of any content published by its users.
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginTop: 8, fontWeight: '600' }}>
                U R expressly disclaims all liability for any acts of plagiarism, ethical violations, uncredited copying of ideas, or copyright infringement committed by creators on the platform.
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
                Creators assume 100% personal, civil, and professional liability for ensuring their content is original and properly attributed.
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
                U R maintains a strict zero-tolerance policy for intellectual property theft and will terminate accounts found violating these ethical and legal standards.
              </Text>
            </View>
          </View>

          {/* Section 2: DMCA Policy */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-3">2. Intellectual Property & DMCA Policy</Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#f59e0b',
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20 }}>
                U R respects the intellectual property rights of others. In accordance with the Digital Millennium Copyright Act (DMCA), we will respond expeditiously to claims of copyright infringement committed on our platform.
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
                If you believe your copyrighted work has been uploaded without authorization, please submit a formal Takedown Notice to our Designated DMCA Agent at:
              </Text>
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 13,
                  fontWeight: '600',
                  marginTop: 8,
                  textDecorationLine: 'underline',
                }}
              >
                dmca@ur.app
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
                Your notice must include:
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 12, marginTop: 6, marginLeft: 8 }}>
                • A description of the copyrighted work{'\n'}
                • The specific URL or content ID within our app{'\n'}
                • Your physical or electronic signature{'\n'}
                • A statement under penalty of perjury
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
                Failure to comply with these requirements may invalidate your notice.
              </Text>
            </View>
          </View>

          {/* Section 3: Repeat Infringer & Plagiarism Policy */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-3">3. Repeat Infringer & Plagiarism Policy</Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#ef4444',
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20 }}>
                U R maintains a strict zero-tolerance policy for intellectual property violations, including both copyright infringement and plagiarism.
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
                <Text style={{ fontWeight: '600' }}>Three or more violations (copyright or plagiarism) = Permanent Account Termination</Text>
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
                Creators are responsible for:
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 12, marginTop: 6, marginLeft: 8 }}>
                • Ensuring all content is original or properly licensed{'\n'}
                • Providing proper attribution for all ideas, facts, and sources{'\n'}
                • Understanding copyright law and fair use{'\n'}
                • Obtaining licenses for copyrighted material
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
                We will send warning emails before termination. Repeated violations will result in permanent account closure with no refunds.
              </Text>
            </View>
          </View>

          {/* Section 4: Creator Responsibility */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-3">4. Creator Responsibility & Indemnification</Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#22c55e',
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20 }}>
                By posting content on U R, you agree to:
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 12, marginTop: 8, marginLeft: 8 }}>
                • Own or have rights to all content you upload{'\n'}
                • Ensure all content is original or properly attributed{'\n'}
                • Not plagiarize ideas, facts, or creative expression{'\n'}
                • Not infringe on any third-party intellectual property{'\n'}
                • Indemnify U R from any lawsuits or claims{'\n'}
                • Accept full legal, civil, and financial responsibility{'\n'}
                • Comply with all applicable laws and ethical standards
              </Text>
            </View>
          </View>

          {/* Section 5: Professional Disclaimer */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-3">5. Professional Qualifications Disclaimer</Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#a855f7',
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20 }}>
                U R does not verify or endorse any professional credentials claimed by creators. UR LLC does not claim to be a doctor, lawyer, therapist, financial advisor, or any other professional.
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
                Any professional advice given by creators is their personal opinion and not endorsed by U R. Users should consult qualified professionals before making decisions based on creator content.
              </Text>
            </View>
          </View>

          {/* Section 6: Gamification & Engagement Features Disclosure */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-3">6. Gamification & Engagement Features Disclosure</Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                borderLeftWidth: 4,
                borderLeftColor: '#06b6d4',
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20 }}>
                U R Platform incorporates gamification and engagement features designed to encourage user participation and retention. These features include but are not limited to:
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 12, marginTop: 8, marginLeft: 8 }}>
                • Loyalty points and reward systems{"\n"}
                • Tier progression and achievement badges{"\n"}
                • Leaderboards and competitive rankings{"\n"}
                • Streaks and daily engagement bonuses{"\n"}
                • Limited-time offers and exclusive content{"\n"}
                • Social features and community engagement{"\n"}
                • Push notifications and alerts{"\n"}
                • Subscription tiers with escalating benefits
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginTop: 8, fontWeight: '600' }}>
                Acknowledgment of Gamification:
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
                By using U R, you acknowledge that the platform is intentionally designed with gamification elements to encourage engagement and retention. You understand and accept that these features are designed to be engaging and may encourage frequent use.
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
                <Text style={{ fontWeight: '600' }}>Assumption of Risk:</Text> You assume full responsibility for managing your own use of the platform. UR LLC shall not be liable for any claims of addiction, compulsive use, or psychological harm related to the gamification features or engagement mechanics of the platform.
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
                You agree that UR LLC has disclosed the gamified nature of the platform and that you use it at your own discretion. You waive any right to claim that the platform is addictive or that UR LLC is liable for your personal usage patterns or habits.
              </Text>
            </View>
          </View>

          {/* Section 7: Limitation of Liability */}
          <View>
            <Text className="text-lg font-bold text-foreground mb-3">7. Limitation of Liability</Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                borderLeftWidth: 4,
                borderLeftColor: colors.error,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20 }}>
                U R is provided &quot;as-is&quot; without warranties. UR LLC shall not be liable for:
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 12, marginTop: 8, marginLeft: 8 }}>
                • Copyright infringement by creators{"\n"}
                • Plagiarism or uncredited copying by creators{"\n"}
                • Financial losses from creator interactions{"\n"}
                • Defamation or false professional claims{"\n"}
                • Third-party affiliate transactions{"\n"}
                • Any indirect or consequential damages{"\n"}
                • Claims of addiction or compulsive use{"\n"}
                • Psychological harm from gamification features{"\n"}
                • Excessive engagement or time spent on platform
              </Text>
            </View>
          </View>

          {/* Acceptance Section */}
          <View style={{ gap: 12, marginTop: 12 }}>
            <TouchableOpacity
              onPress={() => setAccepted(!accepted)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                borderWidth: 2,
                borderColor: accepted ? colors.primary : colors.border,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  backgroundColor: accepted ? colors.primary : colors.surface,
                  borderWidth: 2,
                  borderColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {accepted && <Text style={{ color: '#fff', fontWeight: 'bold' }}>✓</Text>}
              </View>
              <Text style={{ color: colors.foreground, fontSize: 13, flex: 1, fontWeight: '500' }}>
                I have read and agree to these Terms of Service
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!accepted}
              style={{
                backgroundColor: accepted ? colors.primary : colors.muted,
                borderRadius: 8,
                padding: 14,
                alignItems: 'center',
                opacity: accepted ? 1 : 0.5,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                ✓ Accept & Continue
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 14 }}>
                Decline
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={{ gap: 8, marginTop: 12, paddingBottom: 20 }}>
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', fontWeight: '600' }}>
              ⚖️ This legal framework protects against both copyright infringement AND plagiarism.
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>
              Questions? Contact us at legal@ur.app
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>
              © 2026 UR LLC. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
