/**
 * Creator Agreement & Liability Waiver Screen
 * Required acceptance before first upload
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

export default function CreatorAgreementScreen() {
  const colors = useColors();
  const [acceptedAll, setAcceptedAll] = useState(false);
  const [sections, setSections] = useState({
    ownership: false,
    copyright: false,
    liability: false,
    indemnify: false,
    professional: false,
    repeat: false,
  });

  const allAccepted = Object.values(sections).every((v) => v === true);

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const CheckBox = ({ checked, onPress }: { checked: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: checked ? colors.primary : colors.surface,
        borderWidth: 2,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>✓</Text>}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="px-4 py-6 border-b border-border">
          <Text className="text-3xl font-bold text-foreground mb-2">📋 Creator Agreement</Text>
          <Text className="text-sm text-muted">
            Required before your first upload. Please read carefully.
          </Text>
        </View>

        {/* Content */}
        <View className="px-4 py-6 gap-4">
          {/* Section 1: Content Ownership */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              padding: 12,
              borderWidth: 1,
              borderColor: sections.ownership ? colors.primary : colors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => toggleSection('ownership')}
              style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
            >
              <CheckBox checked={sections.ownership} onPress={() => toggleSection('ownership')} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                  I Own All Content I Upload
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                  I confirm that I own or have the legal right to use all content I post on U R, including text, images,
                  videos, and audio.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 2: No Copyright Infringement */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              padding: 12,
              borderWidth: 1,
              borderColor: sections.copyright ? colors.primary : colors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => toggleSection('copyright')}
              style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
            >
              <CheckBox checked={sections.copyright} onPress={() => toggleSection('copyright')} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                  No Copyright Infringement
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                  I will not upload copyrighted music, videos, images, or other materials without proper permission or
                  licenses. I understand that copyright violations can result in account termination.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 3: Full Liability */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              padding: 12,
              borderWidth: 1,
              borderColor: sections.liability ? colors.primary : colors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => toggleSection('liability')}
              style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
            >
              <CheckBox checked={sections.liability} onPress={() => toggleSection('liability')} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                  I Accept Full Liability
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                  I accept 100% personal and financial responsibility for all content I post. U R is not liable for any
                  legal issues, lawsuits, or damages resulting from my content.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 4: Indemnification */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              padding: 12,
              borderWidth: 1,
              borderColor: sections.indemnify ? colors.primary : colors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => toggleSection('indemnify')}
              style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
            >
              <CheckBox checked={sections.indemnify} onPress={() => toggleSection('indemnify')} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                  I Will Indemnify U R
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                  I agree to defend and hold UR LLC harmless from any claims, lawsuits, or damages arising from my
                  content or actions.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 5: Professional Disclaimer */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              padding: 12,
              borderWidth: 1,
              borderColor: sections.professional ? colors.primary : colors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => toggleSection('professional')}
              style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
            >
              <CheckBox checked={sections.professional} onPress={() => toggleSection('professional')} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                  Professional Credentials Disclaimer
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                  I understand that U R does not verify professional credentials. Any advice I give is my personal opinion,
                  not professional medical, legal, or financial advice.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 6: Repeat Infringer Policy */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              padding: 12,
              borderWidth: 1,
              borderColor: sections.repeat ? colors.primary : colors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => toggleSection('repeat')}
              style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
            >
              <CheckBox checked={sections.repeat} onPress={() => toggleSection('repeat')} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                  Repeat Infringer Policy
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                  I understand that 3 or more copyright violations will result in permanent account termination with no
                  refunds.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={{ gap: 12, marginTop: 12 }}>
            <TouchableOpacity
              disabled={!allAccepted}
              style={{
                backgroundColor: allAccepted ? colors.primary : colors.muted,
                borderRadius: 8,
                padding: 14,
                alignItems: 'center',
                opacity: allAccepted ? 1 : 0.5,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                ✓ Accept & Start Creating
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
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>
              By accepting, you agree to these terms and take full responsibility for your content.
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>
              Questions? Contact legal@ur.app
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
