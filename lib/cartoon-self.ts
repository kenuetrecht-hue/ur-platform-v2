/**
 * Cartoon Self — a camera-shy creator's cartoon stand-in.
 * You film the lesson. The audience sees a cartoon of you, not your real face.
 * Not a photoreal clone, not someone else's likeness, not a Hollywood double.
 */

export const CARTOON_SELF_TITLE = "Cartoon Me";

export const CARTOON_SELF_RULE =
  "Film yourself in the yard (or anywhere) so the AI has your lesson. We do not put your real face on a fake person. " +
  "We draw a cartoon stand-in from the look you type — hair, clothes, where you filmed — then tell your lesson on your creator page. " +
  "Only your own likeness. You may not clone another person.";

export const CARTOON_SELF_ATTESTATION =
  "This is my own look and my own footage notes. I am not uploading someone else's face or voice to clone them.";

export const CARTOON_SELF_LOOK_MAX = 400;
export const CARTOON_FOOTAGE_MAX = 2000;

export const CARTOON_SELF_SETTINGS = [
  { id: "yard", label: "Yard / outdoors", ground: "#7cb342", sky: "#87ceeb" },
  { id: "kitchen", label: "Kitchen", ground: "#d4a574", sky: "#ffe0b2" },
  { id: "workshop", label: "Workshop / garage", ground: "#78909c", sky: "#b0bec5" },
  { id: "classroom", label: "Classroom", ground: "#90caf9", sky: "#e3f2fd" },
  { id: "shop", label: "Shop / store", ground: "#ffb74d", sky: "#fff3e0" },
] as const;

export const CARTOON_SELF_HAIR = [
  { id: "short", label: "Short hair" },
  { id: "long", label: "Long hair" },
  { id: "curly", label: "Curly hair" },
  { id: "bald", label: "Bald / close cut" },
  { id: "hat", label: "Hat / cap" },
] as const;

export const CARTOON_SELF_SHIRTS = [
  { id: "blue", label: "Blue shirt", color: "#1e88e5" },
  { id: "green", label: "Green shirt", color: "#43a047" },
  { id: "red", label: "Red shirt", color: "#e53935" },
  { id: "navy", label: "Navy work shirt", color: "#1a237e" },
  { id: "gray", label: "Gray shirt", color: "#546e7a" },
] as const;

export type CartoonSelfSettingId = (typeof CARTOON_SELF_SETTINGS)[number]["id"];
export type CartoonSelfHairId = (typeof CARTOON_SELF_HAIR)[number]["id"];
export type CartoonSelfShirtId = (typeof CARTOON_SELF_SHIRTS)[number]["id"];

export type CartoonSelfProfile = {
  userId: string;
  displayName: string;
  lookNotes: string;
  setting: CartoonSelfSettingId;
  hair: CartoonSelfHairId;
  shirt: CartoonSelfShirtId;
  attestedOwnLikeness: true;
  updatedAt: string;
};

export function isCartoonSelfSettingId(value: string): value is CartoonSelfSettingId {
  return CARTOON_SELF_SETTINGS.some((item) => item.id === value);
}

export function isCartoonSelfHairId(value: string): value is CartoonSelfHairId {
  return CARTOON_SELF_HAIR.some((item) => item.id === value);
}

export function isCartoonSelfShirtId(value: string): value is CartoonSelfShirtId {
  return CARTOON_SELF_SHIRTS.some((item) => item.id === value);
}

export function publicCartoonSelf(profile: CartoonSelfProfile) {
  return {
    displayName: profile.displayName,
    lookNotes: profile.lookNotes,
    setting: profile.setting,
    hair: profile.hair,
    shirt: profile.shirt,
    attestedOwnLikeness: true as const,
    updatedAt: profile.updatedAt,
  };
}

export type PublicCartoonSelf = ReturnType<typeof publicCartoonSelf>;

export function shirtColor(shirt: CartoonSelfShirtId): string {
  return CARTOON_SELF_SHIRTS.find((item) => item.id === shirt)?.color ?? "#1e88e5";
}

export function settingColors(setting: CartoonSelfSettingId): { sky: string; ground: string } {
  const row = CARTOON_SELF_SETTINGS.find((item) => item.id === setting);
  return { sky: row?.sky ?? "#87ceeb", ground: row?.ground ?? "#7cb342" };
}

export function buildFootageIdea(params: {
  characterName: string;
  lookNotes: string;
  setting: CartoonSelfSettingId;
  footageNotes: string;
}): string {
  const place = CARTOON_SELF_SETTINGS.find((item) => item.id === params.setting)?.label ?? "the yard";
  return (
    `Cartoon stand-in of ${params.characterName} teaching from ${place}. ` +
    `Look: ${params.lookNotes}. ` +
    `Lesson from their own footage: ${params.footageNotes}`
  ).slice(0, 2000);
}
