import { ENV } from "./env";
import { listJoinedMembers } from "../db";
import { getOwnerCreatorRoster } from "./partner-program-service";
import { getCreatorAudienceCounts } from "./creator-audience-service";
import { buildMemberCensus } from "../../lib/owner-member-census";

/** Owner-only: who joined, who is on the site now, and creator vs member. */
export async function getOwnerMemberCensus() {
  const users = await listJoinedMembers();
  const roster = getOwnerCreatorRoster();
  return buildMemberCensus({
    users,
    creators: roster.creators.map((row) => {
      const audience = getCreatorAudienceCounts(row.userId);
      return {
        displayName: row.displayName,
        userEmail: row.userEmail,
        enrolledAt: row.enrolledAt,
        paidSubscriberCount: audience.paidSubscriberCount,
        unpaidFollowerCount: audience.freeFollowerCount,
      };
    }),
    ownerEmail: ENV.platformOwnerEmail ?? "",
  });
}
