import { Text, TextInput } from "react-native";

/** Gold on the login wash and every other colored background. */
export const LETTERING_ON_COLOR = "#FFD700";
/** Platform bluish-purple on white cards only. */
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

/** Default lettering is bluish-purple on white cards. Colored wash sets `colors.gold`. */
export function applyDefaultLettering(color: string = LETTERING_ON_WHITE) {
  applyTo(Text as TextWithDefaults, color);
  applyTo(TextInput as TextWithDefaults, color);
}

applyDefaultLettering(LETTERING_ON_WHITE);
