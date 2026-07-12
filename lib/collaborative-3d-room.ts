/**
 * Collaborative 3D Room Service
 * 
 * Enables multi-user 3D collaboration with AI agents, job-specific uniforms/tools,
 * real-time synchronization, and advanced design capabilities.
 */

export interface AIAgent3D {
  agentId: string;
  name: string;
  role: 'architect' | 'engineer' | 'landscaper' | 'roboticist' | 'designer' | 'custom';
  voiceProfile: {
    pitch: number;
    speed: number;
    tone: 'professional' | 'friendly' | 'technical';
  };
  appearance: {
    modelUrl: string;
    uniformColor: string;
    uniformLabel: string; // e.g., "AI Architect"
    toolsHeld: string[]; // e.g., ["blueprint", "measuring_tape"]
    logoBackgroundUrl?: string;
  };
  position: Vector3D;
  rotation: Vector3D;
  isActive: boolean;
  capabilities: string[];
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface CollaborativeRoom {
  roomId: string;
  name: string;
  creatorId: string;
  projectType: 'architecture' | 'engineering' | 'landscaping' | 'robotics' | '3d_printing' | 'general';
  agents: AIAgent3D[];
  participants: RoomParticipant[];
  environment: RoomEnvironment;
  designObjects: DesignObject[];
  collaborationHistory: CollaborationEvent[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface RoomParticipant {
  userId: string;
  username: string;
  role: 'owner' | 'editor' | 'viewer' | 'commenter';
  joinedAt: Date;
  lastActiveAt: Date;
  cursorPosition?: Vector3D;
  selectedObject?: string;
}

export interface RoomEnvironment {
  lighting: {
    ambientIntensity: number;
    directionalLight: Vector3D;
    shadowQuality: 'low' | 'medium' | 'high';
  };
  camera: {
    position: Vector3D;
    target: Vector3D;
    fov: number;
  };
  backgroundColor: string;
  gridEnabled: boolean;
  gridSize: number;
  realWorldImagery?: {
    imageUrl: string;
    scale: number; // meters per pixel
    position: Vector3D;
  };
}

export interface DesignObject {
  objectId: string;
  type: 'mesh' | 'blueprint' | 'annotation' | 'measurement' | 'image_reference';
  name: string;
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  material?: {
    color: string;
    metallic: number;
    roughness: number;
  };
  geometry?: {
    type: string;
    dimensions: Record<string, number>;
  };
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollaborationEvent {
  eventId: string;
  type: 'agent_action' | 'object_created' | 'object_modified' | 'object_deleted' | 'participant_joined' | 'participant_left' | 'comment_added' | 'measurement_taken' | 'design_suggestion';
  actor: string;
  timestamp: Date;
  data: Record<string, any>;
  affectedObjects?: string[];
}

export interface AgentAction {
  actionId: string;
  agentId: string;
  actionType: 'move' | 'rotate' | 'place_object' | 'measure' | 'analyze' | 'suggest_modification' | 'collaborate_with_agent';
  targetObject?: string;
  parameters: Record<string, any>;
  result?: string;
  timestamp: Date;
}

export interface DesignSuggestion {
  suggestionId: string;
  agentId: string;
  title: string;
  description: string;
  affectedObjects: string[];
  confidence: number; // 0-100
  implementationSteps: string[];
  estimatedImpact: {
    complexity: 'low' | 'medium' | 'high';
    timeRequired: number; // minutes
    resourcesNeeded: string[];
  };
  createdAt: Date;
}

export class Collaborative3DRoomService {
  private rooms: Map<string, CollaborativeRoom> = new Map();
  private agents: Map<string, AIAgent3D> = new Map();
  private agentActions: Map<string, AgentAction[]> = new Map();
  private designSuggestions: Map<string, DesignSuggestion[]> = new Map();
  private roomSessions: Map<string, Map<string, RoomParticipant>> = new Map(); // roomId -> participants

  /**
   * Create a new collaborative 3D room
   */
  createRoom(
    creatorId: string,
    name: string,
    projectType: CollaborativeRoom['projectType']
  ): CollaborativeRoom {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const room: CollaborativeRoom = {
      roomId,
      name,
      creatorId,
      projectType,
      agents: [],
      participants: [],
      environment: {
        lighting: {
          ambientIntensity: 0.8,
          directionalLight: { x: 1, y: 1, z: 1 },
          shadowQuality: 'high',
        },
        camera: {
          position: { x: 0, y: 5, z: 10 },
          target: { x: 0, y: 0, z: 0 },
          fov: 75,
        },
        backgroundColor: '#87CEEB',
        gridEnabled: true,
        gridSize: 1,
      },
      designObjects: [],
      collaborationHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    this.rooms.set(roomId, room);
    this.roomSessions.set(roomId, new Map());
    return room;
  }

  /**
   * Add AI agent to room
   */
  addAgentToRoom(roomId: string, agent: Omit<AIAgent3D, 'agentId' | 'isActive'>): AIAgent3D {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullAgent: AIAgent3D = {
      ...agent,
      agentId,
      isActive: true,
    };

    this.agents.set(agentId, fullAgent);
    room.agents.push(fullAgent);
    room.updatedAt = new Date();

    // Log event
    this.logEvent(roomId, {
      type: 'agent_action',
      actor: 'system',
      data: { action: 'agent_added', agentId, agentName: agent.name },
    });

    return fullAgent;
  }

  /**
   * Add participant to room
   */
  joinRoom(roomId: string, userId: string, username: string): RoomParticipant {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const participant: RoomParticipant = {
      userId,
      username,
      role: 'editor',
      joinedAt: new Date(),
      lastActiveAt: new Date(),
    };

    room.participants.push(participant);
    this.roomSessions.get(roomId)?.set(userId, participant);
    room.updatedAt = new Date();

    this.logEvent(roomId, {
      type: 'participant_joined',
      actor: userId,
      data: { username },
    });

    return participant;
  }

  /**
   * Remove participant from room
   */
  leaveRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const index = room.participants.findIndex(p => p.userId === userId);
    if (index === -1) return false;

    room.participants.splice(index, 1);
    this.roomSessions.get(roomId)?.delete(userId);
    room.updatedAt = new Date();

    this.logEvent(roomId, {
      type: 'participant_left',
      actor: userId,
      data: {},
    });

    return true;
  }

  /**
   * Add design object to room
   */
  addDesignObject(
    roomId: string,
    createdBy: string,
    object: Omit<DesignObject, 'objectId' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): DesignObject {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const objectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const designObject: DesignObject = {
      ...object,
      objectId,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    room.designObjects.push(designObject);
    room.updatedAt = new Date();

    this.logEvent(roomId, {
      type: 'object_created',
      actor: createdBy,
      data: { objectId, objectType: object.type, objectName: object.name },
      affectedObjects: [objectId],
    });

    return designObject;
  }

  /**
   * Update design object
   */
  updateDesignObject(
    roomId: string,
    objectId: string,
    updatedBy: string,
    updates: Partial<Omit<DesignObject, 'objectId' | 'createdAt' | 'createdBy'>>
  ): DesignObject | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const object = room.designObjects.find(o => o.objectId === objectId);
    if (!object) return null;

    Object.assign(object, updates, { updatedAt: new Date() });
    room.updatedAt = new Date();

    this.logEvent(roomId, {
      type: 'object_modified',
      actor: updatedBy,
      data: { objectId, updates },
      affectedObjects: [objectId],
    });

    return object;
  }

  /**
   * Delete design object
   */
  deleteDesignObject(roomId: string, objectId: string, deletedBy: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const index = room.designObjects.findIndex(o => o.objectId === objectId);
    if (index === -1) return false;

    room.designObjects.splice(index, 1);
    room.updatedAt = new Date();

    this.logEvent(roomId, {
      type: 'object_deleted',
      actor: deletedBy,
      data: { objectId },
      affectedObjects: [objectId],
    });

    return true;
  }

  /**
   * Execute agent action in room
   */
  executeAgentAction(
    roomId: string,
    agentId: string,
    actionType: AgentAction['actionType'],
    parameters: Record<string, any>
  ): AgentAction {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const agent = room.agents.find(a => a.agentId === agentId);
    if (!agent) throw new Error('Agent not found in room');

    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const action: AgentAction = {
      actionId,
      agentId,
      actionType,
      parameters,
      timestamp: new Date(),
    };

    // Process action based on type
    let result = '';
    const affectedObjects: string[] = [];

    switch (actionType) {
      case 'move':
        agent.position = parameters.targetPosition;
        result = `Agent moved to ${JSON.stringify(parameters.targetPosition)}`;
        break;

      case 'rotate':
        agent.rotation = parameters.targetRotation;
        result = `Agent rotated to ${JSON.stringify(parameters.targetRotation)}`;
        break;

      case 'place_object':
        const newObject = this.addDesignObject(roomId, agentId, {
          type: parameters.objectType || 'mesh',
          name: parameters.objectName || `Object by ${agent.name}`,
          position: parameters.position,
          rotation: parameters.rotation || { x: 0, y: 0, z: 0 },
          scale: parameters.scale || { x: 1, y: 1, z: 1 },
          material: parameters.material,
          geometry: parameters.geometry,
          metadata: parameters.metadata,
        });
        action.targetObject = newObject.objectId;
        affectedObjects.push(newObject.objectId);
        result = `Object placed: ${newObject.name}`;
        break;

      case 'measure':
        const obj1 = room.designObjects.find(o => o.objectId === parameters.object1Id);
        const obj2 = room.designObjects.find(o => o.objectId === parameters.object2Id);
        if (obj1 && obj2) {
          const distance = this.calculateDistance(obj1.position, obj2.position);
          result = `Distance measured: ${distance.toFixed(2)} units`;
          affectedObjects.push(parameters.object1Id, parameters.object2Id);
        }
        break;

      case 'analyze':
        result = `Analysis complete: ${parameters.analysisType || 'general'}`;
        if (parameters.targetObjectId) {
          affectedObjects.push(parameters.targetObjectId);
        }
        break;

      case 'suggest_modification':
        const suggestion = this.createDesignSuggestion(
          roomId,
          agentId,
          parameters.title,
          parameters.description,
          parameters.affectedObjects || [],
          parameters.confidence || 75
        );
        result = `Suggestion created: ${suggestion.suggestionId}`;
        affectedObjects.push(...(parameters.affectedObjects || []));
        break;

      case 'collaborate_with_agent':
        const targetAgent = room.agents.find(a => a.agentId === parameters.targetAgentId);
        if (targetAgent) {
          result = `${agent.name} collaborating with ${targetAgent.name}`;
        }
        break;
    }

    action.result = result;

    // Store action history
    if (!this.agentActions.has(agentId)) {
      this.agentActions.set(agentId, []);
    }
    this.agentActions.get(agentId)!.push(action);

    // Log event
    this.logEvent(roomId, {
      type: 'agent_action',
      actor: agentId,
      data: { actionType, parameters, result },
      affectedObjects,
    });

    return action;
  }

  /**
   * Create design suggestion from AI agent
   */
  private createDesignSuggestion(
    roomId: string,
    agentId: string,
    title: string,
    description: string,
    affectedObjects: string[],
    confidence: number
  ): DesignSuggestion {
    const suggestionId = `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const suggestion: DesignSuggestion = {
      suggestionId,
      agentId,
      title,
      description,
      affectedObjects,
      confidence: Math.min(100, Math.max(0, confidence)),
      implementationSteps: [
        'Review the suggestion',
        'Analyze impact on design',
        'Apply modifications',
        'Verify results',
      ],
      estimatedImpact: {
        complexity: confidence > 80 ? 'high' : confidence > 50 ? 'medium' : 'low',
        timeRequired: Math.ceil(confidence / 10) * 5,
        resourcesNeeded: ['computational_resources', 'rendering_power'],
      },
      createdAt: new Date(),
    };

    if (!this.designSuggestions.has(roomId)) {
      this.designSuggestions.set(roomId, []);
    }
    this.designSuggestions.get(roomId)!.push(suggestion);

    return suggestion;
  }

  /**
   * Integrate real-world imagery into 3D room
   */
  integrateRealWorldImagery(
    roomId: string,
    imageUrl: string,
    scale: number,
    position: Vector3D
  ): RoomEnvironment {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    room.environment.realWorldImagery = {
      imageUrl,
      scale,
      position,
    };
    room.updatedAt = new Date();

    this.logEvent(roomId, {
      type: 'object_created',
      actor: 'system',
      data: { action: 'imagery_integrated', imageUrl, scale },
    });

    return room.environment;
  }

  /**
   * Update room environment settings
   */
  updateEnvironment(
    roomId: string,
    updates: Partial<RoomEnvironment>
  ): RoomEnvironment | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    Object.assign(room.environment, updates);
    room.updatedAt = new Date();

    return room.environment;
  }

  /**
   * Get room details
   */
  getRoom(roomId: string): CollaborativeRoom | null {
    return this.rooms.get(roomId) || null;
  }

  /**
   * Get all rooms for creator
   */
  getCreatorRooms(creatorId: string): CollaborativeRoom[] {
    return Array.from(this.rooms.values()).filter(r => r.creatorId === creatorId);
  }

  /**
   * Get active participants in room
   */
  getRoomParticipants(roomId: string): RoomParticipant[] {
    const room = this.rooms.get(roomId);
    return room?.participants || [];
  }

  /**
   * Get collaboration history
   */
  getCollaborationHistory(roomId: string, limit: number = 100): CollaborationEvent[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return room.collaborationHistory.slice(-limit);
  }

  /**
   * Get design suggestions for room
   */
  getDesignSuggestions(roomId: string): DesignSuggestion[] {
    return this.designSuggestions.get(roomId) || [];
  }

  /**
   * Get agent action history
   */
  getAgentActionHistory(agentId: string, limit: number = 50): AgentAction[] {
    const actions = this.agentActions.get(agentId) || [];
    return actions.slice(-limit);
  }

  /**
   * Calculate distance between two 3D points
   */
  private calculateDistance(p1: Vector3D, p2: Vector3D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Log collaboration event
   */
  private logEvent(
    roomId: string,
    event: Omit<CollaborationEvent, 'eventId' | 'timestamp'>
  ): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullEvent: CollaborationEvent = {
      ...event,
      eventId,
      timestamp: new Date(),
    };

    room.collaborationHistory.push(fullEvent);
  }

  /**
   * Close room
   */
  closeRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.isActive = false;
    room.updatedAt = new Date();

    return true;
  }

  /**
   * Delete room
   */
  deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  /**
   * Get room statistics
   */
  getRoomStats(roomId: string): Record<string, any> | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      roomId,
      name: room.name,
      projectType: room.projectType,
      totalAgents: room.agents.length,
      activeAgents: room.agents.filter(a => a.isActive).length,
      totalParticipants: room.participants.length,
      totalObjects: room.designObjects.length,
      totalEvents: room.collaborationHistory.length,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      isActive: room.isActive,
    };
  }
}
