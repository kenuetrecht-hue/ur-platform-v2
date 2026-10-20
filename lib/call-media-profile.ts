/** Sharp 720p for one face-to-face call. Capped so a weak link cannot run away. */
export const CALL_VIDEO_MAX_BITRATE = 2_500_000;
export const CALL_AUDIO_MAX_BITRATE = 48_000;
export const CALL_VIDEO_MAX_FRAMERATE = 24;

export const CALL_VIDEO_CONSTRAINTS = {
  facingMode: { ideal: "user" },
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: CALL_VIDEO_MAX_FRAMERATE, max: 30 },
};

export const CALL_AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: { ideal: 1 },
};
