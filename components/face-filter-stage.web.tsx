import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { AppPressable } from "@/components/app-pressable";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { NoRefundPurchaseAck } from "@/components/no-refund-purchase-ack";
import { LETTERING_ON_COLOR, LETTERING_ON_WHITE } from "@/lib/gold-lettering";
import {
  FACE_FILTERS,
  drawFaceFilter,
  drawWeeklyFaceLook,
  isFaceFilterId,
  isWeeklyFilterShape,
  type FaceFilterId,
} from "@/lib/face-filters";
import { getClientPlatform, openExternalCheckoutUrl } from "@/lib/web-checkout";
import { trpc } from "@/lib/trpc";
import type { UsStateCode } from "@/lib/us-state-taxes";

export function FaceFilterStage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [filterId, setFilterId] = useState<string>("glasses");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [acceptedNoRefund, setAcceptedNoRefund] = useState(false);
  const [billingState, setBillingState] = useState<UsStateCode | null>(null);
  const catalog = trpc.faceFilters.catalog.useQuery();
  const buy = trpc.faceFilters.buy.useMutation({
    onSuccess: (res) => {
      if (res && "checkoutUrl" in res && res.checkoutUrl) {
        void openExternalCheckoutUrl(res.checkoutUrl);
      }
      if (res && "message" in res && res.message) setNotice(res.message);
      void catalog.refetch();
    },
    onError: (error) => setNotice(error.message),
  });

  const paintLook = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (isFaceFilterId(filterId)) {
      drawFaceFilter(ctx, width, height, filterId);
      return;
    }
    const look = catalog.data?.looks.find((row) => row.id === filterId);
    if (!look || !("shape" in look) || !("color" in look)) return;
    if (typeof look.shape === "string" && typeof look.color === "string" && isWeeklyFilterShape(look.shape)) {
      drawWeeklyFaceLook(ctx, width, height, { shape: look.shape, color: look.color });
    }
  };

  useEffect(() => {
    let stopped = false;
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setNotice("This browser cannot open the camera. Use the website on a phone or computer that has one.");
      return;
    }
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        void video.play();
        setReady(true);
      })
      .catch(() => {
        setNotice("The camera stayed off. Allow the camera for this site, then open Face filters again.");
      });
    return () => {
      stopped = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const paint = () => {
      const video = videoRef.current;
      const canvas = overlayRef.current;
      if (video && canvas && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          paintLook(ctx, canvas.width, canvas.height);
        }
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [filterId, catalog.data]);

  const takePicture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setNotice("Wait until your face is on the screen, then take the picture.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    paintLook(ctx, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/jpeg", 0.92);
    setShot(url);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ur-face-filter.jpg";
    link.click();
    setNotice("Saved to your downloads. UR does not keep this picture.");
  };

  return (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      <Text style={{ color: LETTERING_ON_COLOR, fontSize: 13, lineHeight: 19 }}>
        {catalog.data?.note ??
          "Six looks are free. Line your face up in the middle and take the picture. It stays on this device."}
      </Text>
      <View style={{ position: "relative", borderRadius: 16, overflow: "hidden", backgroundColor: "#111827", minHeight: 320 }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: "100%", height: 360, objectFit: "cover", transform: "scaleX(-1)", background: "#111827" }}
        />
        <canvas
          ref={overlayRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", transform: "scaleX(-1)", pointerEvents: "none" }}
        />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FACE_FILTERS.map((filter) => (
          <AppPressable
            key={filter.id}
            onPress={() => setFilterId(filter.id as FaceFilterId)}
            style={{
              backgroundColor: filterId === filter.id ? "#4F46E5" : "#FFFFFF",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: filterId === filter.id ? "#FFFFFF" : LETTERING_ON_WHITE, fontWeight: "800" }}>
              {filter.emoji} {filter.label}
            </Text>
          </AppPressable>
        ))}
      </View>
      <Text style={{ color: LETTERING_ON_COLOR, fontWeight: "800" }}>
        {catalog.data ? `${catalog.data.aiName} · ${catalog.data.setName}` : "This week's looks"}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(catalog.data?.looks ?? []).map((look) => (
          <AppPressable
            key={look.id}
            onPress={() => {
              if ("locked" in look && look.locked) {
                setNotice("These four change every Monday. $1.99 opens this week, or $2.99 opens 30 days.");
                return;
              }
              setFilterId(look.id);
            }}
            style={{
              backgroundColor: filterId === look.id ? "#4F46E5" : "#FFFFFF",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: filterId === look.id ? "#FFFFFF" : LETTERING_ON_WHITE, fontWeight: "800" }}>
              {look.emoji} {look.label}
              {"locked" in look && look.locked ? " · locked" : ""}
            </Text>
          </AppPressable>
        ))}
      </View>
      {catalog.data && !catalog.data.unlocked ? (
        <View style={{ gap: 8 }}>
          <NoRefundPurchaseAck checked={acceptedNoRefund} onToggle={() => setAcceptedNoRefund((value) => !value)} />
          <BillingStatePicker value={billingState} onChange={setBillingState} />
          <AppPressable
            disabled={!acceptedNoRefund || !billingState || buy.isPending}
            onPress={() => {
              if (!billingState) return;
              buy.mutate({
                planId: "week",
                stateCode: billingState,
                clientPlatform: getClientPlatform(),
                acceptedNoRefund: true,
              });
            }}
            style={{ backgroundColor: "#111827", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>{catalog.data.weekLabel}</Text>
          </AppPressable>
          <AppPressable
            disabled={!acceptedNoRefund || !billingState || buy.isPending}
            onPress={() => {
              if (!billingState) return;
              buy.mutate({
                planId: "month",
                stateCode: billingState,
                clientPlatform: getClientPlatform(),
                acceptedNoRefund: true,
              });
            }}
            style={{ backgroundColor: "#4F46E5", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>{catalog.data.monthLabel}</Text>
          </AppPressable>
        </View>
      ) : null}
      <AppPressable
        onPress={takePicture}
        disabled={!ready}
        style={{ backgroundColor: "#4F46E5", borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: ready ? 1 : 0.5 }}
      >
        <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Take picture</Text>
      </AppPressable>
      {notice ? <Text style={{ color: LETTERING_ON_COLOR, fontSize: 13 }}>{notice}</Text> : null}
      {shot ? (
        <img alt="Your filtered picture" src={shot} style={{ width: "100%", borderRadius: 12, maxHeight: 280, objectFit: "cover" }} />
      ) : null}
    </View>
  );
}
