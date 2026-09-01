import React, { useEffect, useRef } from "react";
import { Platform, View } from "react-native";

type WebLoginSubmitProps = {
  label: string;
  loadingLabel: string;
  loading: boolean;
  backgroundColor: string;
  onPress: () => void | Promise<void>;
  mountId?: string;
  buttonId?: string;
  testID?: string;
};

/**
 * Native DOM button for web login/signup — bypasses RN Web Pressable/hydration issues.
 * Mount point uses nativeID → id on the underlying div.
 */
export function WebLoginSubmit({
  label,
  loadingLabel,
  loading,
  backgroundColor,
  onPress,
  mountId = "web-login-submit-mount",
  buttonId = "web-login-submit-button",
  testID = "login-submit",
}: WebLoginSubmitProps) {
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const mount = document.getElementById(mountId);
    if (!mount) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = buttonId;
    button.setAttribute("data-testid", testID);
    button.style.width = "100%";
    button.style.marginTop = "24px";
    button.style.border = "none";
    button.style.borderRadius = "12px";
    button.style.padding = "16px";
    button.style.fontSize = "16px";
    button.style.fontWeight = "600";
    button.style.color = "#ffffff";
    button.style.fontFamily = "inherit";
    button.style.backgroundColor = backgroundColor;

    const handleClick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled) return;
      void onPressRef.current();
    };

    button.addEventListener("click", handleClick);
    mount.appendChild(button);

    return () => {
      button.removeEventListener("click", handleClick);
      if (button.parentElement === mount) {
        mount.removeChild(button);
      }
    };
  }, [backgroundColor, mountId, buttonId, testID]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const button = document.getElementById(buttonId);
    if (!(button instanceof HTMLButtonElement)) return;
    button.textContent = loading ? loadingLabel : label;
    button.disabled = loading;
    button.style.opacity = loading ? "0.6" : "1";
    button.style.cursor = loading ? "default" : "pointer";
    button.style.backgroundColor = backgroundColor;
  }, [label, loadingLabel, loading, backgroundColor, buttonId]);

  if (Platform.OS !== "web") {
    return null;
  }

  return <View nativeID={mountId} collapsable={false} />;
}
