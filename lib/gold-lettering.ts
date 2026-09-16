import { Text, TextInput } from "react-native";

/** Gold on the login wash and other colored backgrounds. */
export const LETTERING_ON_COLOR = "#FFD700";
/** Platform bluish-purple on white cards and other light surfaces. */
export const LETTERING_ON_WHITE = "#4F46E5";

type TextWithDefaults = typeof Text & {
  defaultProps?: { style?: object | object[] };
};

function applyTo(component: TextWithDefaults, color: string) {
  const current = component.defaultProps ?? {};
  component.defaultProps = {
    ...current,
    style: [{ color }],
  };
}

/** Default lettering follows the page: gold on color, bluish-purple on white. */
export function applyDefaultLettering(color: string) {
  applyTo(Text as TextWithDefaults, color);
  applyTo(TextInput as TextWithDefaults, color);
}

applyDefaultLettering(LETTERING_ON_COLOR);
