import { useMemo } from "react";
import { Linking, Platform, Text, View, type TextStyle } from "react-native";
import {
  markdownToSpeech,
  parseSafeMarkdown,
  type MdBlock,
  type MdInline,
} from "@/lib/safe-markdown";

type Props = {
  text: string;
  color: string;
  fontSize?: number;
};

/**
 * The words the voice says, left on screen after playback.
 * Saved chat still stores the original reply; this view is how you re-read it.
 */
export function SpokenReplyText({ text, color, fontSize = 15 }: Props) {
  const spoken = useMemo(() => markdownToSpeech(text), [text]);
  const lineHeight = Math.round(fontSize * 1.45);
  return (
    <Text style={{ color, fontSize, lineHeight }} selectable>
      {spoken || text}
    </Text>
  );
}

/** Draws bold, lists, headings, and links from a message. The same component is used on the website and the phone. */
export function MarkdownMessage({ text, color, fontSize = 15 }: Props) {
  const blocks = useMemo(() => parseSafeMarkdown(text), [text]);
  const lineHeight = Math.round(fontSize * 1.45);
  if (blocks.length === 0) {
    return <Text style={{ color, fontSize, lineHeight }}>{text}</Text>;
  }
  return (
    <View style={{ gap: 8, alignSelf: "stretch", maxWidth: "100%" }}>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} color={color} fontSize={fontSize} lineHeight={lineHeight} />
      ))}
    </View>
  );
}

function BlockView({
  block,
  color,
  fontSize,
  lineHeight,
}: {
  block: MdBlock;
  color: string;
  fontSize: number;
  lineHeight: number;
}) {
  const textStyle = { color, fontSize, lineHeight };
  switch (block.kind) {
    case "paragraph":
      return <InlineText pieces={block.children} style={textStyle} />;
    case "heading":
      return (
        <InlineText
          pieces={block.children}
          style={{
            ...textStyle,
            fontWeight: "800",
            fontSize: block.depth <= 1 ? fontSize + 4 : block.depth === 2 ? fontSize + 2 : fontSize,
          }}
        />
      );
    case "code":
      return (
        <View style={{ borderRadius: 8, padding: 10, backgroundColor: "rgba(79,70,229,0.08)" }}>
          <Text
            style={{
              color,
              fontSize: Math.max(12, fontSize - 2),
              lineHeight,
              fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
            }}
          >
            {block.text}
          </Text>
        </View>
      );
    case "quote":
      return (
        <View style={{ borderLeftWidth: 3, borderLeftColor: color, paddingLeft: 10, gap: 6 }}>
          {block.children.map((child, index) => (
            <BlockView key={index} block={child} color={color} fontSize={fontSize} lineHeight={lineHeight} />
          ))}
        </View>
      );
    case "list":
      return (
        <View style={{ gap: 4 }}>
          {block.items.map((item, index) => (
            <View key={index} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
              <Text style={textStyle}>{block.ordered ? `${block.start + index}.` : "•"}</Text>
              <View style={{ flex: 1, gap: 4 }}>
                {item.map((child, childIndex) => (
                  <BlockView
                    key={childIndex}
                    block={child}
                    color={color}
                    fontSize={fontSize}
                    lineHeight={lineHeight}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    case "rule":
      return <View style={{ height: 1, backgroundColor: color, opacity: 0.35, marginVertical: 4 }} />;
    case "table":
      return (
        <View style={{ gap: 4 }}>
          <InlineText pieces={joinCells(block.header)} style={{ ...textStyle, fontWeight: "800" }} />
          {block.rows.map((row, index) => (
            <InlineText key={index} pieces={joinCells(row)} style={textStyle} />
          ))}
        </View>
      );
    default:
      return null;
  }
}

function joinCells(cells: MdInline[][]): MdInline[] {
  return cells.flatMap((cell, index) => {
    const gap: MdInline[] = index === 0 ? [] : [{ kind: "text", text: "  ·  " }];
    return [...gap, ...cell];
  });
}

function InlineText({ pieces, style }: { pieces: MdInline[]; style: TextStyle }) {
  return (
    <Text style={style}>
      {pieces.map((piece, index) => (
        <InlinePiece key={index} piece={piece} />
      ))}
    </Text>
  );
}

function InlinePiece({ piece }: { piece: MdInline }) {
  switch (piece.kind) {
    case "text":
      return piece.text;
    case "break":
      return "\n";
    case "code":
      return <Text style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}>{piece.text}</Text>;
    case "strong":
      return (
        <Text style={{ fontWeight: "800" }}>
          {piece.children.map((child, index) => (
            <InlinePiece key={index} piece={child} />
          ))}
        </Text>
      );
    case "em":
      return (
        <Text style={{ fontStyle: "italic" }}>
          {piece.children.map((child, index) => (
            <InlinePiece key={index} piece={child} />
          ))}
        </Text>
      );
    case "del":
      return (
        <Text style={{ textDecorationLine: "line-through" }}>
          {piece.children.map((child, index) => (
            <InlinePiece key={index} piece={child} />
          ))}
        </Text>
      );
    case "link":
      return (
        <Text
          style={{ textDecorationLine: "underline" }}
          onPress={
            piece.href
              ? () => {
                  void Linking.openURL(piece.href as string);
                }
              : undefined
          }
        >
          {piece.children.map((child, index) => (
            <InlinePiece key={index} piece={child} />
          ))}
        </Text>
      );
    default:
      return null;
  }
}
