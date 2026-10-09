/** ElevenLabs and the phone voice. 1 is normal. This is a small ease, not a drawl. */
export const AI_VOICE_SPEED = 0.92;

/**
 * Slightly steadier than the persona's base, with a little warmth.
 * Stability is capped so the voice does not turn flat.
 */
export function smoothElevenLabsVoiceSettings(stability: number, similarityBoost: number) {
  const steadier = Math.round((stability + 0.06) * 100) / 100;
  return {
    stability: Math.min(0.84, steadier),
    similarity_boost: similarityBoost,
    style: 0.15,
    use_speaker_boost: true,
  };
}
