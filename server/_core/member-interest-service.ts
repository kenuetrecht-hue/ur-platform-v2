import { TRPCError } from "@trpc/server";
import {
  isMemberInterestId,
  MEMBER_INTERESTS,
  type MemberInterestId,
} from "../../lib/member-interests";

type SavedInterests = {
  userId: string;
  interests: MemberInterestId[];
  updatedAt: string;
};

const byUser = new Map<string, SavedInterests>();

export function listMemberInterestChoices() {
  return MEMBER_INTERESTS.map((item) => ({ id: item.id, label: item.label }));
}

export function getMemberInterests(userId: string): MemberInterestId[] {
  return byUser.get(userId)?.interests ?? [];
}

export function saveMemberInterests(userId: string, interests: string[]): SavedInterests {
  const unique = [...new Set(interests.map((id) => id.trim()))];
  if (unique.length < 1 || unique.length > 5) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Pick one to five interests.",
    });
  }
  if (unique.some((id) => !isMemberInterestId(id))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That interest is not on the list.",
    });
  }
  const saved: SavedInterests = {
    userId,
    interests: unique as MemberInterestId[],
    updatedAt: new Date().toISOString(),
  };
  byUser.set(userId, saved);
  return saved;
}

export function _resetMemberInterestsForTests(): void {
  byUser.clear();
}
