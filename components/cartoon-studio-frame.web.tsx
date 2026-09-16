import { cartoonFrameDataUri } from "@/lib/cartoon-studio";

/** Same cartoon picture on the website as the phone app. */
export function CartoonStudioFrame({
  svg,
  title,
  tall = false,
}: {
  svg: string;
  title: string;
  tall?: boolean;
}) {
  return (
    <img
      src={cartoonFrameDataUri(svg)}
      alt={title}
      style={{
        width: "100%",
        maxHeight: tall ? 280 : 220,
        objectFit: "contain",
        borderRadius: 16,
        background: "#05070c",
      }}
    />
  );
}
