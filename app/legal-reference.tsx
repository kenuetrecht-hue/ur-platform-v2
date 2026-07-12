import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";

interface LegalCase {
  caseId: string;
  title: string;
  jurisdiction: "STATE" | "FEDERAL";
  state?: string;
  year: number;
  summary: string;
  keyHolding: string;
  relevanceScore: number;
  citationFormat: string;
}

interface SearchResult {
  caseId: string;
  title: string;
  citationFormat: string;
  relevanceScore: number;
  jurisdiction: string;
}

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

const MOCK_CASES: LegalCase[] = [
  {
    caseId: "fed_001",
    title: "United States v. Microsoft Corporation",
    jurisdiction: "FEDERAL",
    year: 2001,
    summary: "Landmark antitrust case addressing monopolistic practices in the software industry",
    keyHolding: "Companies must not abuse market dominance to foreclose competition",
    relevanceScore: 0.95,
    citationFormat: "United States v. Microsoft Corp., 253 F.3d 34 (D.C. Cir. 2001)",
  },
  {
    caseId: "fed_002",
    title: "Carpenter v. United States",
    jurisdiction: "FEDERAL",
    year: 2018,
    summary: "Fourth Amendment privacy rights in the digital age regarding cell phone location data",
    keyHolding: "Law enforcement generally needs a warrant to access historical cell phone location records",
    relevanceScore: 0.92,
    citationFormat: "Carpenter v. United States, 138 S. Ct. 2206 (2018)",
  },
  {
    caseId: "state_in_001",
    title: "Hadley v. Hadley",
    jurisdiction: "STATE",
    state: "Indiana",
    year: 2015,
    summary: "Indiana contract law case addressing damages in breach of contract scenarios",
    keyHolding: "Damages must be reasonably foreseeable at the time of contract formation",
    relevanceScore: 0.88,
    citationFormat: "Hadley v. Hadley, 16 Ind. App. 3d 123 (Ind. App. 2015)",
  },
];

const LEGAL_DISCLAIMER = `⚠️ NOTICE & DISCLAIMER: This assistant is a synthetic AI model built strictly for educational and informational reference purposes. It is NOT an attorney, a law firm, or a licensed legal professional. No interaction with this AI constitutes legal advice, nor does it establish an attorney-client relationship. Always consult a qualified, licensed attorney in your jurisdiction for formal legal matters. UR LLC assumes no liability for the use or reference of this material.`;

export default function LegalReference() {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("Federal");
  const [jurisdiction, setJurisdiction] = useState<"STATE" | "FEDERAL" | "BOTH">("BOTH");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [showStateModal, setShowStateModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setTimeout(() => {
      // Mock search results
      const results: SearchResult[] = MOCK_CASES
        .filter((caseItem) => {
          const matchesJurisdiction =
            jurisdiction === "BOTH" ||
            (jurisdiction === "FEDERAL" && caseItem.jurisdiction === "FEDERAL") ||
            (jurisdiction === "STATE" && caseItem.jurisdiction === "STATE" && caseItem.state === selectedState);

          const matchesQuery =
            caseItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            caseItem.summary.toLowerCase().includes(searchQuery.toLowerCase());

          return matchesJurisdiction && matchesQuery;
        })
        .map((caseItem) => ({
          caseId: caseItem.caseId,
          title: caseItem.title,
          citationFormat: caseItem.citationFormat,
          relevanceScore: caseItem.relevanceScore,
          jurisdiction: caseItem.jurisdiction === "FEDERAL" ? "Federal" : `${caseItem.state} State`,
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      setSearchResults(results);
      setShowResults(true);
      setSearching(false);
    }, 1500);
  }, [searchQuery, selectedState, jurisdiction]);

  const handleSelectCase = useCallback((caseId: string) => {
    const fullCase = MOCK_CASES.find((c) => c.caseId === caseId);
    if (fullCase) {
      setSelectedCase(fullCase);
    }
  }, []);

  return (
    <ScreenContainer>
      {selectedCase ? (
        // Case Detail View
        <ScrollView style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable
              onPress={() => setSelectedCase(null)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", flex: 1, marginLeft: 12 }} numberOfLines={1}>
              Case Details
            </Text>
            <Pressable
              onPress={() => setShowDisclaimerModal(true)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="info.circle" size={24} color={colors.primary} />
            </Pressable>
          </View>

          {/* Content */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 16 }}>
            {/* Title */}
            <View>
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
                {selectedCase.title}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {selectedCase.citationFormat}
              </Text>
            </View>

            {/* Metadata */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                <View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Year</Text>
                  <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
                    {selectedCase.year}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Jurisdiction</Text>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                    {selectedCase.jurisdiction}
                    {selectedCase.state && ` (${selectedCase.state})`}
                  </Text>
                </View>
                <View>
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Relevance</Text>
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "700" }}>
                    {(selectedCase.relevanceScore * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Summary */}
            <View>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                Summary
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>
                {selectedCase.summary}
              </Text>
            </View>

            {/* Key Holding */}
            <View>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
                Key Holding
              </Text>
              <View
                style={{
                  backgroundColor: colors.primary + "15",
                  borderLeftWidth: 4,
                  borderLeftColor: colors.primary,
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>
                  {selectedCase.keyHolding}
                </Text>
              </View>
            </View>

            {/* Disclaimer */}
            <View
              style={{
                backgroundColor: colors.warning + "15",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.warning,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
                {LEGAL_DISCLAIMER}
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Pressable
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
                📚 Get Full Brief ($2.99)
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : showResults ? (
        // Search Results View
        <ScrollView style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable
              onPress={() => setShowResults(false)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
              {searchResults.length} Results
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Results List */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
            {searchResults.length === 0 ? (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 32,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>
                  No cases found. Try different keywords.
                </Text>
              </View>
            ) : (
              <FlatList
                scrollEnabled={true}
                data={searchResults}
                keyExtractor={(item) => item.caseId}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleSelectCase(item.caseId)}
                    style={({ pressed }) => ({
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 14,
                        fontWeight: "700",
                        marginBottom: 6,
                      }}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
                      {item.citationFormat}
                    </Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        {item.jurisdiction}
                      </Text>
                      <View
                        style={{
                          backgroundColor: colors.primary + "20",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "600" }}>
                          {(item.relevanceScore * 100).toFixed(0)}% match
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        </ScrollView>
      ) : (
        // Search View
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>
              ⚖️ Legal Reference
            </Text>
            <Pressable
              onPress={() => setShowDisclaimerModal(true)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="info.circle" size={24} color={colors.primary} />
            </Pressable>
          </View>

          {/* Search Section */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
              Search Query
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surface,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
                color: colors.foreground,
                fontSize: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              placeholder="e.g., 'contract law', 'digital rights', 'employment'..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Jurisdiction Selection */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
              Jurisdiction
            </Text>
            <FlatList
              scrollEnabled={true}
              data={[
                { label: "Federal Only", value: "FEDERAL" as const },
                { label: "State Only", value: "STATE" as const },
                { label: "Both", value: "BOTH" as const },
              ]}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setJurisdiction(item.value)}
                  style={({ pressed }) => ({
                    backgroundColor:
                      jurisdiction === item.value ? colors.primary : colors.surface,
                    borderRadius: 10,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor:
                      jurisdiction === item.value ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      color:
                        jurisdiction === item.value ? "#FFFFFF" : colors.foreground,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>

          {/* State Selection (if STATE or BOTH) */}
          {(jurisdiction === "STATE" || jurisdiction === "BOTH") && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                State
              </Text>
              <Pressable
                onPress={() => setShowStateModal(true)}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                  {selectedState}
                </Text>
                <IconSymbol name="chevron.right" size={20} color={colors.muted} />
              </Pressable>
            </View>
          )}

          {/* Search Button */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Pressable
              onPress={handleSearch}
              disabled={searching || !searchQuery.trim()}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                borderRadius: 10,
                paddingVertical: 14,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              {searching ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
                  🔍 Search Case Law
                </Text>
              )}
            </Pressable>
          </View>

          {/* Info Section */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
                💡 How It Works
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
                Search our database of state and federal case law. Results are ranked by relevance. Click any case to view full details and citations.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* State Selection Modal */}
      <Modal visible={showStateModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "80%",
            }}
          >
            <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>
                Select State
              </Text>
            </View>
            <FlatList
              data={US_STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setSelectedState(item);
                    setShowStateModal(false);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                    backgroundColor:
                      selectedState === item ? colors.primary + "15" : "transparent",
                  })}
                >
                  <Text
                    style={{
                      color:
                        selectedState === item ? colors.primary : colors.foreground,
                      fontSize: 14,
                      fontWeight: selectedState === item ? "700" : "500",
                    }}
                  >
                    {item}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Disclaimer Modal */}
      <Modal visible={showDisclaimerModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: 16,
              padding: 20,
              maxWidth: "90%",
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
              ⚖️ Legal Disclaimer
            </Text>
            <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
              {LEGAL_DISCLAIMER}
            </Text>
            <Pressable
              onPress={() => setShowDisclaimerModal(false)}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
                I Understand
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
