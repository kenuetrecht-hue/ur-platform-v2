/**
 * Crisis Incident Logger
 * Logs all crisis incidents for admin review and follow-up
 */

export interface CrisisIncident {
  id: string;
  userId: string;
  username: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'self_harm' | 'suicide' | 'violence' | 'none';
  message: string;
  keywords: string[];
  timestamp: Date;
  adminNotified: boolean;
  adminNotifiedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes: string;
  followUpScheduled: boolean;
  followUpDate?: Date;
  resourcesProvided: string[];
}

/**
 * Crisis Incident Logger Service
 */
export class CrisisIncidentLogger {
  private incidents: CrisisIncident[] = [];

  /**
   * Log a crisis incident
   */
  logIncident(
    userId: string,
    username: string,
    severity: string,
    category: string,
    message: string,
    keywords: string[]
  ): CrisisIncident {
    const incident: CrisisIncident = {
      id: `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      username,
      severity: severity as any,
      category: category as any,
      message,
      keywords,
      timestamp: new Date(),
      adminNotified: false,
      resolved: false,
      notes: '',
      followUpScheduled: false,
      resourcesProvided: [],
    };

    this.incidents.push(incident);

    // TODO: Save to database
    console.log('[Crisis Incident Logged]', incident);

    return incident;
  }

  /**
   * Mark incident as admin notified
   */
  markAdminNotified(incidentId: string): void {
    const incident = this.incidents.find((i) => i.id === incidentId);
    if (incident) {
      incident.adminNotified = true;
      incident.adminNotifiedAt = new Date();
      console.log('[Admin Notified]', incidentId);
    }
  }

  /**
   * Resolve an incident
   */
  resolveIncident(incidentId: string, resolvedBy: string, notes: string): void {
    const incident = this.incidents.find((i) => i.id === incidentId);
    if (incident) {
      incident.resolved = true;
      incident.resolvedAt = new Date();
      incident.resolvedBy = resolvedBy;
      incident.notes = notes;
      console.log('[Incident Resolved]', incidentId);
    }
  }

  /**
   * Schedule follow-up
   */
  scheduleFollowUp(incidentId: string, followUpDate: Date): void {
    const incident = this.incidents.find((i) => i.id === incidentId);
    if (incident) {
      incident.followUpScheduled = true;
      incident.followUpDate = followUpDate;
      console.log('[Follow-up Scheduled]', incidentId, followUpDate);
    }
  }

  /**
   * Add resources provided to user
   */
  addResourcesProvided(incidentId: string, resources: string[]): void {
    const incident = this.incidents.find((i) => i.id === incidentId);
    if (incident) {
      incident.resourcesProvided = [...new Set([...incident.resourcesProvided, ...resources])];
    }
  }

  /**
   * Get all incidents (for admin dashboard)
   */
  getAllIncidents(): CrisisIncident[] {
    return this.incidents;
  }

  /**
   * Get unresolved incidents
   */
  getUnresolvedIncidents(): CrisisIncident[] {
    return this.incidents.filter((i) => !i.resolved);
  }

  /**
   * Get incidents for a specific user
   */
  getUserIncidents(userId: string): CrisisIncident[] {
    return this.incidents.filter((i) => i.userId === userId);
  }

  /**
   * Get critical incidents
   */
  getCriticalIncidents(): CrisisIncident[] {
    return this.incidents.filter((i) => i.severity === 'critical' && !i.resolved);
  }

  /**
   * Get incidents by date range
   */
  getIncidentsByDateRange(startDate: Date, endDate: Date): CrisisIncident[] {
    return this.incidents.filter(
      (i) => i.timestamp >= startDate && i.timestamp <= endDate
    );
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      totalIncidents: this.incidents.length,
      unresolvedIncidents: this.incidents.filter((i) => !i.resolved).length,
      criticalIncidents: this.incidents.filter((i) => i.severity === 'critical').length,
      incidentsByCategory: {
        selfHarm: this.incidents.filter((i) => i.category === 'self_harm').length,
        suicide: this.incidents.filter((i) => i.category === 'suicide').length,
        violence: this.incidents.filter((i) => i.category === 'violence').length,
      },
      incidentsBySeverity: {
        low: this.incidents.filter((i) => i.severity === 'low').length,
        medium: this.incidents.filter((i) => i.severity === 'medium').length,
        high: this.incidents.filter((i) => i.severity === 'high').length,
        critical: this.incidents.filter((i) => i.severity === 'critical').length,
      },
    };
  }
}

/**
 * Singleton instance
 */
let logger: CrisisIncidentLogger | null = null;

export function getCrisisIncidentLogger(): CrisisIncidentLogger {
  if (!logger) {
    logger = new CrisisIncidentLogger();
  }
  return logger;
}

export default getCrisisIncidentLogger;
