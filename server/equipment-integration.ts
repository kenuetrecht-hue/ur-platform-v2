/**
 * Equipment Integration & Connectivity System
 * Direct connectivity to 3D printers, CNC machines, robotics systems
 * Supports USB, WiFi, Bluetooth, Ethernet, SD Card
 */

import { z } from "zod";

// ============================================================================
// SCHEMAS
// ============================================================================

const ConnectivityTypeSchema = z.enum([
  "usb",
  "wifi",
  "bluetooth",
  "ethernet",
  "sd_card",
] as const);

const EquipmentConnectionSchema = z.object({
  id: z.string(),
  equipmentId: z.string(),
  equipmentName: z.string(),
  connectivity: ConnectivityTypeSchema,
  status: z.enum(["disconnected", "connecting", "connected", "error"] as const),
  connectionDetails: z.record(z.string(), z.any()),
  lastConnectedAt: z.date().optional(),
  signalStrength: z.number().min(0).max(100).optional(),
  latency: z.number().optional(),
  error: z.string().optional(),
});

const FileTransferSchema = z.object({
  id: z.string(),
  equipmentConnectionId: z.string(),
  fileId: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  format: z.string(),
  status: z.enum([
    "queued",
    "transferring",
    "completed",
    "failed",
    "cancelled",
  ] as const),
  progress: z.number().min(0).max(100),
  speed: z.number().optional(), // KB/s
  estimatedTimeRemaining: z.number().optional(), // seconds
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  error: z.string().optional(),
});

const PrintJobSchema = z.object({
  id: z.string(),
  equipmentConnectionId: z.string(),
  fileId: z.string(),
  fileName: z.string(),
  status: z.enum([
    "queued",
    "preparing",
    "printing",
    "paused",
    "completed",
    "failed",
    "cancelled",
  ] as const),
  progress: z.number().min(0).max(100),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  estimatedDuration: z.number().optional(), // seconds
  estimatedTimeRemaining: z.number().optional(), // seconds
  filamentUsed: z.number().optional(), // grams
  nozzleTemp: z.number().optional(),
  bedTemp: z.number().optional(),
  error: z.string().optional(),
});

const EquipmentStatusSchema = z.object({
  equipmentId: z.string(),
  equipmentName: z.string(),
  status: z.enum(["idle", "busy", "error", "offline"] as const),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  filamentLevel: z.number().min(0).max(100).optional(),
  powerStatus: z.enum(["on", "off", "standby"] as const),
  activeJob: z.string().optional(),
  lastStatusUpdate: z.date(),
  diagnostics: z.record(z.string(), z.any()),
});

// ============================================================================
// TYPES
// ============================================================================

type ConnectivityType = z.infer<typeof ConnectivityTypeSchema>;
type EquipmentConnection = z.infer<typeof EquipmentConnectionSchema>;
type FileTransfer = z.infer<typeof FileTransferSchema>;
type PrintJob = z.infer<typeof PrintJobSchema>;
type EquipmentStatus = z.infer<typeof EquipmentStatusSchema>;

// ============================================================================
// EQUIPMENT INTEGRATION ENGINE
// ============================================================================

export class EquipmentIntegrationEngine {
  private connections: Map<string, EquipmentConnection> = new Map();
  private fileTransfers: Map<string, FileTransfer> = new Map();
  private printJobs: Map<string, PrintJob> = new Map();
  private equipmentStatus: Map<string, EquipmentStatus> = new Map();
  private connectionHandlers: Map<ConnectivityType, (config: any) => Promise<boolean>> = new Map();

  constructor() {
    this.initializeConnectionHandlers();
  }

  /**
   * Initialize connection handlers for different connectivity types
   */
  private initializeConnectionHandlers(): void {
    this.connectionHandlers.set("usb", async (config) => {
      // Simulate USB connection
      await this.delay(500);
      return true;
    });

    this.connectionHandlers.set("wifi", async (config) => {
      // Simulate WiFi connection
      await this.delay(1000);
      return true;
    });

    this.connectionHandlers.set("bluetooth", async (config) => {
      // Simulate Bluetooth connection
      await this.delay(2000);
      return true;
    });

    this.connectionHandlers.set("ethernet", async (config) => {
      // Simulate Ethernet connection
      await this.delay(300);
      return true;
    });

    this.connectionHandlers.set("sd_card", async (config) => {
      // SD card doesn't need connection
      return true;
    });
  }

  /**
   * Connect to equipment
   */
  async connectToEquipment(
    equipmentId: string,
    equipmentName: string,
    connectivity: ConnectivityType,
    connectionDetails: Record<string, any>
  ): Promise<EquipmentConnection> {
    const connection: EquipmentConnection = {
      id: `conn-${Date.now()}`,
      equipmentId,
      equipmentName,
      connectivity,
      status: "connecting",
      connectionDetails,
    };

    this.connections.set(connection.id, connection);

    try {
      const handler = this.connectionHandlers.get(connectivity);
      if (!handler) throw new Error(`No handler for connectivity type: ${connectivity}`);

      const success = await handler(connectionDetails);
      if (success) {
        connection.status = "connected";
        connection.lastConnectedAt = new Date();
        connection.signalStrength = connectivity === "wifi" ? 85 : 100;
        connection.latency = connectivity === "wifi" ? 15 : connectivity === "bluetooth" ? 50 : 5;
      }
    } catch (error) {
      connection.status = "error";
      connection.error = error instanceof Error ? error.message : "Connection failed";
    }

    return connection;
  }

  /**
   * Disconnect from equipment
   */
  disconnectFromEquipment(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.status = "disconnected";
    }
  }

  /**
   * Transfer file to equipment
   */
  async transferFileToEquipment(
    connectionId: string,
    fileId: string,
    fileName: string,
    fileSize: number,
    format: string
  ): Promise<FileTransfer> {
    const connection = this.connections.get(connectionId);
    if (!connection) throw new Error(`Connection ${connectionId} not found`);
    if (connection.status !== "connected") throw new Error("Equipment not connected");

    const transfer: FileTransfer = {
      id: `transfer-${Date.now()}`,
      equipmentConnectionId: connectionId,
      fileId,
      fileName,
      fileSize,
      format,
      status: "queued",
      progress: 0,
      startedAt: new Date(),
    };

    this.fileTransfers.set(transfer.id, transfer);

    // Simulate file transfer
    this.simulateFileTransfer(transfer);

    return transfer;
  }

  /**
   * Simulate file transfer progress
   */
  private async simulateFileTransfer(transfer: FileTransfer): Promise<void> {
    transfer.status = "transferring";
    const steps = [10, 25, 50, 75, 90, 100];

    for (const progress of steps) {
      await this.delay(500);
      transfer.progress = progress;
      transfer.speed = Math.floor(Math.random() * 500) + 100; // KB/s
      transfer.estimatedTimeRemaining = Math.max(0, 5 - progress / 20);
    }

    transfer.status = "completed";
    transfer.completedAt = new Date();
  }

  /**
   * Start print job
   */
  async startPrintJob(
    connectionId: string,
    fileId: string,
    fileName: string
  ): Promise<PrintJob> {
    const connection = this.connections.get(connectionId);
    if (!connection) throw new Error(`Connection ${connectionId} not found`);
    if (connection.status !== "connected") throw new Error("Equipment not connected");

    const printJob: PrintJob = {
      id: `print-${Date.now()}`,
      equipmentConnectionId: connectionId,
      fileId,
      fileName,
      status: "queued",
      progress: 0,
      startedAt: new Date(),
      estimatedDuration: 3600, // 1 hour mock
    };

    this.printJobs.set(printJob.id, printJob);

    // Simulate print job
    this.simulatePrintJob(printJob);

    return printJob;
  }

  /**
   * Simulate print job progress
   */
  private async simulatePrintJob(job: PrintJob): Promise<void> {
    const stages = [
      { status: "preparing" as const, duration: 1000 },
      { status: "printing" as const, duration: 5000 },
    ];

    for (const stage of stages) {
      job.status = stage.status;
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        await this.delay(stage.duration / steps);
        job.progress = Math.min(100, job.progress + 10);
        job.nozzleTemp = 210;
        job.bedTemp = 60;
        job.filamentUsed = (job.progress / 100) * 50; // Mock filament usage
      }
    }

    job.status = "completed";
    job.progress = 100;
    job.completedAt = new Date();
  }

  /**
   * Get file transfer status
   */
  getFileTransferStatus(transferId: string): FileTransfer | null {
    return this.fileTransfers.get(transferId) || null;
  }

  /**
   * Get print job status
   */
  getPrintJobStatus(jobId: string): PrintJob | null {
    return this.printJobs.get(jobId) || null;
  }

  /**
   * Get equipment status
   */
  getEquipmentStatus(equipmentId: string): EquipmentStatus | null {
    return this.equipmentStatus.get(equipmentId) || null;
  }

  /**
   * Update equipment status
   */
  updateEquipmentStatus(
    equipmentId: string,
    equipmentName: string,
    status: EquipmentStatus
  ): void {
    this.equipmentStatus.set(equipmentId, {
      ...status,
      equipmentId,
      equipmentName,
      lastStatusUpdate: new Date(),
    });
  }

  /**
   * Get all connections
   */
  getAllConnections(): EquipmentConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): EquipmentConnection | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    activeConnections: number;
    totalTransfers: number;
    completedTransfers: number;
    totalPrintJobs: number;
    completedPrintJobs: number;
    averageTransferSpeed: number;
  } {
    let completedTransfers = 0;
    let totalTransferSpeed = 0;
    let completedPrintJobs = 0;
    let activeConnections = 0;

    for (const conn of this.connections.values()) {
      if (conn.status === "connected") activeConnections++;
    }

    for (const transfer of this.fileTransfers.values()) {
      if (transfer.status === "completed") {
        completedTransfers++;
        totalTransferSpeed += transfer.speed || 0;
      }
    }

    for (const job of this.printJobs.values()) {
      if (job.status === "completed") completedPrintJobs++;
    }

    return {
      activeConnections,
      totalTransfers: this.fileTransfers.size,
      completedTransfers,
      totalPrintJobs: this.printJobs.size,
      completedPrintJobs,
      averageTransferSpeed:
        completedTransfers > 0 ? totalTransferSpeed / completedTransfers : 0,
    };
  }

  /**
   * Helper: delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ConnectivityTypeSchema,
  EquipmentConnectionSchema,
  FileTransferSchema,
  PrintJobSchema,
  EquipmentStatusSchema,
};

export type {
  ConnectivityType,
  EquipmentConnection,
  FileTransfer,
  PrintJob,
  EquipmentStatus,
};
