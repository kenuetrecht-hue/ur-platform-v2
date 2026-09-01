/**
 * Owner compliance archive — business record of AI / ops activity.
 * Not a tax return and not a legal filing.
 */

export type OwnerComplianceArchiveMeta = {
  generatedAt: string;
  reason: string;
  llc: string;
  purpose: string;
  notice: string;
  backupDir?: string;
  fileName?: string;
  counts: {
    incidents: number;
    commandCenterEvents: number;
    sandboxRepairs: number;
    notifications: number;
    sectionFlags: number;
  };
};

export type OwnerComplianceArchive = OwnerComplianceArchiveMeta & {
  incidents: unknown[];
  commandCenterEvents: unknown[];
  sandboxRepairs: unknown[];
  notifications: unknown[];
  sectionFlags: unknown[];
};
