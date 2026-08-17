import { Platform, type TextInput } from "react-native";
import type { RefObject } from "react";

function readDomValueByTestId(testId: string): string {
  if (typeof document === "undefined") return "";

  const root = document.querySelector(`[data-testid="${testId}"]`);
  if (!root) return "";

  const input =
    root instanceof HTMLInputElement
      ? root
      : root.querySelector("input");

  if (!(input instanceof HTMLInputElement)) return "";
  return input.value.trim();
}

/** Read the live DOM value — needed when browser autofill did not fire onChangeText. */
export function readWebTextInputValue(
  ref: RefObject<TextInput | null>,
  testId?: string,
): string {
  if (Platform.OS !== "web") return "";

  if (testId) {
    const fromDom = readDomValueByTestId(testId);
    if (fromDom) return fromDom;
  }

  if (!ref.current) return "";

  const node = ref.current as unknown as { value?: string; _node?: { value?: string } };
  if (typeof node.value === "string" && node.value.length > 0) {
    return node.value;
  }
  if (typeof node._node?.value === "string" && node._node.value.length > 0) {
    return node._node.value;
  }

  return "";
}
