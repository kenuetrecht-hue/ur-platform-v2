/**
 * Real-Time Collaboration Tools Service
 * Enable team collaboration on content projects with real-time editing
 */

import { z } from "zod";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export type PermissionLevel = "view" | "comment" | "edit" | "admin";
export type CommentType = "text" | "annotation" | "suggestion" | "question";
export type ProjectStatus = "draft" | "in-progress" | "review" | "completed" | "archived";

export interface Collaborator {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: "creator" | "editor" | "reviewer" | "viewer";
  permissionLevel: PermissionLevel;
  joinedAt: number;
  lastActiveAt: number;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  type: CommentType;
  timestamp: number;
  resolved: boolean;
  replies: Comment[];
  mentions: string[];
  attachments?: string[];
}

export interface ProjectVersion {
  id: string;
  versionNumber: number;
  createdBy: string;
  createdAt: number;
  description?: string;
  content: Record<string, any>;
  changes?: string[];
}

export interface CollaborativeProject {
  id: string;
  creatorId: string;
  name: string;
  description?: string;
  contentType: "video" | "audio" | "text" | "image" | "3d";
  status: ProjectStatus;
  collaborators: Collaborator[];
  currentContent: Record<string, any>;
  versions: ProjectVersion[];
  comments: Comment[];
  activeUsers: Set<string>;
  createdAt: number;
  updatedAt: number;
  lastModifiedBy: string;
}

export interface CollaborationActivity {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  action: "edit" | "comment" | "join" | "leave" | "version_created" | "resolved_comment";
  description: string;
  timestamp: number;
  data?: Record<string, any>;
}

// ============================================================================
// COLLABORATION TOOLS SERVICE
// ============================================================================

class CollaborationTools {
  private projects: Map<string, CollaborativeProject> = new Map();
  private activityLog: Map<string, CollaborationActivity[]> = new Map();
  private activeConnections: Map<string, Set<string>> = new Map(); // projectId -> userIds

  /**
   * Create collaborative project
   */
  createProject(
    creatorId: string,
    name: string,
    contentType: "video" | "audio" | "text" | "image" | "3d",
    description?: string
  ): CollaborativeProject {
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const project: CollaborativeProject = {
      id: projectId,
      creatorId,
      name,
      description,
      contentType,
      status: "draft",
      collaborators: [
        {
          userId: creatorId,
          name: "Creator",
          email: "",
          role: "creator",
          permissionLevel: "admin",
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
        },
      ],
      currentContent: {},
      versions: [
        {
          id: `v_${Date.now()}`,
          versionNumber: 1,
          createdBy: creatorId,
          createdAt: Date.now(),
          description: "Initial version",
          content: {},
        },
      ],
      comments: [],
      activeUsers: new Set([creatorId]),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: creatorId,
    };

    this.projects.set(projectId, project);
    this.activeConnections.set(projectId, new Set([creatorId]));
    this.activityLog.set(projectId, []);

    return project;
  }

  /**
   * Get project
   */
  getProject(projectId: string): CollaborativeProject | undefined {
    return this.projects.get(projectId);
  }

  /**
   * Add collaborator
   */
  addCollaborator(
    projectId: string,
    userId: string,
    name: string,
    email: string,
    role: "editor" | "reviewer" | "viewer",
    permissionLevel: PermissionLevel
  ): CollaborativeProject | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;

    // Check if already a collaborator
    if (project.collaborators.find((c) => c.userId === userId)) {
      return project;
    }

    const collaborator: Collaborator = {
      userId,
      name,
      email,
      role,
      permissionLevel,
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    project.collaborators.push(collaborator);
    project.updatedAt = Date.now();

    this.logActivity(projectId, userId, name, "join", `${name} joined the project`);

    return project;
  }

  /**
   * Remove collaborator
   */
  removeCollaborator(projectId: string, userId: string): CollaborativeProject | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;

    const collaborator = project.collaborators.find((c) => c.userId === userId);
    if (!collaborator) return undefined;

    project.collaborators = project.collaborators.filter((c) => c.userId !== userId);
    project.activeUsers.delete(userId);
    project.updatedAt = Date.now();

    this.logActivity(projectId, userId, collaborator.name, "leave", `${collaborator.name} left the project`);

    return project;
  }

  /**
   * Update collaborator permission
   */
  updateCollaboratorPermission(
    projectId: string,
    userId: string,
    permissionLevel: PermissionLevel
  ): CollaborativeProject | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;

    const collaborator = project.collaborators.find((c) => c.userId === userId);
    if (!collaborator) return undefined;

    collaborator.permissionLevel = permissionLevel;
    project.updatedAt = Date.now();

    return project;
  }

  /**
   * Update project content
   */
  updateProjectContent(projectId: string, userId: string, userName: string, content: Record<string, any>): CollaborativeProject | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;

    const collaborator = project.collaborators.find((c) => c.userId === userId);
    if (!collaborator || collaborator.permissionLevel !== "edit" && collaborator.permissionLevel !== "admin") {
      return undefined;
    }

    project.currentContent = content;
    project.lastModifiedBy = userId;
    project.updatedAt = Date.now();

    this.logActivity(projectId, userId, userName, "edit", `${userName} updated the project content`);

    return project;
  }

  /**
   * Add comment
   */
  addComment(
    projectId: string,
    userId: string,
    userName: string,
    content: string,
    type: CommentType,
    mentions?: string[],
    attachments?: string[]
  ): Comment | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;

    const comment: Comment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      authorId: userId,
      authorName: userName,
      content,
      type,
      timestamp: Date.now(),
      resolved: false,
      replies: [],
      mentions: mentions || [],
      attachments,
    };

    project.comments.push(comment);
    project.updatedAt = Date.now();

    this.logActivity(projectId, userId, userName, "comment", `${userName} added a ${type} comment`);

    return comment;
  }

  /**
   * Reply to comment
   */
  replyToComment(
    projectId: string,
    commentId: string,
    userId: string,
    userName: string,
    content: string,
    mentions?: string[]
  ): Comment | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;

    const findAndReply = (comments: Comment[]): Comment | undefined => {
      for (const comment of comments) {
        if (comment.id === commentId) {
          const reply: Comment = {
            id: `cmt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            authorId: userId,
            authorName: userName,
            content,
            type: "text",
            timestamp: Date.now(),
            resolved: false,
            replies: [],
            mentions: mentions || [],
          };

          comment.replies.push(reply);
          return reply;
        }

        const nestedReply = findAndReply(comment.replies);
        if (nestedReply) return nestedReply;
      }

      return undefined;
    };

    const reply = findAndReply(project.comments);
    if (reply) {
      project.updatedAt = Date.now();
    }

    return reply;
  }

  /**
   * Resolve comment
   */
  resolveComment(projectId: string, commentId: string, userId: string, userName: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    const findAndResolve = (comments: Comment[]): boolean => {
      for (const comment of comments) {
        if (comment.id === commentId) {
          comment.resolved = true;
          project.updatedAt = Date.now();
          this.logActivity(projectId, userId, userName, "resolved_comment", `${userName} resolved a comment`);
          return true;
        }

        if (findAndResolve(comment.replies)) {
          return true;
        }
      }

      return false;
    };

    return findAndResolve(project.comments);
  }

  /**
   * Create version
   */
  createVersion(projectId: string, userId: string, description?: string): ProjectVersion | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;

    const versionNumber = project.versions.length + 1;
    const version: ProjectVersion = {
      id: `v_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      versionNumber,
      createdBy: userId,
      createdAt: Date.now(),
      description,
      content: JSON.parse(JSON.stringify(project.currentContent)),
    };

    project.versions.push(version);
    project.updatedAt = Date.now();

    this.logActivity(projectId, userId, "System", "version_created", `Version ${versionNumber} created`);

    return version;
  }

  /**
   * Get project versions
   */
  getProjectVersions(projectId: string): ProjectVersion[] {
    const project = this.projects.get(projectId);
    if (!project) return [];

    return project.versions;
  }

  /**
   * Restore version
   */
  restoreVersion(projectId: string, versionId: string, userId: string): CollaborativeProject | undefined {
    const project = this.projects.get(projectId);
    if (!project) return undefined;

    const version = project.versions.find((v) => v.id === versionId);
    if (!version) return undefined;

    project.currentContent = JSON.parse(JSON.stringify(version.content));
    project.lastModifiedBy = userId;
    project.updatedAt = Date.now();

    this.logActivity(projectId, userId, "System", "edit", `Restored to version ${version.versionNumber}`);

    return project;
  }

  /**
   * User joined project
   */
  userJoined(projectId: string, userId: string): void {
    const connections = this.activeConnections.get(projectId);
    if (connections) {
      connections.add(userId);
    }

    const project = this.projects.get(projectId);
    if (project) {
      const collaborator = project.collaborators.find((c) => c.userId === userId);
      if (collaborator) {
        collaborator.lastActiveAt = Date.now();
      }
    }
  }

  /**
   * User left project
   */
  userLeft(projectId: string, userId: string): void {
    const connections = this.activeConnections.get(projectId);
    if (connections) {
      connections.delete(userId);
    }
  }

  /**
   * Get active users
   */
  getActiveUsers(projectId: string): string[] {
    const connections = this.activeConnections.get(projectId);
    return connections ? Array.from(connections) : [];
  }

  /**
   * Get activity log
   */
  getActivityLog(projectId: string, limit: number = 50): CollaborationActivity[] {
    const activities = this.activityLog.get(projectId) || [];
    return activities.slice(-limit);
  }

  /**
   * Log activity
   */
  private logActivity(projectId: string, userId: string, userName: string, action: any, description: string): void {
    const activity: CollaborationActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      projectId,
      userId,
      userName,
      action,
      description,
      timestamp: Date.now(),
    };

    if (!this.activityLog.has(projectId)) {
      this.activityLog.set(projectId, []);
    }

    this.activityLog.get(projectId)!.push(activity);
  }

  /**
   * Get unresolved comments
   */
  getUnresolvedComments(projectId: string): Comment[] {
    const project = this.projects.get(projectId);
    if (!project) return [];

    const collectUnresolved = (comments: Comment[]): Comment[] => {
      let unresolved: Comment[] = [];

      comments.forEach((comment) => {
        if (!comment.resolved) {
          unresolved.push(comment);
        }
        unresolved = unresolved.concat(collectUnresolved(comment.replies));
      });

      return unresolved;
    };

    return collectUnresolved(project.comments);
  }

  /**
   * Get creator projects
   */
  getCreatorProjects(creatorId: string, status?: ProjectStatus): CollaborativeProject[] {
    return Array.from(this.projects.values())
      .filter((p) => p.creatorId === creatorId && (!status || p.status === status))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Reset all state (for testing)
   */
  reset(): void {
    this.projects.clear();
    this.activityLog.clear();
    this.activeConnections.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let collaborationInstance: CollaborationTools | null = null;

export function getCollaborationTools(): CollaborationTools {
  if (!collaborationInstance) {
    collaborationInstance = new CollaborationTools();
  }
  return collaborationInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetCollaborationTools(): void {
  if (collaborationInstance) {
    collaborationInstance.reset();
  }
  collaborationInstance = null;
}

export default CollaborationTools;
