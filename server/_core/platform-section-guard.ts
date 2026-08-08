import { assertPlatformSectionEnabled } from "./platform-section-flags-service";
import type { PlatformSectionId } from "../../lib/platform-section-flags";

/** Gate a tRPC handler — platform owner always passes. */
export function assertSectionEnabledForRequest(
  sectionId: PlatformSectionId,
  isPlatformOwner: boolean,
): void {
  assertPlatformSectionEnabled(sectionId, isPlatformOwner);
}
