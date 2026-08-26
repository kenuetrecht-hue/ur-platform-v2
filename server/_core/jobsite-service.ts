/**
 * Jobsite ↔ office — clock, inventory, equipment pings, daily logs.
 * Every record is company-scoped. Actor identity always comes from ctx.user.
 */

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { TRPCError } from "@trpc/server";
import { sanitizeUserText } from "./input-sanitize";
import { haversineMeters, isInsideGeofence, isValidLatitude, isValidLongitude } from "../../lib/jobsite-geo";
import type {
  JobsiteCompany,
  JobsiteDailyLog,
  JobsiteEquipment,
  JobsiteEquipmentAlert,
  JobsiteInventoryItem,
  JobsiteInventoryMove,
  JobsiteJob,
  JobsiteMember,
  JobsiteOfficeDashboard,
  JobsitePunch,
  JobsitePunchListItem,
  JobsiteRole,
  JobsiteSafetyReport,
  InventorySource,
} from "../../lib/jobsite-types";

type Actor = {
  userId: string;
  email?: string | null;
  displayName?: string | null;
};

type StoredEquipment = JobsiteEquipment & { tokenHash?: string };

const companies = new Map<string, JobsiteCompany>();
const members = new Map<string, JobsiteMember>();
const jobs = new Map<string, JobsiteJob>();
const punches = new Map<string, JobsitePunch>();
const inventory = new Map<string, JobsiteInventoryItem>();
const inventoryMoves = new Map<string, JobsiteInventoryMove>();
const equipment = new Map<string, StoredEquipment>();
const dailyLogs = new Map<string, JobsiteDailyLog>();
const punchList = new Map<string, JobsitePunchListItem>();
const safetyReports = new Map<string, JobsiteSafetyReport>();

const LOW_STOCK_THRESHOLD = 3;
const AFTER_HOURS_START = 19;
const AFTER_HOURS_END = 6;
const AFTER_HOURS_MOVE_METERS = 80;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function displayFromActor(actor: Actor): string {
  const name = actor.displayName?.trim();
  if (name) return sanitizeUserText(name, 80);
  const local = actor.email?.split("@")[0];
  return sanitizeUserText(local || "Crew", 80);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function tokenMatches(storedHash: string | undefined, presented: string): boolean {
  const presentedHash = hashToken(presented);
  const a = Buffer.from(storedHash ?? hashToken("missing-equipment-token"), "hex");
  const b = Buffer.from(presentedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function requireCoords(lat?: number, lng?: number): { lat: number; lng: number } | undefined {
  if (lat == null || lng == null) return undefined;
  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid coordinates." });
  }
  return { lat, lng };
}

function getCompany(companyId: string): JobsiteCompany {
  const company = companies.get(companyId);
  if (!company) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Company not found." });
  }
  return company;
}

function getJobInCompany(jobId: string, companyId: string): JobsiteJob {
  const job = jobs.get(jobId);
  if (!job || job.companyId !== companyId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
  }
  return job;
}

function activeMemberForUser(companyId: string, userId: string): JobsiteMember | undefined {
  return [...members.values()].find(
    (m) => m.companyId === companyId && m.userId === userId && m.status === "active",
  );
}

function requireMember(companyId: string, actor: Actor): JobsiteMember {
  const member = activeMemberForUser(companyId, actor.userId);
  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You are not on this company." });
  }
  return member;
}

function requireManager(companyId: string, actor: Actor): JobsiteMember {
  const member = requireMember(companyId, actor);
  if (member.role === "crew") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Office managers only." });
  }
  return member;
}

function acceptMatchingInvites(actor: Actor): void {
  const email = actor.email ? normalizeEmail(actor.email) : "";
  if (!email) return;
  for (const member of members.values()) {
    if (member.status !== "pending") continue;
    if (member.email !== email) continue;
    member.userId = actor.userId;
    member.status = "active";
    if (actor.displayName?.trim()) {
      member.displayName = displayFromActor(actor);
    }
  }
}

function publicEquipment(row: StoredEquipment): JobsiteEquipment {
  const { tokenHash: _token, ...rest } = row;
  return { ...rest, hasDeviceToken: Boolean(tokenHashOn(row)) };
}

function tokenHashOn(row: StoredEquipment): string | undefined {
  return row.tokenHash;
}

function evaluateEquipmentAlerts(
  company: JobsiteCompany,
  previous: JobsiteEquipment["lastPing"] | undefined,
  next: { lat: number; lng: number; at: string },
): JobsiteEquipmentAlert[] {
  const alerts: JobsiteEquipmentAlert[] = [];
  if (
    company.yardLat != null &&
    company.yardLng != null &&
    !isInsideGeofence({
      lat: next.lat,
      lng: next.lng,
      centerLat: company.yardLat,
      centerLng: company.yardLng,
      radiusMeters: company.yardRadiusMeters,
    })
  ) {
    alerts.push({
      type: "left_yard",
      at: next.at,
      message: `${company.name} yard geofence — machine is outside the yard.`,
    });
  }

  const hour = new Date(next.at).getUTCHours();
  const afterHours = hour >= AFTER_HOURS_START || hour < AFTER_HOURS_END;
  if (afterHours && previous) {
    const moved = haversineMeters(previous.lat, previous.lng, next.lat, next.lng);
    if (moved >= AFTER_HOURS_MOVE_METERS) {
      alerts.push({
        type: "after_hours_move",
        at: next.at,
        message: `After-hours movement of ${Math.round(moved)} meters.`,
      });
    }
  }
  return alerts;
}

export function _resetJobsiteStateForTests(): void {
  companies.clear();
  members.clear();
  jobs.clear();
  punches.clear();
  inventory.clear();
  inventoryMoves.clear();
  equipment.clear();
  dailyLogs.clear();
  punchList.clear();
  safetyReports.clear();
}

export function getMyJobsiteContext(actor: Actor): {
  companies: Array<{ company: JobsiteCompany; role: JobsiteRole }>;
} {
  acceptMatchingInvites(actor);
  const mine = [...members.values()].filter(
    (m) => m.userId === actor.userId && m.status === "active",
  );
  return {
    companies: mine.map((m) => ({
      company: getCompany(m.companyId),
      role: m.role,
    })),
  };
}

export function createJobsiteCompany(
  actor: Actor,
  input: { name: string; yardLat?: number; yardLng?: number; requireOnSiteToClock?: boolean },
): JobsiteCompany {
  const alreadyOwns = [...companies.values()].some((c) => c.ownerUserId === actor.userId);
  if (alreadyOwns) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "You already own a jobsite company.",
    });
  }
  const yard = requireCoords(input.yardLat, input.yardLng);
  const now = nowIso();
  const company: JobsiteCompany = {
    id: randomUUID(),
    name: sanitizeUserText(input.name, 120),
    ownerUserId: actor.userId,
    yardLat: yard?.lat,
    yardLng: yard?.lng,
    yardRadiusMeters: 200,
    requireOnSiteToClock: Boolean(input.requireOnSiteToClock),
    createdAt: now,
  };
  companies.set(company.id, company);
  const ownerMemberId = randomUUID();
  members.set(ownerMemberId, {
    id: ownerMemberId,
    companyId: company.id,
    userId: actor.userId,
    email: actor.email ? normalizeEmail(actor.email) : `${actor.userId}@owner.local`,
    displayName: displayFromActor(actor),
    role: "company_owner",
    status: "active",
    createdAt: now,
  });
  return company;
}

export function updateJobsiteCompany(
  actor: Actor,
  input: {
    companyId: string;
    name?: string;
    yardLat?: number;
    yardLng?: number;
    yardRadiusMeters?: number;
    requireOnSiteToClock?: boolean;
  },
): JobsiteCompany {
  requireManager(input.companyId, actor);
  const company = getCompany(input.companyId);
  if (input.name) company.name = sanitizeUserText(input.name, 120);
  const yard = requireCoords(input.yardLat, input.yardLng);
  if (yard) {
    company.yardLat = yard.lat;
    company.yardLng = yard.lng;
  }
  if (input.yardRadiusMeters != null) {
    company.yardRadiusMeters = Math.min(5000, Math.max(25, Math.round(input.yardRadiusMeters)));
  }
  if (input.requireOnSiteToClock != null) {
    company.requireOnSiteToClock = input.requireOnSiteToClock;
  }
  companies.set(company.id, company);
  return company;
}

export function inviteJobsiteMember(
  actor: Actor,
  input: { companyId: string; email: string; role: Exclude<JobsiteRole, "company_owner">; displayName?: string },
): JobsiteMember {
  requireManager(input.companyId, actor);
  const email = normalizeEmail(input.email);
  const duplicate = [...members.values()].find(
    (m) => m.companyId === input.companyId && m.email === email && m.status !== "revoked",
  );
  if (duplicate) {
    throw new TRPCError({ code: "CONFLICT", message: "That email is already on this company." });
  }
  const memberId = randomUUID();
  const member: JobsiteMember = {
    id: memberId,
    companyId: input.companyId,
    email,
    displayName: sanitizeUserText(input.displayName || email.split("@")[0] || "Crew", 80),
    role: input.role,
    status: "pending",
    createdAt: nowIso(),
  };
  members.set(memberId, member);
  return member;
}

export function revokeJobsiteMember(actor: Actor, input: { companyId: string; memberId: string }): void {
  requireManager(input.companyId, actor);
  const member = members.get(input.memberId);
  if (!member || member.companyId !== input.companyId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
  }
  if (member.role === "company_owner") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cannot revoke the company owner." });
  }
  member.status = "revoked";
  members.set(member.id, member);
}

export function listJobsiteMembers(actor: Actor, companyId: string): JobsiteMember[] {
  const member = requireMember(companyId, actor);
  const rows = [...members.values()].filter((m) => m.companyId === companyId && m.status !== "revoked");
  if (member.role === "crew") {
    return rows
      .filter((m) => m.status === "active")
      .map((m) => ({ ...m, email: m.userId === actor.userId ? m.email : "" }));
  }
  return rows;
}

export function createJobsiteJob(
  actor: Actor,
  input: { companyId: string; name: string; address: string; lat: number; lng: number; radiusMeters?: number },
): JobsiteJob {
  requireManager(input.companyId, actor);
  const coords = requireCoords(input.lat, input.lng);
  if (!coords) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Job pin requires coordinates." });
  }
  const job: JobsiteJob = {
    id: randomUUID(),
    companyId: input.companyId,
    name: sanitizeUserText(input.name, 120),
    address: sanitizeUserText(input.address, 200),
    lat: coords.lat,
    lng: coords.lng,
    radiusMeters: Math.min(2000, Math.max(25, Math.round(input.radiusMeters ?? 150))),
    createdAt: nowIso(),
  };
  jobs.set(job.id, job);
  return job;
}

export function listJobsiteJobs(actor: Actor, companyId: string): JobsiteJob[] {
  requireMember(companyId, actor);
  return [...jobs.values()].filter((j) => j.companyId === companyId);
}

export function clockIn(
  actor: Actor,
  input: { companyId: string; jobId: string; lat?: number; lng?: number },
): JobsitePunch {
  const member = requireMember(input.companyId, actor);
  const company = getCompany(input.companyId);
  const job = getJobInCompany(input.jobId, input.companyId);
  const open = [...punches.values()].find(
    (p) => p.userId === actor.userId && p.companyId === input.companyId && !p.clockOutAt,
  );
  if (open) {
    throw new TRPCError({ code: "CONFLICT", message: "You are already clocked in. Clock out first." });
  }
  const coords = requireCoords(input.lat, input.lng);
  if (company.requireOnSiteToClock && !coords) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This company requires a GPS stamp to clock in.",
    });
  }
  const onSite = coords
    ? isInsideGeofence({
        lat: coords.lat,
        lng: coords.lng,
        centerLat: job.lat,
        centerLng: job.lng,
        radiusMeters: job.radiusMeters,
      })
    : false;
  if (company.requireOnSiteToClock && !onSite) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be inside the job geofence to clock in.",
    });
  }
  const punch: JobsitePunch = {
    id: randomUUID(),
    companyId: input.companyId,
    jobId: job.id,
    userId: actor.userId,
    displayName: member.displayName,
    clockInAt: nowIso(),
    clockInLat: coords?.lat,
    clockInLng: coords?.lng,
    clockInOnSite: onSite,
    flagged: Boolean(coords) && !onSite,
    flagReason: coords && !onSite ? "Clock-in outside job geofence" : undefined,
  };
  punches.set(punch.id, punch);
  return punch;
}

export function clockOut(
  actor: Actor,
  input: { companyId: string; lat?: number; lng?: number },
): JobsitePunch {
  requireMember(input.companyId, actor);
  const open = [...punches.values()].find(
    (p) => p.userId === actor.userId && p.companyId === input.companyId && !p.clockOutAt,
  );
  if (!open) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You are not clocked in." });
  }
  const job = getJobInCompany(open.jobId, input.companyId);
  const coords = requireCoords(input.lat, input.lng);
  const onSite = coords
    ? isInsideGeofence({
        lat: coords.lat,
        lng: coords.lng,
        centerLat: job.lat,
        centerLng: job.lng,
        radiusMeters: job.radiusMeters,
      })
    : false;
  open.clockOutAt = nowIso();
  open.clockOutLat = coords?.lat;
  open.clockOutLng = coords?.lng;
  open.clockOutOnSite = onSite;
  if (coords && !onSite) {
    open.flagged = true;
    open.flagReason = open.flagReason
      ? `${open.flagReason}; clock-out outside geofence`
      : "Clock-out outside job geofence";
  }
  punches.set(open.id, open);
  return open;
}

export function listJobsiteRoster(actor: Actor, companyId: string): JobsitePunch[] {
  const member = requireMember(companyId, actor);
  const rows = [...punches.values()]
    .filter((p) => p.companyId === companyId)
    .sort((a, b) => b.clockInAt.localeCompare(a.clockInAt))
    .slice(0, 200);
  if (member.role === "crew") {
    return rows.filter((p) => p.userId === actor.userId || !p.clockOutAt);
  }
  return rows;
}

export function createInventoryItem(
  actor: Actor,
  input: { companyId: string; sku: string; name: string; unit: string; qtyYard?: number; qtyTruck?: number },
): JobsiteInventoryItem {
  requireManager(input.companyId, actor);
  const sku = sanitizeUserText(input.sku, 40).toUpperCase();
  const exists = [...inventory.values()].find((i) => i.companyId === input.companyId && i.sku === sku);
  if (exists) {
    throw new TRPCError({ code: "CONFLICT", message: "SKU already exists." });
  }
  const item: JobsiteInventoryItem = {
    id: randomUUID(),
    companyId: input.companyId,
    sku,
    name: sanitizeUserText(input.name, 120),
    unit: sanitizeUserText(input.unit || "ea", 16),
    qtyYard: Math.max(0, Math.floor(input.qtyYard ?? 0)),
    qtyTruck: Math.max(0, Math.floor(input.qtyTruck ?? 0)),
    qtyByJob: {},
  };
  inventory.set(item.id, item);
  return item;
}

export function listInventory(actor: Actor, companyId: string): JobsiteInventoryItem[] {
  requireMember(companyId, actor);
  return [...inventory.values()].filter((i) => i.companyId === companyId);
}

function takeFromSource(item: JobsiteInventoryItem, source: InventorySource, qty: number): void {
  if (source === "yard") {
    if (item.qtyYard < qty) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Not enough quantity in the yard." });
    }
    item.qtyYard -= qty;
    return;
  }
  if (item.qtyTruck < qty) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Not enough quantity on the truck." });
  }
  item.qtyTruck -= qty;
}

export function checkoutInventoryToJob(
  actor: Actor,
  input: { companyId: string; itemId: string; jobId: string; source: InventorySource; quantity: number },
): JobsiteInventoryItem {
  requireMember(input.companyId, actor);
  getJobInCompany(input.jobId, input.companyId);
  const item = inventory.get(input.itemId);
  if (!item || item.companyId !== input.companyId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Inventory item not found." });
  }
  const qty = Math.floor(input.quantity);
  if (qty < 1 || qty > 10_000) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid quantity." });
  }
  takeFromSource(item, input.source, qty);
  item.qtyByJob[input.jobId] = (item.qtyByJob[input.jobId] ?? 0) + qty;
  inventory.set(item.id, item);
  inventoryMoves.set(randomUUID(), {
    id: randomUUID(),
    companyId: input.companyId,
    itemId: item.id,
    actorUserId: actor.userId,
    kind: "checkout",
    from: input.source,
    jobId: input.jobId,
    quantity: qty,
    createdAt: nowIso(),
  });
  return item;
}

export function consumeInventoryOnJob(
  actor: Actor,
  input: { companyId: string; itemId: string; jobId: string; quantity: number },
): JobsiteInventoryItem {
  requireMember(input.companyId, actor);
  getJobInCompany(input.jobId, input.companyId);
  const item = inventory.get(input.itemId);
  if (!item || item.companyId !== input.companyId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Inventory item not found." });
  }
  const qty = Math.floor(input.quantity);
  const onJob = item.qtyByJob[input.jobId] ?? 0;
  if (qty < 1 || onJob < qty) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Not enough quantity on this job." });
  }
  item.qtyByJob[input.jobId] = onJob - qty;
  inventory.set(item.id, item);
  inventoryMoves.set(randomUUID(), {
    id: randomUUID(),
    companyId: input.companyId,
    itemId: item.id,
    actorUserId: actor.userId,
    kind: "consume",
    from: "job",
    jobId: input.jobId,
    quantity: qty,
    createdAt: nowIso(),
  });
  return item;
}

export function registerEquipment(
  actor: Actor,
  input: { companyId: string; name: string; make?: string; model?: string },
): { equipment: JobsiteEquipment; deviceToken: string } {
  requireManager(input.companyId, actor);
  const deviceToken = randomBytes(32).toString("hex");
  const row: StoredEquipment = {
    id: randomUUID(),
    companyId: input.companyId,
    name: sanitizeUserText(input.name, 120),
    make: input.make ? sanitizeUserText(input.make, 80) : undefined,
    model: input.model ? sanitizeUserText(input.model, 80) : undefined,
    alerts: [],
    hasDeviceToken: true,
    tokenHash: hashToken(deviceToken),
  };
  equipment.set(row.id, row);
  return { equipment: publicEquipment(row), deviceToken };
}

export function rotateEquipmentToken(
  actor: Actor,
  input: { companyId: string; equipmentId: string },
): { deviceToken: string } {
  requireManager(input.companyId, actor);
  const row = equipment.get(input.equipmentId);
  if (!row || row.companyId !== input.companyId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Equipment not found." });
  }
  const deviceToken = randomBytes(32).toString("hex");
  row.tokenHash = hashToken(deviceToken);
  row.hasDeviceToken = true;
  equipment.set(row.id, row);
  return { deviceToken };
}

function applyEquipmentPing(
  row: StoredEquipment,
  company: JobsiteCompany,
  ping: { lat: number; lng: number; engineHours?: number; fuelPercent?: number },
): JobsiteEquipment {
  const at = nowIso();
  const alerts = evaluateEquipmentAlerts(company, row.lastPing, { lat: ping.lat, lng: ping.lng, at });
  row.lastPing = {
    at,
    lat: ping.lat,
    lng: ping.lng,
    engineHours: ping.engineHours,
    fuelPercent: ping.fuelPercent,
  };
  row.alerts = [...alerts, ...row.alerts].slice(0, 20);
  equipment.set(row.id, row);
  return publicEquipment(row);
}

export function recordEquipmentPing(
  actor: Actor,
  input: {
    companyId: string;
    equipmentId: string;
    lat: number;
    lng: number;
    engineHours?: number;
    fuelPercent?: number;
  },
): JobsiteEquipment {
  requireManager(input.companyId, actor);
  const row = equipment.get(input.equipmentId);
  if (!row || row.companyId !== input.companyId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Equipment not found." });
  }
  const coords = requireCoords(input.lat, input.lng);
  if (!coords) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Ping requires coordinates." });
  }
  return applyEquipmentPing(row, getCompany(input.companyId), {
    ...coords,
    engineHours: input.engineHours,
    fuelPercent: input.fuelPercent,
  });
}

export function ingestEquipmentPing(input: {
  equipmentId: string;
  deviceToken: string;
  lat: number;
  lng: number;
  engineHours?: number;
  fuelPercent?: number;
}): { ok: true } {
  const row = equipment.get(input.equipmentId);
  if (!row || !tokenMatches(row.tokenHash, input.deviceToken)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Invalid credentials." });
  }
  const coords = requireCoords(input.lat, input.lng);
  if (!coords) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Ping requires coordinates." });
  }
  applyEquipmentPing(row, getCompany(row.companyId), {
    ...coords,
    engineHours: input.engineHours,
    fuelPercent: input.fuelPercent,
  });
  return { ok: true as const };
}

export function listEquipment(actor: Actor, companyId: string): JobsiteEquipment[] {
  requireMember(companyId, actor);
  return [...equipment.values()].filter((e) => e.companyId === companyId).map(publicEquipment);
}

export function addDailyLog(
  actor: Actor,
  input: {
    companyId: string;
    jobId: string;
    weather: string;
    crewNotes: string;
    materials: string;
    delays: string;
  },
): JobsiteDailyLog {
  const member = requireMember(input.companyId, actor);
  getJobInCompany(input.jobId, input.companyId);
  const log: JobsiteDailyLog = {
    id: randomUUID(),
    companyId: input.companyId,
    jobId: input.jobId,
    authorUserId: actor.userId,
    authorName: member.displayName,
    weather: sanitizeUserText(input.weather, 200),
    crewNotes: sanitizeUserText(input.crewNotes, 2000),
    materials: sanitizeUserText(input.materials, 1000),
    delays: sanitizeUserText(input.delays, 1000),
    createdAt: nowIso(),
  };
  dailyLogs.set(log.id, log);
  return log;
}

export function listDailyLogs(actor: Actor, companyId: string, jobId?: string): JobsiteDailyLog[] {
  requireMember(companyId, actor);
  return [...dailyLogs.values()]
    .filter((l) => l.companyId === companyId && (!jobId || l.jobId === jobId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}

export function addPunchListItem(
  actor: Actor,
  input: { companyId: string; jobId: string; title: string; locationNote: string },
): JobsitePunchListItem {
  requireMember(input.companyId, actor);
  getJobInCompany(input.jobId, input.companyId);
  const item: JobsitePunchListItem = {
    id: randomUUID(),
    companyId: input.companyId,
    jobId: input.jobId,
    title: sanitizeUserText(input.title, 200),
    locationNote: sanitizeUserText(input.locationNote, 200),
    status: "open",
    createdByUserId: actor.userId,
    createdAt: nowIso(),
  };
  punchList.set(item.id, item);
  return item;
}

export function completePunchListItem(
  actor: Actor,
  input: { companyId: string; itemId: string },
): JobsitePunchListItem {
  requireMember(input.companyId, actor);
  const item = punchList.get(input.itemId);
  if (!item || item.companyId !== input.companyId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Punch item not found." });
  }
  item.status = "done";
  item.completedAt = nowIso();
  punchList.set(item.id, item);
  return item;
}

export function listPunchList(actor: Actor, companyId: string, jobId?: string): JobsitePunchListItem[] {
  requireMember(companyId, actor);
  return [...punchList.values()]
    .filter((i) => i.companyId === companyId && (!jobId || i.jobId === jobId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addSafetyReport(
  actor: Actor,
  input: { companyId: string; jobId: string; checklist: string; notes: string; incident: boolean },
): JobsiteSafetyReport {
  const member = requireMember(input.companyId, actor);
  getJobInCompany(input.jobId, input.companyId);
  const report: JobsiteSafetyReport = {
    id: randomUUID(),
    companyId: input.companyId,
    jobId: input.jobId,
    authorUserId: actor.userId,
    authorName: member.displayName,
    checklist: sanitizeUserText(input.checklist, 500),
    notes: sanitizeUserText(input.notes, 2000),
    incident: Boolean(input.incident),
    createdAt: nowIso(),
  };
  safetyReports.set(report.id, report);
  return report;
}

export function listSafetyReports(actor: Actor, companyId: string, jobId?: string): JobsiteSafetyReport[] {
  requireMember(companyId, actor);
  return [...safetyReports.values()]
    .filter((r) => r.companyId === companyId && (!jobId || r.jobId === jobId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}

export function getOfficeDashboard(actor: Actor, companyId: string): JobsiteOfficeDashboard {
  const member = requireManager(companyId, actor);
  const company = getCompany(companyId);
  const companyPunches = [...punches.values()].filter((p) => p.companyId === companyId);
  const items = [...inventory.values()].filter((i) => i.companyId === companyId);
  const machines = [...equipment.values()].filter((e) => e.companyId === companyId);
  return {
    company,
    role: member.role,
    openPunches: companyPunches.filter((p) => !p.clockOutAt).length,
    flaggedPunches: companyPunches.filter((p) => p.flagged).length,
    openPunchList: [...punchList.values()].filter((i) => i.companyId === companyId && i.status === "open")
      .length,
    lowStock: items.filter((i) => i.qtyYard + i.qtyTruck <= LOW_STOCK_THRESHOLD).length,
    equipmentAlerts: machines.reduce((n, e) => n + e.alerts.length, 0),
    jobs: [...jobs.values()].filter((j) => j.companyId === companyId).length,
  };
}

export { LOW_STOCK_THRESHOLD };
