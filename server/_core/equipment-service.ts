import { randomUUID } from "crypto";
import type { Workspace3dProjectType } from "../../lib/ur-3d-workspace";
import {
  EquipmentIntegrationEngine,
  type ConnectivityType,
  type EquipmentConnection,
  type PrintJob,
} from "../equipment-integration";
import {
  UniversalFileExportEngine,
  type ExportOptions,
  type ExportJob,
  type EquipmentProfile,
} from "../universal-file-export";
import {
  testOctoPrintConnection,
  getOctoPrintPrinterState,
  getOctoPrintJob,
  uploadOctoPrintFile,
  startOctoPrintJob,
  type OctoPrintConfig,
} from "./octoprint-adapter";

export type EquipmentAdapter = "simulated" | "octoprint";

export type UserEquipmentConnection = EquipmentConnection & {
  userId: string;
  profileId?: string;
  adapter: EquipmentAdapter;
  octoConfig?: OctoPrintConfig;
};

const integration = new EquipmentIntegrationEngine();
const exportEngine = new UniversalFileExportEngine();
const connectionOwners = new Map<string, string>();
const connectionMeta = new Map<string, Omit<UserEquipmentConnection, keyof EquipmentConnection>>();
/** OctoPrint and other non-simulated connections live here (not in integration engine). */
const directConnections = new Map<string, UserEquipmentConnection>();

export function listEquipmentProfiles(): EquipmentProfile[] {
  return exportEngine.getAllEquipmentProfiles();
}

export function getEquipmentProfile(profileId: string): EquipmentProfile | null {
  return exportEngine.getEquipmentProfile(profileId);
}

export async function connectEquipment(input: {
  userId: string;
  equipmentId: string;
  equipmentName: string;
  connectivity: ConnectivityType;
  profileId?: string;
  adapter?: EquipmentAdapter;
  connectionDetails?: Record<string, unknown>;
}): Promise<UserEquipmentConnection> {
  const adapter = input.adapter ?? "simulated";
  let octoConfig: OctoPrintConfig | undefined;

  if (adapter === "octoprint") {
    const host = String(input.connectionDetails?.host ?? "");
    const apiKey = String(input.connectionDetails?.apiKey ?? "");
    if (!host || !apiKey) {
      throw new Error("OctoPrint requires host and apiKey in connectionDetails.");
    }
    octoConfig = {
      host,
      port: Number(input.connectionDetails?.port ?? 80) || undefined,
      apiKey,
      useHttps: Boolean(input.connectionDetails?.useHttps),
    };
    const test = await testOctoPrintConnection(octoConfig);
    const connection: UserEquipmentConnection = {
      id: `conn-${randomUUID()}`,
      equipmentId: input.equipmentId,
      equipmentName: `${input.equipmentName} (${test.version.text ?? "OctoPrint"})`,
      connectivity: input.connectivity,
      status: "connected",
      connectionDetails: { ...input.connectionDetails, baseUrl: test.baseUrl },
      lastConnectedAt: new Date(),
      signalStrength: 90,
      latency: 20,
      userId: input.userId,
      profileId: input.profileId,
      adapter: "octoprint",
      octoConfig,
    };
    connectionOwners.set(connection.id, input.userId);
    connectionMeta.set(connection.id, {
      userId: input.userId,
      profileId: input.profileId,
      adapter: "octoprint",
      octoConfig,
    });
    directConnections.set(connection.id, connection);
    return connection;
  }

  const base = await integration.connectToEquipment(
    input.equipmentId,
    input.equipmentName,
    input.connectivity,
    input.connectionDetails ?? {},
  );
  connectionOwners.set(base.id, input.userId);
  connectionMeta.set(base.id, {
    userId: input.userId,
    profileId: input.profileId,
    adapter: "simulated",
  });
  return { ...base, userId: input.userId, profileId: input.profileId, adapter: "simulated" };
}

export function listUserConnections(userId: string): UserEquipmentConnection[] {
  const simulated = integration
    .getAllConnections()
    .filter((c) => connectionOwners.get(c.id) === userId)
    .map((c) => ({
      ...c,
      ...connectionMeta.get(c.id)!,
    }));

  const direct = [...directConnections.values()].filter((c) => c.userId === userId);
  return [...direct, ...simulated];
}

export function getUserConnection(
  userId: string,
  connectionId: string,
): UserEquipmentConnection | null {
  if (connectionOwners.get(connectionId) !== userId) return null;

  const direct = directConnections.get(connectionId);
  if (direct) return direct;

  const base = integration.getConnection(connectionId);
  if (!base) return null;
  return { ...base, ...connectionMeta.get(connectionId)! };
}

export function disconnectEquipment(userId: string, connectionId: string): boolean {
  if (connectionOwners.get(connectionId) !== userId) return false;
  directConnections.delete(connectionId);
  integration.disconnectFromEquipment(connectionId);
  connectionOwners.delete(connectionId);
  connectionMeta.delete(connectionId);
  return true;
}

export async function probeOctoPrint(input: {
  host: string;
  port?: number;
  apiKey: string;
  useHttps?: boolean;
}) {
  return testOctoPrintConnection({
    host: input.host,
    port: input.port,
    apiKey: input.apiKey,
    useHttps: input.useHttps,
  });
}

export async function getLivePrinterStatus(userId: string, connectionId: string) {
  const conn = getUserConnection(userId, connectionId);
  if (!conn) throw new Error("Connection not found.");
  if (conn.adapter === "octoprint" && conn.octoConfig) {
    const [printer, job] = await Promise.all([
      getOctoPrintPrinterState(conn.octoConfig),
      getOctoPrintJob(conn.octoConfig).catch(() => null),
    ]);
    return { adapter: "octoprint" as const, printer, job };
  }
  return {
    adapter: "simulated" as const,
    status: integration.getEquipmentStatus(conn.equipmentId),
  };
}

export function createExportJob(projectId: string, options: ExportOptions): ExportJob {
  return exportEngine.createExportJob(projectId, options);
}

export async function processExportJob(jobId: string): Promise<ExportJob> {
  return exportEngine.processExportJob(jobId);
}

export function getExportJob(jobId: string): ExportJob | null {
  return exportEngine.getExportJobStatus(jobId);
}

export function validateExportForEquipment(
  equipmentProfileId: string,
  options: ExportOptions,
) {
  return exportEngine.validateExportOptionsForEquipment(equipmentProfileId, options);
}

export async function sendFileToPrinter(input: {
  userId: string;
  connectionId: string;
  fileName: string;
  fileContentBase64: string;
  startPrint?: boolean;
}): Promise<{ transferId?: string; uploaded: boolean; printStarted: boolean }> {
  const conn = getUserConnection(input.userId, input.connectionId);
  if (!conn) throw new Error("Connection not found.");

  const buffer = Buffer.from(input.fileContentBase64, "base64");
  if (buffer.length === 0) throw new Error("Empty file content.");

  if (conn.adapter === "octoprint" && conn.octoConfig) {
    await uploadOctoPrintFile(conn.octoConfig, input.fileName, buffer, {
      select: true,
      print: Boolean(input.startPrint),
    });
    if (input.startPrint) {
      await startOctoPrintJob(conn.octoConfig);
    }
    return { uploaded: true, printStarted: Boolean(input.startPrint) };
  }

  const transfer = await integration.transferFileToEquipment(
    input.connectionId,
    `file-${Date.now()}`,
    input.fileName,
    buffer.length,
    input.fileName.split(".").pop() ?? "gcode",
  );

  let printStarted = false;
  if (input.startPrint) {
    await integration.startPrintJob(input.connectionId, transfer.fileId, input.fileName);
    printStarted = true;
  }

  return { transferId: transfer.id, uploaded: true, printStarted };
}

export async function startPrintOnConnection(
  userId: string,
  connectionId: string,
  fileName: string,
): Promise<PrintJob | { started: true }> {
  const conn = getUserConnection(userId, connectionId);
  if (!conn) throw new Error("Connection not found.");

  if (conn.adapter === "octoprint" && conn.octoConfig) {
    await startOctoPrintJob(conn.octoConfig);
    return { started: true };
  }

  return integration.startPrintJob(connectionId, `file-${Date.now()}`, fileName);
}

/** In-memory store for active 3D workspace sessions (multi-AI collaboration). */
export type Workspace3DSession = {
  id: string;
  userId: string;
  name: string;
  projectType: Workspace3dProjectType;
  description: string;
  activeAiIds: string[];
  createdAt: string;
  updatedAt: string;
  designVersion?: number;
};

const workspaceSessions = new Map<string, Workspace3DSession>();

export function createWorkspaceSession(input: {
  userId: string;
  name: string;
  projectType: Workspace3DSession["projectType"];
  description: string;
  activeAiIds?: string[];
}): Workspace3DSession {
  const now = new Date().toISOString();
  const session: Workspace3DSession = {
    id: `ws-${randomUUID()}`,
    userId: input.userId,
    name: input.name,
    projectType: input.projectType,
    description: input.description,
    activeAiIds: input.activeAiIds ?? ["ai-3d-specialist"],
    createdAt: now,
    updatedAt: now,
  };
  workspaceSessions.set(session.id, session);
  return session;
}

export function getWorkspaceSession(
  userId: string,
  sessionId: string,
): Workspace3DSession | null {
  const s = workspaceSessions.get(sessionId);
  if (!s || s.userId !== userId) return null;
  return s;
}

export function listWorkspaceSessions(userId: string): Workspace3DSession[] {
  return [...workspaceSessions.values()]
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function updateWorkspaceSession(
  userId: string,
  sessionId: string,
  patch: Partial<Pick<Workspace3DSession, "name" | "description" | "activeAiIds">>,
): Workspace3DSession | null {
  const session = getWorkspaceSession(userId, sessionId);
  if (!session) return null;
  Object.assign(session, patch, { updatedAt: new Date().toISOString() });
  workspaceSessions.set(sessionId, session);
  return session;
}
