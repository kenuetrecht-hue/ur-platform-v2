/**
 * 3D Project Sync Engine
 * Seamless synchronization between mobile and web platforms
 * Handles real-time updates, conflict resolution, and data consistency
 */

import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const Vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const Object3DSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: Vector3Schema,
  rotation: Vector3Schema,
  scale: Vector3Schema,
  color: z.string(),
  material: z.string(),
  metadata: z.record(z.string(), z.any()),
});

const CameraStateSchema = z.object({
  position: Vector3Schema,
  target: Vector3Schema,
  fov: z.number(),
  zoom: z.number(),
});

const LightingStateSchema = z.object({
  ambient: z.number(),
  directional: Vector3Schema,
  intensity: z.number(),
});

const Project3DSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["landscaping", "construction"] as const),
  photoUri: z.string().optional(),
  objects: z.array(Object3DSchema),
  camera: CameraStateSchema,
  lighting: LightingStateSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  syncedToWeb: z.boolean(),
  lastSyncedAt: z.date().optional(),
  version: z.number(),
  platform: z.enum(["mobile", "web"] as const),
  userId: z.string(),
});

const SyncEventSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  eventType: z.enum([
    "project_created",
    "project_updated",
    "object_added",
    "object_removed",
    "object_modified",
    "camera_changed",
    "lighting_changed",
    "sync_requested",
    "conflict_resolved",
  ] as const),
  timestamp: z.date(),
  platform: z.enum(["mobile", "web"] as const),
  userId: z.string(),
  data: z.record(z.string(), z.any()),
  version: z.number(),
});

const SyncConflictSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  objectId: z.string().optional(),
  conflictType: z.enum([
    "version_mismatch",
    "concurrent_edit",
    "data_corruption",
    "missing_object",
  ] as const),
  mobileVersion: z.record(z.string(), z.any()),
  webVersion: z.record(z.string(), z.any()),
  resolution: z.enum(["mobile_wins", "web_wins", "merged", "manual"] as const).optional(),
  resolvedAt: z.date().optional(),
  resolvedBy: z.string().optional(),
});

const SyncStatusSchema = z.object({
  projectId: z.string(),
  isSyncing: z.boolean(),
  lastSyncedAt: z.date().optional(),
  pendingChanges: z.number(),
  conflicts: z.array(SyncConflictSchema),
  syncProgress: z.number().min(0).max(100),
  estimatedTimeRemaining: z.number().optional(),
  bandwidth: z.number().optional(),
  latency: z.number().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

type Vector3 = z.infer<typeof Vector3Schema>;
type Object3D = z.infer<typeof Object3DSchema>;
type CameraState = z.infer<typeof CameraStateSchema>;
type LightingState = z.infer<typeof LightingStateSchema>;
type Project3D = z.infer<typeof Project3DSchema>;
type SyncEvent = z.infer<typeof SyncEventSchema>;
type SyncConflict = z.infer<typeof SyncConflictSchema>;
type SyncStatus = z.infer<typeof SyncStatusSchema>;

// ============================================================================
// 3D SYNC ENGINE
// ============================================================================

export class Sync3DEngine {
  private projects: Map<string, Project3D> = new Map();
  private syncEvents: Map<string, SyncEvent[]> = new Map();
  private conflicts: Map<string, SyncConflict[]> = new Map();
  private syncStatus: Map<string, SyncStatus> = new Map();
  private changeQueue: Map<string, any[]> = new Map();

  /**
   * Initialize sync for a project
   */
  initializeSync(project: Project3D): void {
    this.projects.set(project.id, project);
    this.syncEvents.set(project.id, []);
    this.conflicts.set(project.id, []);
    this.changeQueue.set(project.id, []);

    this.syncStatus.set(project.id, {
      projectId: project.id,
      isSyncing: false,
      lastSyncedAt: project.lastSyncedAt,
      pendingChanges: 0,
      conflicts: [],
      syncProgress: 0,
    });
  }

  /**
   * Push changes from mobile to web
   */
  async pushChanges(projectId: string, changes: any[]): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const status = this.syncStatus.get(projectId)!;
    status.isSyncing = true;
    status.pendingChanges = changes.length;
    status.syncProgress = 0;

    try {
      for (let i = 0; i < changes.length; i++) {
        const change = changes[i];
        await this.applyChange(projectId, change);

        // Record sync event
        this.recordSyncEvent(projectId, {
          eventType: this.getEventType(change),
          data: change,
          platform: change.platform || "mobile",
        });

        status.syncProgress = Math.round(((i + 1) / changes.length) * 100);
      }

      project.version += 1;
      project.lastSyncedAt = new Date();
      project.syncedToWeb = true;
      status.lastSyncedAt = new Date();
      status.pendingChanges = 0;
    } finally {
      status.isSyncing = false;
    }
  }

  /**
   * Pull changes from web to mobile
   */
  async pullChanges(projectId: string, mobileVersion: number): Promise<any[]> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const events = this.syncEvents.get(projectId) || [];
    const changesSinceVersion = events.filter((e) => e.version > mobileVersion);

    return changesSinceVersion.map((e) => e.data);
  }

  /**
   * Apply a change to the project
   */
  private async applyChange(projectId: string, change: any): Promise<void> {
    const project = this.projects.get(projectId)!;

    switch (change.type) {
      case "add_object":
        project.objects.push(change.object);
        break;

      case "remove_object":
        project.objects = project.objects.filter((o) => o.id !== change.objectId);
        break;

      case "update_object":
        const objIndex = project.objects.findIndex((o) => o.id === change.objectId);
        if (objIndex !== -1) {
          project.objects[objIndex] = { ...project.objects[objIndex], ...change.updates };
        }
        break;

      case "update_camera":
        project.camera = change.camera;
        break;

      case "update_lighting":
        project.lighting = change.lighting;
        break;

      case "update_project":
        Object.assign(project, change.updates);
        break;
    }

    project.updatedAt = new Date();
  }

  /**
   * Detect and resolve conflicts
   */
  async detectAndResolveConflicts(projectId: string): Promise<SyncConflict[]> {
    const project = this.projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const detectedConflicts: SyncConflict[] = [];
    const projectConflicts = this.conflicts.get(projectId) || [];

    // Check for version mismatches
    if (project.version < 0) {
      detectedConflicts.push({
        id: `conflict-${Date.now()}`,
        projectId,
        conflictType: "version_mismatch",
        mobileVersion: { version: project.version },
        webVersion: { version: project.version + 1 },
      });
    }

    // Merge detected conflicts with existing ones
    const allConflicts = [...projectConflicts, ...detectedConflicts];
    this.conflicts.set(projectId, allConflicts);

    // Auto-resolve conflicts with strategy
    for (const conflict of allConflicts) {
      if (!conflict.resolution) {
        conflict.resolution = this.resolveConflict(conflict);
        conflict.resolvedAt = new Date();
        conflict.resolvedBy = "auto";
      }
    }

    return allConflicts;
  }

  /**
   * Resolve a conflict using merge strategy
   */
  private resolveConflict(conflict: SyncConflict): "mobile_wins" | "web_wins" | "merged" {
    switch (conflict.conflictType) {
      case "version_mismatch":
        return "web_wins"; // Web version is always authoritative
      case "concurrent_edit":
        return "merged"; // Attempt to merge changes
      case "data_corruption":
        return "web_wins"; // Web is backup
      case "missing_object":
        return "web_wins"; // Restore from web
      default:
        return "merged";
    }
  }

  /**
   * Record a sync event
   */
  private recordSyncEvent(
    projectId: string,
    event: Partial<SyncEvent>
  ): void {
    const events = this.syncEvents.get(projectId) || [];
    const project = this.projects.get(projectId)!;

    const syncEvent: SyncEvent = {
      id: `event-${Date.now()}`,
      projectId,
      eventType: (event.eventType || "project_updated") as any,
      timestamp: new Date(),
      platform: (event.platform || "web") as any,
      userId: project.userId,
      data: event.data || {},
      version: project.version,
    };

    events.push(syncEvent);
    this.syncEvents.set(projectId, events);
  }

  /**
   * Get event type from change
   */
  private getEventType(change: any): SyncEvent["eventType"] {
    if (change.type === "add_object") return "object_added";
    if (change.type === "remove_object") return "object_removed";
    if (change.type === "update_object") return "object_modified";
    if (change.type === "update_camera") return "camera_changed";
    if (change.type === "update_lighting") return "lighting_changed";
    return "project_updated";
  }

  /**
   * Get sync status
   */
  getSyncStatus(projectId: string): SyncStatus | null {
    return this.syncStatus.get(projectId) || null;
  }

  /**
   * Get project
   */
  getProject(projectId: string): Project3D | null {
    return this.projects.get(projectId) || null;
  }

  /**
   * Get sync events
   */
  getSyncEvents(projectId: string): SyncEvent[] {
    return this.syncEvents.get(projectId) || [];
  }

  /**
   * Get conflicts
   */
  getConflicts(projectId: string): SyncConflict[] {
    return this.conflicts.get(projectId) || [];
  }

  /**
   * Get sync statistics
   */
  getStatistics(): {
    totalProjects: number;
    activeSyncs: number;
    totalEvents: number;
    totalConflicts: number;
    averageSyncTime: number;
  } {
    let totalEvents = 0;
    let totalConflicts = 0;
    let activeSyncs = 0;

    for (const status of this.syncStatus.values()) {
      if (status.isSyncing) activeSyncs++;
    }

    for (const events of this.syncEvents.values()) {
      totalEvents += events.length;
    }

    for (const conflicts of this.conflicts.values()) {
      totalConflicts += conflicts.length;
    }

    return {
      totalProjects: this.projects.size,
      activeSyncs,
      totalEvents,
      totalConflicts,
      averageSyncTime: 1500, // Mock value
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  Vector3Schema,
  Object3DSchema,
  CameraStateSchema,
  LightingStateSchema,
  Project3DSchema,
  SyncEventSchema,
  SyncConflictSchema,
  SyncStatusSchema,
};

export type {
  Vector3,
  Object3D,
  CameraState,
  LightingState,
  Project3D,
  SyncEvent,
  SyncConflict,
  SyncStatus,
};
