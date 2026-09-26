/** Stable 1-to-1 settings. 720p at 24fps stays clearer on home Wi-Fi than an uncapped camera. */
export const CALL_VIDEO_MAX_BITRATE = 1_200_000;
export const CALL_AUDIO_MAX_BITRATE = 48_000;
export const CALL_VIDEO_MAX_FRAMERATE = 24;

export const CALL_VIDEO_CONSTRAINTS = {
  facingMode: { ideal: "user" },
  width: { ideal: 1280, max: 1280 },
  height: { ideal: 720, max: 720 },
  frameRate: { ideal: CALL_VIDEO_MAX_FRAMERATE, max: 30 },
};

export const CALL_AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: { ideal: 1 },
};
