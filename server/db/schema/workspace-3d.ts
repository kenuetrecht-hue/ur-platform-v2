import { pgTable, text, integer, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
// Mock users table - replace with actual users schema when available
const users = { id: "id" } as any;

export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    thumbnail: text("thumbnail"),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("workspaces_user_id_idx").on(table.userId),
  })
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("viewer"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index("workspace_members_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("workspace_members_user_id_idx").on(table.userId),
  })
);

export const workspaceObjects = pgTable(
  "workspace_objects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    objectType: text("object_type").notNull(),
    position: jsonb("position"),
    rotation: jsonb("rotation"),
    scale: jsonb("scale"),
    properties: jsonb("properties"),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index("workspace_objects_workspace_id_idx").on(table.workspaceId),
    objectTypeIdx: index("workspace_objects_object_type_idx").on(table.objectType),
  })
);

export const blueprints = pgTable(
  "blueprints",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    layers: jsonb("layers"),
    measurements: jsonb("measurements"),
    annotations: jsonb("annotations"),
    version: integer("version").notNull().default(1),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index("blueprints_workspace_id_idx").on(table.workspaceId),
  })
);

export const workspaceAIAvatars = pgTable(
  "workspace_ai_avatars",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    aiType: text("ai_type").notNull(),
    position: jsonb("position"),
    rotation: jsonb("rotation"),
    isActive: boolean("is_active").notNull().default(true),
    currentTask: text("current_task"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index("workspace_ai_avatars_workspace_id_idx").on(table.workspaceId),
    aiTypeIdx: index("workspace_ai_avatars_ai_type_idx").on(table.aiType),
  })
);

export const collaborationEvents = pgTable(
  "collaboration_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    userId: text("user_id").references(() => users.id),
    aiId: text("ai_id"),
    data: jsonb("data"),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index("collaboration_events_workspace_id_idx").on(table.workspaceId),
    eventTypeIdx: index("collaboration_events_event_type_idx").on(table.eventType),
  })
);

export const workspaceSnapshots = pgTable(
  "workspace_snapshots",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    snapshotData: jsonb("snapshot_data").notNull(),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index("workspace_snapshots_workspace_id_idx").on(table.workspaceId),
  })
);

export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type WorkspaceObject = typeof workspaceObjects.$inferSelect;
export type Blueprint = typeof blueprints.$inferSelect;
export type WorkspaceAIAvatar = typeof workspaceAIAvatars.$inferSelect;
export type CollaborationEvent = typeof collaborationEvents.$inferSelect;
export type WorkspaceSnapshot = typeof workspaceSnapshots.$inferSelect;
