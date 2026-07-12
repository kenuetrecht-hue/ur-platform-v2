/**
 * Session Persistence Service
 * Saves and restores editing sessions to/from database
 */

export interface EditingSession {
  id: string;
  creatorId: string;
  type: 'video' | 'audio' | 'content';
  name: string;
  description?: string;
  inputFile: string;
  operations: Record<string, any>;
  status: 'draft' | 'processing' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata: {
    duration?: number;
    fileSize?: number;
    format?: string;
    tags?: string[];
  };
}

export interface SessionSnapshot {
  sessionId: string;
  timestamp: Date;
  state: Record<string, any>;
  version: number;
}

export class SessionPersistence {
  private sessions: Map<string, EditingSession> = new Map();
  private snapshots: Map<string, SessionSnapshot[]> = new Map();
  private creatorSessions: Map<string, string[]> = new Map();

  /**
   * Create and save a new session
   */
  createSession(
    creatorId: string,
    type: 'video' | 'audio' | 'content',
    inputFile: string,
    name: string,
    description?: string
  ): EditingSession {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: EditingSession = {
      id: sessionId,
      creatorId,
      type,
      name,
      description,
      inputFile,
      operations: {},
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.sessions.set(sessionId, session);

    // Track creator sessions
    if (!this.creatorSessions.has(creatorId)) {
      this.creatorSessions.set(creatorId, []);
    }
    this.creatorSessions.get(creatorId)!.push(sessionId);

    // Create initial snapshot
    this.createSnapshot(sessionId, session.operations);

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): EditingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a creator
   */
  getCreatorSessions(creatorId: string): EditingSession[] {
    const sessionIds = this.creatorSessions.get(creatorId) || [];
    return sessionIds
      .map((id) => this.sessions.get(id))
      .filter((s) => s !== undefined) as EditingSession[];
  }

  /**
   * Update session operations
   */
  updateSessionOperations(sessionId: string, operations: Record<string, any>): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.operations = { ...session.operations, ...operations };
    session.updatedAt = new Date();

    // Create snapshot after update
    this.createSnapshot(sessionId, session.operations);

    return true;
  }

  /**
   * Update session metadata
   */
  updateSessionMetadata(
    sessionId: string,
    metadata: Partial<EditingSession['metadata']>
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.metadata = { ...session.metadata, ...metadata };
    session.updatedAt = new Date();

    return true;
  }

  /**
   * Mark session as completed
   */
  completeSession(sessionId: string, outputFile?: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.status = 'completed';
    session.completedAt = new Date();
    session.updatedAt = new Date();

    if (outputFile) {
      session.metadata.format = outputFile.split('.').pop();
    }

    return true;
  }

  /**
   * Archive session
   */
  archiveSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.status = 'archived';
    session.updatedAt = new Date();

    return true;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Remove from creator sessions
    const creatorSessions = this.creatorSessions.get(session.creatorId);
    if (creatorSessions) {
      const index = creatorSessions.indexOf(sessionId);
      if (index > -1) {
        creatorSessions.splice(index, 1);
      }
    }

    // Remove session and snapshots
    this.sessions.delete(sessionId);
    this.snapshots.delete(sessionId);

    return true;
  }

  /**
   * Create snapshot of session state
   */
  private createSnapshot(sessionId: string, state: Record<string, any>): void {
    if (!this.snapshots.has(sessionId)) {
      this.snapshots.set(sessionId, []);
    }

    const snapshots = this.snapshots.get(sessionId)!;
    const snapshot: SessionSnapshot = {
      sessionId,
      timestamp: new Date(),
      state: JSON.parse(JSON.stringify(state)), // Deep copy
      version: snapshots.length + 1,
    };

    snapshots.push(snapshot);

    // Keep only last 50 snapshots to manage memory
    if (snapshots.length > 50) {
      snapshots.shift();
    }
  }

  /**
   * Get session snapshots
   */
  getSnapshots(sessionId: string): SessionSnapshot[] {
    return this.snapshots.get(sessionId) || [];
  }

  /**
   * Restore session to specific snapshot
   */
  restoreSnapshot(sessionId: string, version: number): boolean {
    const snapshots = this.snapshots.get(sessionId);
    if (!snapshots || version < 1 || version > snapshots.length) {
      return false;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const snapshot = snapshots[version - 1];
    session.operations = JSON.parse(JSON.stringify(snapshot.state)); // Deep copy
    session.updatedAt = new Date();

    return true;
  }

  /**
   * Get session statistics for creator
   */
  getCreatorStatistics(creatorId: string): {
    totalSessions: number;
    completedSessions: number;
    draftSessions: number;
    archivedSessions: number;
    totalOperations: number;
  } {
    const sessions = this.getCreatorSessions(creatorId);

    return {
      totalSessions: sessions.length,
      completedSessions: sessions.filter((s) => s.status === 'completed').length,
      draftSessions: sessions.filter((s) => s.status === 'draft').length,
      archivedSessions: sessions.filter((s) => s.status === 'archived').length,
      totalOperations: sessions.reduce((sum, s) => sum + Object.keys(s.operations).length, 0),
    };
  }

  /**
   * Export session for sharing
   */
  exportSession(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return JSON.stringify(session, null, 2);
  }

  /**
   * Import session from export
   */
  importSession(creatorId: string, exportData: string): EditingSession | null {
    try {
      const data = JSON.parse(exportData);

      // Validate required fields
      if (!data.type || !data.inputFile || !data.name) {
        return null;
      }

      // Create new session with imported data
      const session = this.createSession(creatorId, data.type, data.inputFile, data.name, data.description);

      // Import operations and metadata
      if (data.operations) {
        session.operations = data.operations;
      }
      if (data.metadata) {
        session.metadata = data.metadata;
      }

      return session;
    } catch (error) {
      console.error('Failed to import session:', error);
      return null;
    }
  }

  /**
   * Get all sessions (admin only)
   */
  getAllSessions(): EditingSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get database statistics
   */
  getDatabaseStatistics(): {
    totalSessions: number;
    totalCreators: number;
    sessionsByType: Record<string, number>;
    sessionsByStatus: Record<string, number>;
  } {
    const sessions = Array.from(this.sessions.values());

    const sessionsByType: Record<string, number> = { video: 0, audio: 0, content: 0 };
    const sessionsByStatus: Record<string, number> = {
      draft: 0,
      processing: 0,
      completed: 0,
      archived: 0,
    };

    sessions.forEach((s) => {
      sessionsByType[s.type]++;
      sessionsByStatus[s.status]++;
    });

    return {
      totalSessions: sessions.length,
      totalCreators: this.creatorSessions.size,
      sessionsByType,
      sessionsByStatus,
    };
  }
}

export { SessionPersistence };
export const sessionPersistence = new SessionPersistence();
