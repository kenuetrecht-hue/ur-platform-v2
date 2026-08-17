import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  PLATFORM_TERMS_SECTIONS,
  TERMS_BILLING_ENTITY,
  TERMS_EFFECTIVE_DATE,
  TERMS_CHECKOUT_ACKNOWLEDGMENT,
} from "@/lib/platform-terms-of-use";

type Props = {
  compact?: boolean;
  showCheckoutAck?: boolean;
};

/** Readable Terms of Use — shown in Profile and before purchase. */
export function PlatformTermsPanel({ compact = false, showCheckoutAck = false }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.wrap, compact ? styles.compact : null]}>
      <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: compact ? 16 : 20 }}>
        Terms of Use
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
        Effective {TERMS_EFFECTIVE_DATE} · {TERMS_BILLING_ENTITY}
      </Text>

      {showCheckoutAck ? (
        <View
          style={[
            styles.highlight,
            { borderColor: colors.primary, backgroundColor: `${colors.primary}12` },
          ]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
            Before you pay
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6, lineHeight: 17 }}>
            {TERMS_CHECKOUT_ACKNOWLEDGMENT}
          </Text>
        </View>
      ) : null}

      {PLATFORM_TERMS_SECTIONS.map((section) => (
        <View
          key={section.id}
          style={[styles.section, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 14 }}>
            {section.title}
          </Text>
          {section.bullets.map((bullet) => (
            <Text
              key={bullet.slice(0, 48)}
              style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 }}
            >
              • {bullet}
            </Text>
          ))}
        </View>
      ))}

      <Text style={{ color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 8 }}>
        Questions: support@urplatform.llc · By using UR Platform you acknowledge these terms.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  compact: { gap: 8 },
  highlight: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
});

/** Scrollable full-page terms for Profile route. */
export function PlatformTermsScreenContent() {
  const colors = useColors();
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 4 }}>
        <PlatformTermsPanel showCheckoutAck />
      </View>
    </ScrollView>
  );
}
