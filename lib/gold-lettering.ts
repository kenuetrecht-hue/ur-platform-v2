import { Text, TextInput } from "react-native";

/** Default body lettering is gold so it stays visible on the login wash. */
const GOLD = "#FFD700";

type TextWithDefaults = typeof Text & {
  defaultProps?: { style?: object | object[] };
};

function prependGold(component: TextWithDefaults) {
  const current = component.defaultProps ?? {};
  component.defaultProps = {
    ...current,
    style: [{ color: GOLD }, current.style].filter(Boolean),
  };
}

prependGold(Text as TextWithDefaults);
prependGold(TextInput as TextWithDefaults);
