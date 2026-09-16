import { describe, expect, it } from "vitest";
import { getDeployedGitSha, getWebDeployHealth } from "../server/_core/deploy-info";

describe("deploy health stamp", () => {
  it("reads GIT_COMMIT_SHA for Railway health checks", () => {
    const previous = process.env.GIT_COMMIT_SHA;
    process.env.GIT_COMMIT_SHA = "06dbfd4test";
    expect(getDeployedGitSha()).toBe("06dbfd4test");
    expect(getWebDeployHealth().git).toBe("06dbfd4test");
    if (previous == null) delete process.env.GIT_COMMIT_SHA;
    else process.env.GIT_COMMIT_SHA = previous;
  });
});
