/**
 * User Onboarding Screen
 * Displays Terms of Service, Privacy Policy, and Educational Disclaimers
 * Requires users to explicitly accept before accessing the app
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface OnboardingStep {
  id: string;
  title: string;
  icon: string;
  description: string;
  content: string;
  required: boolean;
}

interface UserAgreement {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  educationalDisclaimerAccepted: boolean;
  dataProcessingAccepted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// CONTENT
// ============================================================================

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to UR",
    icon: "👋",
    description: "Multi-AI Collaborative 3D Workspace",
    content: `Welcome to UR - a revolutionary platform for entrepreneurs and learners. This app is designed to help you build a better life through collaboration with AI specialists.

Before you proceed, please review our Terms of Service, Privacy Policy, and Educational Disclaimers.`,
    required: false,
  },
  {
    id: "terms",
    title: "Terms of Service",
    icon: "📋",
    description: "Legal agreement and usage guidelines",
    content: `TERMS OF SERVICE

1. ACCEPTANCE OF TERMS
By accessing and using UR, you accept and agree to be bound by the terms and provision of this agreement.

2. USE LICENSE
Permission is granted to temporarily download one copy of the materials (information or software) on UR for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
- Modify or copy the materials
- Use the materials for any commercial purpose or for any public display
- Attempt to decompile or reverse engineer any software contained on UR
- Remove any copyright or other proprietary notations from the materials
- Transfer the materials to another person or "mirror" the materials on any other server

3. DISCLAIMER
The materials on UR are provided on an 'as is' basis. UR makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.

4. LIMITATIONS
In no event shall UR or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on UR.

5. ACCURACY OF MATERIALS
The materials appearing on UR could include technical, typographical, or photographic errors. UR does not warrant that any of the materials on UR are accurate, complete, or current. UR may make changes to the materials contained on UR at any time without notice.

6. LINKS
UR has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by UR of the site. Use of any such linked website is at the user's own risk.

7. MODIFICATIONS
UR may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.

8. GOVERNING LAW
These terms and conditions are governed by and construed in accordance with the laws of the United States, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.

9. AI-GENERATED CONTENT DISCLAIMER
All AI-generated content is provided for educational purposes only. UR does not guarantee the accuracy, completeness, or reliability of any AI-generated responses. Users are responsible for verifying information and making their own informed decisions.

10. NO PROFESSIONAL LIABILITY
UR does not provide professional medical, legal, financial, or other professional services. AI agents are educational tools only. Always consult with qualified professionals before making important decisions.`,
    required: true,
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    icon: "🔒",
    description: "How we protect your data",
    content: `PRIVACY POLICY

1. INFORMATION WE COLLECT
- Account information (name, email, profile data)
- Usage data (interactions, preferences, activity logs)
- Device information (device type, OS, app version)
- Location data (with your permission)
- Audio/video data (only when you explicitly enable voice/video features)

2. HOW WE USE YOUR INFORMATION
- To provide and improve our services
- To personalize your experience
- To monitor and prevent abuse
- To comply with legal obligations
- To communicate with you about updates and features

3. DATA PROTECTION
We implement industry-standard security measures including:
- Encryption of data in transit and at rest
- Regular security audits
- Access controls and authentication
- Secure API endpoints

4. DATA RETENTION
- Active account data: Retained while account is active
- Inactive accounts: Deleted after 12 months of inactivity
- Usage logs: Retained for 90 days
- Backup data: Retained for 30 days

5. YOUR RIGHTS
You have the right to:
- Access your personal data
- Correct inaccurate data
- Request deletion of your data
- Opt-out of non-essential communications
- Withdraw consent at any time

6. THIRD-PARTY SHARING
We do not sell your personal data. We may share data with:
- Service providers (hosting, analytics, payment processing)
- Law enforcement (when legally required)
- Business partners (with your explicit consent)

7. COOKIES AND TRACKING
We use cookies and similar technologies to:
- Remember your preferences
- Understand usage patterns
- Prevent fraud
- Improve performance

8. CHILDREN'S PRIVACY
UR is not intended for users under 13. We do not knowingly collect data from children under 13.

9. GDPR AND CCPA COMPLIANCE
- EU users: GDPR rights apply
- California users: CCPA rights apply
- Other users: Equivalent protections apply

10. CONTACT US
For privacy inquiries: privacy@urplatform.com`,
    required: true,
  },
  {
    id: "educational",
    title: "Educational Disclaimer",
    icon: "📚",
    description: "Important information about AI assistance",
    content: `EDUCATIONAL DISCLAIMER & RESPONSIBLE USE AGREEMENT

1. EDUCATIONAL PURPOSE ONLY
UR is designed as an educational and learning platform. All AI-generated content is for informational and educational purposes only.

2. NOT A SUBSTITUTE FOR PROFESSIONALS
AI agents on UR are NOT:
- Medical doctors or healthcare providers
- Licensed attorneys or legal advisors
- Certified financial advisors or investment professionals
- Licensed therapists or mental health professionals
- Professional engineers or architects

Always consult with qualified professionals for important decisions.

3. ACCURACY AND LIMITATIONS
- AI responses may contain errors or outdated information
- AI has knowledge cutoffs and may not know recent events
- Complex topics may require professional expertise
- Always verify critical information from authoritative sources

4. RESPONSIBLE USE COMMITMENT
By using UR, you commit to:
- Using the platform only for legitimate educational and entrepreneurial purposes
- Not using the platform to create harmful, illegal, or fraudulent content
- Respecting intellectual property rights
- Not attempting to bypass safety measures
- Reporting safety concerns to our team

5. PROHIBITED USES
You may NOT use UR to:
- Create or distribute illegal content
- Harass, threaten, or harm others
- Commit fraud or scams
- Violate privacy or security
- Infringe on intellectual property
- Bypass safety filters or restrictions
- Conduct unauthorized research or data collection

6. ENTREPRENEURIAL FOCUS
UR is designed to help entrepreneurs and learners build legitimate businesses and develop skills. The platform is NOT intended for:
- Illegal activities
- Exploitation or abuse
- Deception or fraud
- Harm to others
- Violation of laws or regulations

7. AI LIMITATIONS
- AI may have biases or limitations
- AI cannot replace human judgment
- AI responses should be critically evaluated
- Complex decisions require professional input

8. CONTENT MODERATION
UR employs:
- Automated content filtering
- Manual review of flagged content
- User reporting mechanisms
- Enforcement of community guidelines
- Suspension/termination for violations

9. ASSUMPTION OF RISK
You acknowledge and assume all risks associated with:
- Using AI-generated content
- Following AI recommendations
- Relying on AI analysis
- Decisions made based on AI assistance

10. CHANGES TO TERMS
UR reserves the right to modify these terms at any time. Continued use constitutes acceptance of changes.`,
    required: true,
  },
  {
    id: "data-processing",
    title: "Data Processing Agreement",
    icon: "⚙️",
    description: "How we process and analyze your data",
    content: `DATA PROCESSING AGREEMENT

1. DATA PROCESSING ACTIVITIES
We process your data to:
- Improve AI model accuracy and responses
- Detect and prevent abuse
- Analyze usage patterns
- Provide personalized recommendations
- Monitor platform health and performance

2. AUTOMATED DECISION MAKING
Some decisions are made automatically, including:
- Content safety classification
- Abuse pattern detection
- User risk assessment
- Recommendation generation

You have the right to request human review of automated decisions.

3. ANALYTICS AND INSIGHTS
We collect and analyze:
- Feature usage statistics
- User engagement metrics
- Performance indicators
- Error and crash reports
- Security events

4. MACHINE LEARNING
Your data may be used to:
- Train and improve AI models
- Develop new features
- Enhance safety systems
- Personalize experiences

5. DATA ANONYMIZATION
We anonymize data when possible to:
- Protect privacy
- Enable analysis
- Improve services
- Conduct research

6. INTERNATIONAL TRANSFERS
Your data may be transferred to and processed in countries other than your country of residence. We ensure adequate safeguards including Standard Contractual Clauses.

7. RETENTION PERIODS
Different data types are retained for different periods:
- Account data: Duration of account + 30 days
- Transaction data: 7 years (legal requirement)
- Usage logs: 90 days
- Backup data: 30 days
- Anonymized data: Indefinitely

8. YOUR RIGHTS
You can:
- Request access to your data
- Request correction of inaccurate data
- Request deletion (right to be forgotten)
- Request data portability
- Withdraw consent
- Lodge complaints with regulators

9. SECURITY MEASURES
We implement:
- Encryption (AES-256)
- Access controls
- Audit logging
- Regular security assessments
- Incident response procedures

10. CONTACT FOR DATA QUESTIONS
Data Protection Officer: dpo@urplatform.com`,
    required: true,
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Agreement Checkbox Component
 */
function AgreementCheckbox({
  label,
  checked,
  onToggle,
  required,
}: {
  label: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
  required: boolean;
}) {
  const colors = useColors();

  return (
    <Pressable
      className="flex-row items-center gap-3 p-3 rounded-lg mb-2 active:opacity-70"
      onPress={() => onToggle(!checked)}
    >
      <View
        className={cn(
          "w-6 h-6 rounded border-2 items-center justify-center",
          checked ? "bg-primary border-primary" : "border-border"
        )}
      >
        {checked && <Text className="text-white font-bold">✓</Text>}
      </View>
      <View className="flex-1">
        <Text className="text-foreground font-medium">{label}</Text>
        {required && <Text className="text-xs text-error">*Required</Text>}
      </View>
    </Pressable>
  );
}

/**
 * Step Content Modal
 */
function StepContentModal({
  step,
  visible,
  onClose,
}: {
  step: OnboardingStep | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScreenContainer>
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2 flex-1">
            <Text className="text-3xl">{step?.icon}</Text>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-foreground">{step?.title}</Text>
              <Text className="text-sm text-muted">{step?.description}</Text>
            </View>
          </View>
          <Pressable onPress={onClose} className="p-2 active:opacity-70">
            <Text className="text-2xl">✕</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 mb-4">
          <Text className="text-foreground whitespace-pre-wrap leading-relaxed">
            {step?.content}
          </Text>
        </ScrollView>

        <Pressable
          className="bg-primary rounded-lg p-4 active:opacity-80"
          onPress={onClose}
        >
          <Text className="text-white font-semibold text-center">Close</Text>
        </Pressable>
      </ScreenContainer>
    </Modal>
  );
}

/**
 * User Onboarding Screen
 */
export function UserOnboardingScreen({
  onComplete,
}: {
  onComplete: (agreement: UserAgreement) => void;
}) {
  const colors = useColors();
  const [agreements, setAgreements] = useState<UserAgreement>({
    termsAccepted: false,
    privacyAccepted: false,
    educationalDisclaimerAccepted: false,
    dataProcessingAccepted: false,
    timestamp: new Date(),
  });

  const [selectedStep, setSelectedStep] = useState<OnboardingStep | null>(null);
  const [loading, setLoading] = useState(false);

  const allRequiredAccepted =
    agreements.termsAccepted &&
    agreements.privacyAccepted &&
    agreements.educationalDisclaimerAccepted &&
    agreements.dataProcessingAccepted;

  const handleComplete = async () => {
    if (!allRequiredAccepted) {
      alert("Please accept all required agreements to continue");
      return;
    }

    setLoading(true);
    try {
      // In production, this would call the onboarding tRPC endpoint
      // to record the user's acceptance
      // await trpc.onboarding.recordAgreement.mutate(agreements);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      onComplete(agreements);
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      alert("Failed to complete onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Welcome to UR</Text>
          <Text className="text-base text-muted">
            Please review and accept our agreements to get started
          </Text>
        </View>

        {/* Info Banner */}
        <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-800">
          <Text className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📋 Important Information
          </Text>
          <Text className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
            UR is an educational platform designed for entrepreneurs and learners. By using this
            app, you agree to use it only for legitimate educational and business purposes.
          </Text>
        </View>

        {/* Agreements */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">Required Agreements</Text>

          {ONBOARDING_STEPS.filter((s) => s.required && s.id !== "welcome").map((step) => (
            <View key={step.id} className="mb-3">
              <Pressable
                className="flex-row items-center justify-between p-3 rounded-lg bg-surface active:opacity-70"
                onPress={() => setSelectedStep(step)}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <Text className="text-2xl">{step.icon}</Text>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">{step.title}</Text>
                    <Text className="text-xs text-muted">{step.description}</Text>
                  </View>
                </View>
                <Text className="text-lg">→</Text>
              </Pressable>

              <AgreementCheckbox
                label={`I accept the ${step.title}`}
                checked={
                  step.id === "terms"
                    ? agreements.termsAccepted
                    : step.id === "privacy"
                      ? agreements.privacyAccepted
                      : step.id === "educational"
                        ? agreements.educationalDisclaimerAccepted
                        : agreements.dataProcessingAccepted
                }
                onToggle={(value) => {
                  if (step.id === "terms") {
                    setAgreements({ ...agreements, termsAccepted: value });
                  } else if (step.id === "privacy") {
                    setAgreements({ ...agreements, privacyAccepted: value });
                  } else if (step.id === "educational") {
                    setAgreements({ ...agreements, educationalDisclaimerAccepted: value });
                  } else if (step.id === "data-processing") {
                    setAgreements({ ...agreements, dataProcessingAccepted: value });
                  }
                }}
                required={step.required}
              />
            </View>
          ))}
        </View>

        {/* Completion Button */}
        <Pressable
          className={cn(
            "rounded-lg p-4 mb-4 active:opacity-80",
            allRequiredAccepted ? "bg-primary" : "bg-muted opacity-50"
          )}
          onPress={handleComplete}
          disabled={!allRequiredAccepted || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text className="text-white font-semibold text-center">
              {allRequiredAccepted ? "Get Started" : "Accept All to Continue"}
            </Text>
          )}
        </Pressable>

        {/* Footer */}
        <View className="items-center mb-6">
          <Text className="text-xs text-muted text-center">
            By clicking &quot;Get Started&quot;, you agree to our Terms of Service, Privacy Policy, and
            Educational Disclaimer.
          </Text>
        </View>
      </ScrollView>

      {/* Content Modal */}
      <StepContentModal
        step={selectedStep}
        visible={!!selectedStep}
        onClose={() => setSelectedStep(null)}
      />
    </ScreenContainer>
  );
}

export default UserOnboardingScreen;
