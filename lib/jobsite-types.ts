export const JOBSITE_ROLES = ["company_owner", "office_manager", "crew"] as const;
export type JobsiteRole = (typeof JOBSITE_ROLES)[number];

export const INVENTORY_SOURCES = ["yard", "truck"] as const;
export type InventorySource = (typeof INVENTORY_SOURCES)[number];

export const PUNCH_STATUSES = ["open", "done"] as const;
export type PunchStatus = (typeof PUNCH_STATUSES)[number];

export const EQUIPMENT_ALERT_TYPES = ["left_yard", "after_hours_move"] as const;
export type EquipmentAlertType = (typeof EQUIPMENT_ALERT_TYPES)[number];

export type JobsiteCompany = {
  id: string;
  name: string;
  ownerUserId: string;
  yardLat?: number;
  yardLng?: number;
  yardRadiusMeters: number;
  requireOnSiteToClock: boolean;
  createdAt: string;
};

export type JobsiteMember = {
  id: string;
  companyId: string;
  userId?: string;
  email: string;
  displayName: string;
  role: JobsiteRole;
  status: "pending" | "active" | "revoked";
  createdAt: string;
};

export type JobsiteJob = {
  id: string;
  companyId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  createdAt: string;
};

export type JobsitePunch = {
  id: string;
  companyId: string;
  jobId: string;
  userId: string;
  displayName: string;
  clockInAt: string;
  clockOutAt?: string;
  clockInLat?: number;
  clockInLng?: number;
  clockOutLat?: number;
  clockOutLng?: number;
  clockInOnSite: boolean;
  clockOutOnSite?: boolean;
  flagged: boolean;
  flagReason?: string;
};

export type JobsiteInventoryItem = {
  id: string;
  companyId: string;
  sku: string;
  name: string;
  unit: string;
  qtyYard: number;
  qtyTruck: number;
  qtyByJob: Record<string, number>;
};

export type JobsiteInventoryMove = {
  id: string;
  companyId: string;
  itemId: string;
  actorUserId: string;
  kind: "checkout" | "consume" | "adjust";
  from?: InventorySource | "job";
  jobId?: string;
  quantity: number;
  createdAt: string;
};

export type JobsiteEquipmentPing = {
  at: string;
  lat: number;
  lng: number;
  engineHours?: number;
  fuelPercent?: number;
};

export type JobsiteEquipmentAlert = {
  type: EquipmentAlertType;
  at: string;
  message: string;
};

export type JobsiteEquipment = {
  id: string;
  companyId: string;
  name: string;
  make?: string;
  model?: string;
  lastPing?: JobsiteEquipmentPing;
  alerts: JobsiteEquipmentAlert[];
  hasDeviceToken: boolean;
};

export type JobsiteDailyLog = {
  id: string;
  companyId: string;
  jobId: string;
  authorUserId: string;
  authorName: string;
  weather: string;
  crewNotes: string;
  materials: string;
  delays: string;
  createdAt: string;
};

export type JobsitePunchListItem = {
  id: string;
  companyId: string;
  jobId: string;
  title: string;
  locationNote: string;
  status: PunchStatus;
  createdByUserId: string;
  createdAt: string;
  completedAt?: string;
};

export type JobsiteSafetyReport = {
  id: string;
  companyId: string;
  jobId: string;
  authorUserId: string;
  authorName: string;
  checklist: string;
  notes: string;
  incident: boolean;
  createdAt: string;
};

export type JobsiteOfficeDashboard = {
  company: JobsiteCompany;
  role: JobsiteRole;
  openPunches: number;
  flaggedPunches: number;
  openPunchList: number;
  lowStock: number;
  equipmentAlerts: number;
  jobs: number;
};
