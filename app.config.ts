import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "UR Platform",
  slug: "ur-platform-v2",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "space.manus.ur.platform.v2"
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#ffffff",
      foregroundImage: "./assets/icon.png"
    },
    package: "space.manus.ur.platform.v2"
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/favicon.png"
  },
  plugins: [
    "expo-router",
    ["expo-splash-screen", {
      image: "./assets/splash.png",
      imageWidth: 200,
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    }]
  ]
};

export default config;
