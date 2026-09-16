import { useState } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";

/** Same cartoon picture on the phone app and the website. */
export function CartoonStudioFrame({
  svg,
  title,
  tall = false,
}: {
  svg: string;
  title: string;
  tall?: boolean;
}) {
  const [width, setWidth] = useState(320);
  const height = Math.min(tall ? 280 : 220, Math.round(width * (9 / 16)));

  return (
    <View
      accessibilityLabel={title}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next > 0 && Math.abs(next - width) > 1) setWidth(next);
      }}
      style={{
        width: "100%",
        height,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#05070c",
      }}
    >
      {svg ? <SvgXml xml={svg} width={width} height={height} /> : null}
    </View>
  );
}
