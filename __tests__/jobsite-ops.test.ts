import { describe, expect, it, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { haversineMeters, isInsideGeofence } from "../lib/jobsite-geo";
import {
  _resetJobsiteStateForTests,
  checkoutInventoryToJob,
  clockIn,
  clockOut,
  createInventoryItem,
  createJobsiteCompany,
  createJobsiteJob,
  getMyJobsiteContext,
  ingestEquipmentPing,
  inviteJobsiteMember,
  listInventory,
  listJobsiteJobs,
  listJobsiteRoster,
  registerEquipment,
} from "../server/_core/jobsite-service";

const owner = { userId: "u-owner", email: "owner@co.test", displayName: "Pat Owner" };
const crew = { userId: "u-crew", email: "crew@co.test", displayName: "Sam Crew" };
const stranger = { userId: "u-other", email: "other@co.test", displayName: "Not Us" };

describe("jobsite geo", () => {
  it("treats a point inside the radius as on site", () => {
    expect(
      isInsideGeofence({
        lat: 39.7392,
        lng: -104.9903,
        centerLat: 39.7392,
        centerLng: -104.9903,
        radiusMeters: 150,
      }),
    ).toBe(true);
    expect(haversineMeters(39.7392, -104.9903, 39.75, -104.99)).toBeGreaterThan(150);
  });
});

describe("jobsite security and ops", () => {
  beforeEach(() => _resetJobsiteStateForTests());

  it("isolates companies and never trusts another user's clock", async () => {
    const company = createJobsiteCompany(owner, { name: "Apex Build" });
    const job = createJobsiteJob(owner, {
      companyId: company.id,
      name: "Main Street",
      address: "100 Main",
      lat: 39.7392,
      lng: -104.9903,
      radiusMeters: 200,
    });

    inviteJobsiteMember(owner, { companyId: company.id, email: crew.email!, role: "crew" });
    getMyJobsiteContext(crew);

    expect(() => listJobsiteJobs(stranger, company.id)).toThrow(TRPCError);

    const punch = clockIn(crew, {
      companyId: company.id,
      jobId: job.id,
      lat: 39.7392,
      lng: -104.9903,
    });
    expect(punch.userId).toBe(crew.userId);
    expect(punch.clockInOnSite).toBe(true);

    expect(() =>
      clockIn(stranger, { companyId: company.id, jobId: job.id, lat: 39.7392, lng: -104.9903 }),
    ).toThrow(/not on this company/);
  });

  it("rejects clock-in outside a required geofence", () => {
    const company = createJobsiteCompany(owner, {
      name: "Fence Co",
      requireOnSiteToClock: true,
    });
    const job = createJobsiteJob(owner, {
      companyId: company.id,
      name: "Site",
      address: "1 Site",
      lat: 39.7392,
      lng: -104.9903,
      radiusMeters: 80,
    });

    expect(() =>
      clockIn(owner, {
        companyId: company.id,
        jobId: job.id,
        lat: 40.0,
        lng: -105.0,
      }),
    ).toThrow(/geofence/);
  });

  it("moves inventory from yard to job and blocks other companies", () => {
    const a = createJobsiteCompany(owner, { name: "A" });
    const b = createJobsiteCompany(stranger, { name: "B" });
    const job = createJobsiteJob(owner, {
      companyId: a.id,
      name: "Job A",
      address: "A",
      lat: 39.7,
      lng: -104.9,
    });
    const item = createInventoryItem(owner, {
      companyId: a.id,
      sku: "MRTR",
      name: "Mortar",
      unit: "bag",
      qtyYard: 10,
    });

    const moved = checkoutInventoryToJob(owner, {
      companyId: a.id,
      itemId: item.id,
      jobId: job.id,
      source: "yard",
      quantity: 3,
    });
    expect(moved.qtyYard).toBe(7);
    expect(moved.qtyByJob[job.id]).toBe(3);

    expect(() => listInventory(stranger, a.id)).toThrow(TRPCError);
    expect(listInventory(stranger, b.id)).toHaveLength(0);
  });

  it("accepts equipment pings only with the hashed device token", () => {
    const company = createJobsiteCompany(owner, {
      name: "Iron",
      yardLat: 39.7392,
      yardLng: -104.9903,
    });
    const { equipment, deviceToken } = registerEquipment(owner, {
      companyId: company.id,
      name: "Excavator 12",
    });

    expect(() =>
      ingestEquipmentPing({
        equipmentId: equipment.id,
        deviceToken: "a".repeat(64),
        lat: 39.74,
        lng: -104.99,
      }),
    ).toThrow(/Invalid credentials/);

    const ok = ingestEquipmentPing({
      equipmentId: equipment.id,
      deviceToken,
      lat: 40.1,
      lng: -105.2,
    });
    expect(ok.ok).toBe(true);
  });

  it("flags an off-site clock when geofence is not required", () => {
    const company = createJobsiteCompany(owner, { name: "Flag Co" });
    const job = createJobsiteJob(owner, {
      companyId: company.id,
      name: "Site",
      address: "1",
      lat: 39.7392,
      lng: -104.9903,
      radiusMeters: 50,
    });
    const punch = clockIn(owner, {
      companyId: company.id,
      jobId: job.id,
      lat: 40.0,
      lng: -105.0,
    });
    expect(punch.flagged).toBe(true);
    const out = clockOut(owner, { companyId: company.id, lat: 40.0, lng: -105.0 });
    expect(out.clockOutAt).toBeTruthy();
    expect(listJobsiteRoster(owner, company.id).some((p) => p.id === punch.id)).toBe(true);
  });
});
