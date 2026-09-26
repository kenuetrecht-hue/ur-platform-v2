import { useEffect, useRef } from "react";
import { Platform, StyleSheet, TextInput, View, type StyleProp, type TextStyle } from "react-native";
import {
  CHAT_COMPOSER_FRAME,
  CHAT_COMPOSER_HEIGHT,
  CHAT_COMPOSER_INPUT,
  CHAT_COMPOSER_LINES,
  CHAT_COMPOSER_MAX_HEIGHT,
} from "@/lib/chat-composer-layout";

type ChatComposerInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  editable?: boolean;
  maxLength?: number;
  style?: StyleProp<TextStyle>;
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  /** Increment to move the cursor into this box (the Text button). */
  focusNonce?: number;
};

/**
 * Chat / prompt box for the website AND the phone app.
 * A fixed 300px frame keeps both sides the same size. The website also uses a
 * real <textarea> so React Native Web cannot collapse it to two rows.
 */
export function ChatComposerInput({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  editable = true,
  maxLength,
  style,
  onSubmitEditing,
  onFocus,
  focusNonce = 0,
}: ChatComposerInputProps) {
  const nativeRef = useRef<TextInput>(null);
  const webRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!focusNonce) return;
    if (Platform.OS === "web") webRef.current?.focus();
    else nativeRef.current?.focus();
  }, [focusNonce]);
  const flat = StyleSheet.flatten([CHAT_COMPOSER_INPUT, style]) ?? {};
  const height = typeof flat.height === "number" ? flat.height : CHAT_COMPOSER_HEIGHT;
  const maxHeight = typeof flat.maxHeight === "number" ? flat.maxHeight : CHAT_COMPOSER_MAX_HEIGHT;
  const frameStyle = [CHAT_COMPOSER_FRAME, { height, minHeight: height, maxHeight }];

  if (Platform.OS === "web") {
    return (
      <View style={frameStyle}>
        <textarea
          ref={webRef}
          className="ur-chat-composer"
          value={value}
          placeholder={placeholder}
          disabled={editable === false}
          maxLength={maxLength}
          rows={CHAT_COMPOSER_LINES}
          onChange={(event) => onChangeText(event.target.value)}
          onFocus={onFocus}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            event.preventDefault();
            onSubmitEditing?.();
          }}
          style={{
            display: "block",
            width: "100%",
            minWidth: 0,
            height: "100%",
            minHeight: height,
            maxHeight,
            borderRadius: typeof flat.borderRadius === "number" ? flat.borderRadius : 14,
            borderWidth: typeof flat.borderWidth === "number" ? flat.borderWidth : 1,
            borderStyle: "solid",
            borderColor: typeof flat.borderColor === "string" ? flat.borderColor : "#ddd6fe",
            backgroundColor: typeof flat.backgroundColor === "string" ? flat.backgroundColor : "#ffffff",
            color: typeof flat.color === "string" ? flat.color : "#4F46E5",
            ["--ur-composer-placeholder" as string]:
              placeholderTextColor ?? (typeof flat.color === "string" ? flat.color : "#4F46E5"),
            paddingLeft: 14,
            paddingRight: 14,
            paddingTop: 12,
            paddingBottom: 12,
            fontSize: 17,
            lineHeight: "24px",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </View>
    );
  }

  return (
    <View style={frameStyle}>
      <TextInput
        ref={nativeRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        editable={editable}
        maxLength={maxLength}
        multiline
        numberOfLines={CHAT_COMPOSER_LINES}
        scrollEnabled
        textAlignVertical="top"
        underlineColorAndroid="transparent"
        style={[
          CHAT_COMPOSER_INPUT,
          style,
          {
            flex: 1,
            minWidth: 0,
            width: "100%",
            height: "100%",
            minHeight: height,
            maxHeight,
          },
        ]}
        onSubmitEditing={onSubmitEditing}
        onFocus={onFocus}
      />
    </View>
  );
}
