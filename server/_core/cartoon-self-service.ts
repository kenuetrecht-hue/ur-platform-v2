/**
 * Cartoon Self — each member may save only their own cartoon stand-in.
 */

import { TRPCError } from "@trpc/server";
import {
  CARTOON_SELF_ATTESTATION,
  CARTOON_SELF_LOOK_MAX,
  isCartoonSelfHairId,
  isCartoonSelfSettingId,
  isCartoonSelfShirtId,
  publicCartoonSelf,
  type CartoonSelfHairId,
  type CartoonSelfProfile,
  type CartoonSelfSettingId,
  type CartoonSelfShirtId,
} from "../../lib/cartoon-self";
import { sanitizeUserText } from "./input-sanitize";
import { assertNoAiTakeoverInMessage } from "./ai-control";

const selves = new Map<string, CartoonSelfProfile>();

export function _resetCartoonSelfForTests(): void {
  selves.clear();
}

export function getCartoonSelf(userId: string): CartoonSelfProfile | null {
  return selves.get(userId) ?? null;
}

export function saveCartoonSelf(params: {
  userId: string;
  isPlatformOwner: boolean;
  displayName: string;
  lookNotes: string;
  setting: string;
  hair: string;
  shirt: string;
  attestedOwnLikeness: true;
}): CartoonSelfProfile {
  if (!params.attestedOwnLikeness) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: CARTOON_SELF_ATTESTATION,
    });
  }
  if (!isCartoonSelfSettingId(params.setting)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Pick where you film." });
  }
  if (!isCartoonSelfHairId(params.hair)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Pick a hair look." });
  }
  if (!isCartoonSelfShirtId(params.shirt)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Pick a shirt color." });
  }
  const displayName = sanitizeUserText(params.displayName, 40);
  const lookNotes = sanitizeUserText(params.lookNotes, CARTOON_SELF_LOOK_MAX);
  if (displayName.length < 2) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Name the cartoon stand-in (your first name is enough)." });
  }
  if (lookNotes.length < 8) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Describe your look in a sentence — hair, clothes, what you usually film in.",
    });
  }
  assertNoAiTakeoverInMessage(`${displayName} ${lookNotes}`, params.isPlatformOwner);

  const profile: CartoonSelfProfile = {
    userId: params.userId,
    displayName,
    lookNotes,
    setting: params.setting as CartoonSelfSettingId,
    hair: params.hair as CartoonSelfHairId,
    shirt: params.shirt as CartoonSelfShirtId,
    attestedOwnLikeness: true,
    updatedAt: new Date().toISOString(),
  };
  selves.set(params.userId, profile);
  return profile;
}

export function publicSelfOrNull(userId: string) {
  const profile = getCartoonSelf(userId);
  return profile ? publicCartoonSelf(profile) : null;
}
