/**
 * Project Sharing Service
 * Manages project sharing and collaborator permissions
 */

export type PermissionLevel = 'view' | 'edit' | 'admin';

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: PermissionLevel;
  addedAt: Date;
  lastActive?: Date;
}

export interface SharedProject {
  id: string;
  name: string;
  owner: string;
  collaborators: Collaborator[];
  isPublic: boolean;
  shareLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShareInvitation {
  id: string;
  projectId: string;
  invitedEmail: string;
  role: PermissionLevel;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  expiresAt: Date;
}

export class ProjectSharingService {
  private sharedProjects: Map<string, SharedProject> = new Map();
  private invitations: Map<string, ShareInvitation> = new Map();
  private shareLinks: Map<string, string> = new Map(); // shareLink -> projectId

  /**
   * Create shareable project
   */
  createShareableProject(
    projectId: string,
    projectName: string,
    ownerId: string
  ): SharedProject {
    const project: SharedProject = {
      id: projectId,
      name: projectName,
      owner: ownerId,
      collaborators: [],
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sharedProjects.set(projectId, project);
    return project;
  }

  /**
   * Add collaborator to project
   */
  addCollaborator(
    projectId: string,
    collaboratorId: string,
    collaboratorName: string,
    collaboratorEmail: string,
    role: PermissionLevel
  ): Collaborator | null {
    const project = this.sharedProjects.get(projectId);
    if (!project) return null;

    const collaborator: Collaborator = {
      id: collaboratorId,
      name: collaboratorName,
      email: collaboratorEmail,
      role,
      addedAt: new Date(),
      lastActive: new Date(),
    };

    project.collaborators.push(collaborator);
    project.updatedAt = new Date();

    return collaborator;
  }

  /**
   * Remove collaborator from project
   */
  removeCollaborator(projectId: string, collaboratorId: string): boolean {
    const project = this.sharedProjects.get(projectId);
    if (!project) return false;

    const initialLength = project.collaborators.length;
    project.collaborators = project.collaborators.filter(c => c.id !== collaboratorId);
    project.updatedAt = new Date();

    return project.collaborators.length < initialLength;
  }

  /**
   * Update collaborator permission
   */
  updateCollaboratorPermission(
    projectId: string,
    collaboratorId: string,
    newRole: PermissionLevel
  ): boolean {
    const project = this.sharedProjects.get(projectId);
    if (!project) return false;

    const collaborator = project.collaborators.find(c => c.id === collaboratorId);
    if (!collaborator) return false;

    collaborator.role = newRole;
    project.updatedAt = new Date();

    return true;
  }

  /**
   * Send collaboration invitation
   */
  sendInvitation(
    projectId: string,
    invitedEmail: string,
    role: PermissionLevel,
    expirationDays: number = 7
  ): ShareInvitation | null {
    const project = this.sharedProjects.get(projectId);
    if (!project) return null;

    const invitationId = `invite-${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const invitation: ShareInvitation = {
      id: invitationId,
      projectId,
      invitedEmail,
      role,
      status: 'pending',
      createdAt: new Date(),
      expiresAt,
    };

    this.invitations.set(invitationId, invitation);
    return invitation;
  }

  /**
   * Accept collaboration invitation
   */
  acceptInvitation(
    invitationId: string,
    collaboratorId: string,
    collaboratorName: string
  ): boolean {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) return false;

    if (new Date() > invitation.expiresAt) {
      return false; // Invitation expired
    }

    const project = this.sharedProjects.get(invitation.projectId);
    if (!project) return false;

    this.addCollaborator(
      invitation.projectId,
      collaboratorId,
      collaboratorName,
      invitation.invitedEmail,
      invitation.role
    );

    invitation.status = 'accepted';
    return true;
  }

  /**
   * Decline collaboration invitation
   */
  declineInvitation(invitationId: string): boolean {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) return false;

    invitation.status = 'declined';
    return true;
  }

  /**
   * Generate public share link
   */
  generateShareLink(projectId: string): string | null {
    const project = this.sharedProjects.get(projectId);
    if (!project) return null;

    if (project.shareLink) {
      return project.shareLink;
    }

    const shareLink = `share-${Math.random().toString(36).substr(2, 9)}`;
    project.shareLink = shareLink;
    project.isPublic = true;
    this.shareLinks.set(shareLink, projectId);

    return shareLink;
  }

  /**
   * Revoke public share link
   */
  revokeShareLink(projectId: string): boolean {
    const project = this.sharedProjects.get(projectId);
    if (!project || !project.shareLink) return false;

    this.shareLinks.delete(project.shareLink);
    project.shareLink = undefined;
    project.isPublic = false;

    return true;
  }

  /**
   * Get project by share link
   */
  getProjectByShareLink(shareLink: string): SharedProject | null {
    const projectId = this.shareLinks.get(shareLink);
    if (!projectId) return null;

    return this.sharedProjects.get(projectId) || null;
  }

  /**
   * Get all collaborators for project
   */
  getCollaborators(projectId: string): Collaborator[] {
    const project = this.sharedProjects.get(projectId);
    return project?.collaborators || [];
  }

  /**
   * Get all pending invitations for project
   */
  getPendingInvitations(projectId: string): ShareInvitation[] {
    return Array.from(this.invitations.values()).filter(
      inv => inv.projectId === projectId && inv.status === 'pending'
    );
  }

  /**
   * Check if user has permission
   */
  hasPermission(
    projectId: string,
    userId: string,
    requiredPermission: PermissionLevel
  ): boolean {
    const project = this.sharedProjects.get(projectId);
    if (!project) return false;

    if (project.owner === userId) return true; // Owner has all permissions

    const collaborator = project.collaborators.find(c => c.id === userId);
    if (!collaborator) return false;

    const permissionHierarchy: Record<PermissionLevel, number> = {
      view: 1,
      edit: 2,
      admin: 3,
    };

    return permissionHierarchy[collaborator.role] >= permissionHierarchy[requiredPermission];
  }

  /**
   * Get shared project info
   */
  getSharedProject(projectId: string): SharedProject | null {
    return this.sharedProjects.get(projectId) || null;
  }

  /**
   * Get all shared projects
   */
  getAllSharedProjects(): SharedProject[] {
    return Array.from(this.sharedProjects.values());
  }

  /**
   * Get sharing statistics
   */
  getSharingStats() {
    const projects = Array.from(this.sharedProjects.values());
    return {
      totalProjects: projects.length,
      publicProjects: projects.filter(p => p.isPublic).length,
      totalCollaborators: projects.reduce((sum, p) => sum + p.collaborators.length, 0),
      pendingInvitations: Array.from(this.invitations.values()).filter(
        i => i.status === 'pending'
      ).length,
      acceptedInvitations: Array.from(this.invitations.values()).filter(
        i => i.status === 'accepted'
      ).length,
    };
  }
}

export default new ProjectSharingService();
