/** ISO ID-1 card (driver license / state ID). */
export const ID_CARD_ASPECT = 85.6 / 53.98;

export type AgeKycGuideKind = "id" | "selfie";

export type GuideBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type VideoCrop = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

/** Yellow card / face window inside the live camera view. */
export function guideBoxInView(
  viewWidth: number,
  viewHeight: number,
  kind: AgeKycGuideKind,
): GuideBox {
  const width = Math.max(1, viewWidth);
  const height = Math.max(1, viewHeight);
  if (kind === "selfie") {
    const size = Math.min(width, height) * 0.72;
    return {
      left: (width - size) / 2,
      top: (height - size) / 2,
      width: size,
      height: size,
    };
  }
  const maxW = width * 0.9;
  const maxH = height * 0.78;
  let boxW = maxW;
  let boxH = boxW / ID_CARD_ASPECT;
  if (boxH > maxH) {
    boxH = maxH;
    boxW = boxH * ID_CARD_ASPECT;
  }
  return {
    left: (width - boxW) / 2,
    top: (height - boxH) / 2,
    width: boxW,
    height: boxH,
  };
}

function mapViewPointToVideo(
  viewX: number,
  viewY: number,
  videoWidth: number,
  videoHeight: number,
  viewWidth: number,
  viewHeight: number,
): { x: number; y: number } {
  const scale = Math.max(viewWidth / videoWidth, viewHeight / videoHeight);
  const displayedW = videoWidth * scale;
  const displayedH = videoHeight * scale;
  const offsetX = (displayedW - viewWidth) / 2;
  const offsetY = (displayedH - viewHeight) / 2;
  return {
    x: (viewX + offsetX) / scale,
    y: (viewY + offsetY) / scale,
  };
}

/** Crop the raw camera frame to the same box the person lined up on screen. */
export function videoCropForCoverGuide(params: {
  videoWidth: number;
  videoHeight: number;
  viewWidth: number;
  viewHeight: number;
  kind: AgeKycGuideKind;
}): VideoCrop {
  const videoWidth = Math.max(1, params.videoWidth);
  const videoHeight = Math.max(1, params.videoHeight);
  const viewWidth = Math.max(1, params.viewWidth);
  const viewHeight = Math.max(1, params.viewHeight);
  const box = guideBoxInView(viewWidth, viewHeight, params.kind);
  const topLeft = mapViewPointToVideo(box.left, box.top, videoWidth, videoHeight, viewWidth, viewHeight);
  const bottomRight = mapViewPointToVideo(
    box.left + box.width,
    box.top + box.height,
    videoWidth,
    videoHeight,
    viewWidth,
    viewHeight,
  );
  const sx = Math.max(0, Math.min(videoWidth - 1, Math.round(topLeft.x)));
  const sy = Math.max(0, Math.min(videoHeight - 1, Math.round(topLeft.y)));
  const ex = Math.max(sx + 1, Math.min(videoWidth, Math.round(bottomRight.x)));
  const ey = Math.max(sy + 1, Math.min(videoHeight, Math.round(bottomRight.y)));
  return { sx, sy, sw: ex - sx, sh: ey - sy };
}
