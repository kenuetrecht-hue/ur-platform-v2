import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
  Share,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { router } from "expo-router";

interface WritingDocument {
  id: string;
  title: string;
  type: "book" | "poem" | "essay" | "document";
  content: string;
  wordCount: number;
  createdAt: number;
  updatedAt: number;
  status: "draft" | "published" | "archived";
  price?: number;
  sales?: number;
}

interface WritingPrompt {
  id: string;
  category: string;
  prompt: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

const WRITING_PROMPTS: WritingPrompt[] = [
  {
    id: "prompt_001",
    category: "Fiction",
    prompt: "Write about a character who discovers they have a hidden talent",
    difficulty: "beginner",
  },
  {
    id: "prompt_002",
    category: "Poetry",
    prompt: "Create a poem about the changing seasons using sensory details",
    difficulty: "intermediate",
  },
  {
    id: "prompt_003",
    category: "Essay",
    prompt: "Explore how technology has changed human relationships",
    difficulty: "advanced",
  },
  {
    id: "prompt_004",
    category: "Fiction",
    prompt: "Write a dialogue between two characters with conflicting goals",
    difficulty: "beginner",
  },
  {
    id: "prompt_005",
    category: "Poetry",
    prompt: "Write a poem that tells a complete story in 20 lines",
    difficulty: "intermediate",
  },
];

const MOCK_DOCUMENTS: WritingDocument[] = [
  {
    id: "doc_001",
    title: "The Journey Begins",
    type: "book",
    content: "Chapter 1: A New Beginning\n\nThe morning sun filtered through the old wooden window...",
    wordCount: 2847,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
    status: "draft",
  },
  {
    id: "doc_002",
    title: "Moonlight Reflections",
    type: "poem",
    content: "In the silence of the night,\nWhen stars pierce the darkness...",
    wordCount: 156,
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
    status: "published",
    price: 2.99,
    sales: 47,
  },
];

export default function WritingAssistant() {
  const colors = useColors();
  const [documents, setDocuments] = useState<WritingDocument[]>(MOCK_DOCUMENTS);
  const [selectedDoc, setSelectedDoc] = useState<WritingDocument | null>(null);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const [editingContent, setEditingContent] = useState("");
  const [documentType, setDocumentType] = useState<"book" | "poem" | "essay" | "document">("book");
  const [documentTitle, setDocumentTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreateDocument = useCallback(
    (type: "book" | "poem" | "essay" | "document") => {
      setDocumentType(type);
      setDocumentTitle("");
      setEditingContent("");
      setShowNewDocModal(true);
    },
    []
  );

  const handleSaveDocument = useCallback(async () => {
    if (!documentTitle.trim() || !editingContent.trim()) return;

    setSaving(true);
    setTimeout(() => {
      const newDoc: WritingDocument = {
        id: `doc_${Date.now()}`,
        title: documentTitle,
        type: documentType,
        content: editingContent,
        wordCount: editingContent.split(/\s+/).length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "draft",
      };

      setDocuments((prev) => [newDoc, ...prev]);
      setShowNewDocModal(false);
      setSaving(false);
      setSelectedDoc(newDoc);
    }, 1000);
  }, [documentTitle, editingContent, documentType]);

  const handleApplyPrompt = useCallback((prompt: WritingPrompt) => {
    setEditingContent((prev) => `${prev}\n\n📝 Prompt: ${prompt.prompt}\n\n`);
    setShowPromptsModal(false);
  }, []);

  const handlePublishDocument = useCallback(async () => {
    if (!selectedDoc) return;

    setSaving(true);
    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === selectedDoc.id
            ? { ...doc, status: "published" as const, price: 2.99, sales: 0 }
            : doc
        )
      );
      setSelectedDoc((prev) =>
        prev ? { ...prev, status: "published", price: 2.99, sales: 0 } : null
      );
      setSaving(false);
    }, 1000);
  }, [selectedDoc]);

  const handleShareDocument = useCallback(async () => {
    if (!selectedDoc) return;

    try {
      await Share.share({
        message: `Check out "${selectedDoc.title}" by me on UR Media!`,
        url: `https://urplatform.com/document/${selectedDoc.id}`,
        title: selectedDoc.title,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  }, [selectedDoc]);

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      book: "📖",
      poem: "✨",
      essay: "📝",
      document: "📄",
    };
    return icons[type] || "📄";
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <ScreenContainer>
      {selectedDoc ? (
        // Document Editor View
        <View style={{ flex: 1 }}>
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
              onPress={() => setSelectedDoc(null)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
            </Pressable>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 16,
                fontWeight: "700",
                flex: 1,
                marginLeft: 12,
              }}
              numberOfLines={1}
            >
              {selectedDoc.title}
            </Text>
            <Pressable
              onPress={handleShareDocument}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="square.and.arrow.up" size={20} color={colors.primary} />
            </Pressable>
          </View>

          {/* Stats */}
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 16,
              paddingVertical: 12,
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
                {selectedDoc.wordCount}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Words</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
                {getTypeIcon(selectedDoc.type)} {selectedDoc.type}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Type</Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
                {selectedDoc.status}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>Status</Text>
            </View>
          </View>

          {/* Content Editor */}
          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12 }}>
            <TextInput
              style={{
                color: colors.foreground,
                fontSize: 14,
                lineHeight: 22,
                fontFamily: "Menlo",
              }}
              multiline
              value={editingContent || selectedDoc.content}
              onChangeText={setEditingContent}
              placeholder="Start writing..."
              placeholderTextColor={colors.muted}
            />
          </ScrollView>

          {/* Action Buttons */}
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 16,
              paddingVertical: 12,
              gap: 8,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Pressable
              onPress={() => setShowPromptsModal(true)}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
                💡 Prompts
              </Text>
            </Pressable>

            {selectedDoc.status === "draft" ? (
              <Pressable
                onPress={handlePublishDocument}
                disabled={saving}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>
                    🚀 Publish
                  </Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>
                  💰 ${selectedDoc.price} • {selectedDoc.sales} sales
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        // Documents List View
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
              ✍️ Writing Assistant
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Quick Create */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 8 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
              Start Writing
            </Text>
            <FlatList
              scrollEnabled={true}
              data={[
                { type: "book" as const, label: "📖 Book", emoji: "📖" },
                { type: "poem" as const, label: "✨ Poem", emoji: "✨" },
                { type: "essay" as const, label: "📝 Essay", emoji: "📝" },
                { type: "document" as const, label: "📄 Document", emoji: "📄" },
              ]}
              numColumns={2}
              columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
              keyExtractor={(item) => item.type}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleCreateDocument(item.type)}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    paddingVertical: 16,
                    alignItems: "center",
                    opacity: pressed ? 0.8 : 1,
                    borderWidth: 1,
                    borderColor: colors.border,
                  })}
                >
                  <Text style={{ fontSize: 28, marginBottom: 6 }}>{item.emoji}</Text>
                  <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>

          {/* My Documents */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
              My Documents
            </Text>
            {documents.length === 0 ? (
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
                  No documents yet. Start writing!
                </Text>
              </View>
            ) : (
              <FlatList
                scrollEnabled={true}
                data={documents}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setSelectedDoc(item)}
                    style={({ pressed }) => ({
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <Text style={{ fontSize: 18 }}>{getTypeIcon(item.type)}</Text>
                          <Text
                            style={{
                              color: colors.foreground,
                              fontSize: 14,
                              fontWeight: "700",
                            }}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                        </View>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>
                          {item.wordCount} words • {formatDate(item.updatedAt)}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor:
                            item.status === "published" ? colors.primary + "20" : colors.surface,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          marginLeft: 8,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              item.status === "published" ? colors.primary : colors.muted,
                            fontSize: 11,
                            fontWeight: "600",
                          }}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>
                    {item.status === "published" && item.sales !== undefined && (
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "600" }}>
                        💰 ${item.price} • {item.sales} sales
                      </Text>
                    )}
                  </Pressable>
                )}
              />
            )}
          </View>
        </ScrollView>
      )}

      {/* New Document Modal */}
      <Modal visible={showNewDocModal} transparent animationType="slide">
        <ScreenContainer>
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
              onPress={() => setShowNewDocModal(false)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <IconSymbol name="xmark" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>
              New {documentType}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 16 }}>
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
              Title
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surface,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
                color: colors.foreground,
                fontSize: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              placeholder="Enter title..."
              placeholderTextColor={colors.muted}
              value={documentTitle}
              onChangeText={setDocumentTitle}
            />

            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
              Content
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surface,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 12,
                color: colors.foreground,
                fontSize: 14,
                minHeight: 300,
                borderWidth: 1,
                borderColor: colors.border,
                textAlignVertical: "top",
              }}
              placeholder="Start writing..."
              placeholderTextColor={colors.muted}
              value={editingContent}
              onChangeText={setEditingContent}
              multiline
            />
          </ScrollView>

          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: 16,
              paddingVertical: 12,
              gap: 8,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Pressable
              onPress={() => setShowNewDocModal(false)}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "700" }}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSaveDocument}
              disabled={saving || !documentTitle.trim() || !editingContent.trim()}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: colors.primary,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
                  Save Draft
                </Text>
              )}
            </Pressable>
          </View>
        </ScreenContainer>
      </Modal>

      {/* Writing Prompts Modal */}
      <Modal visible={showPromptsModal} transparent animationType="fade">
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
                Writing Prompts
              </Text>
            </View>
            <FlatList
              data={WRITING_PROMPTS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleApplyPrompt(item)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600", marginBottom: 4 }}>
                    {item.category} • {item.difficulty}
                  </Text>
                  <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>
                    {item.prompt}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
