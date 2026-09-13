import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>UR Platform — AI specialists, creators, and 3D workspace</title>
        <meta
          name="description"
          content="UR Platform: 44+ secure AI specialists, creator tools, 3D workspace, loyalty rewards, shop, and social hub. Install the app from this website — no App Store or Google Play required."
        />
        <meta name="theme-color" content="#07080d" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="UR" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <ScrollViewStyleReset />
      </head>
      <body style={{ backgroundColor: "#07080d", margin: 0 }}>{children}</body>
    </html>
  );
}
