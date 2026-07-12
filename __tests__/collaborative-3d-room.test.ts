import { describe, it, expect, beforeEach } from 'vitest';
import { Collaborative3DRoomService, AIAgent3D, Vector3D } from '../lib/collaborative-3d-room';

describe('Collaborative 3D Room Service', () => {
  let service: Collaborative3DRoomService;
  const creatorId = 'creator_123';

  beforeEach(() => {
    service = new Collaborative3DRoomService();
  });

  describe('Room Management', () => {
    it('should create a new collaborative room', () => {
      const room = service.createRoom(creatorId, 'Architecture Project', 'architecture');

      expect(room).toBeDefined();
      expect(room.roomId).toBeDefined();
      expect(room.name).toBe('Architecture Project');
      expect(room.projectType).toBe('architecture');
      expect(room.creatorId).toBe(creatorId);
      expect(room.agents).toHaveLength(0);
      expect(room.participants).toHaveLength(0);
      expect(room.isActive).toBe(true);
    });

    it('should retrieve room by ID', () => {
      const created = service.createRoom(creatorId, 'Test Room', 'general');
      const retrieved = service.getRoom(created.roomId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.roomId).toBe(created.roomId);
      expect(retrieved?.name).toBe('Test Room');
    });

    it('should get all rooms for creator', () => {
      const room1 = service.createRoom(creatorId, 'Room 1', 'architecture');
      const room2 = service.createRoom(creatorId, 'Room 2', 'engineering');
      const room3 = service.createRoom('other_creator', 'Room 3', 'general');

      const creatorRooms = service.getCreatorRooms(creatorId);

      expect(creatorRooms).toHaveLength(2);
      expect(creatorRooms.some(r => r.roomId === room1.roomId)).toBe(true);
      expect(creatorRooms.some(r => r.roomId === room2.roomId)).toBe(true);
      expect(creatorRooms.some(r => r.roomId === room3.roomId)).toBe(false);
    });

    it('should close room', () => {
      const room = service.createRoom(creatorId, 'Test Room', 'general');
      expect(room.isActive).toBe(true);

      const closed = service.closeRoom(room.roomId);
      expect(closed).toBe(true);

      const retrieved = service.getRoom(room.roomId);
      expect(retrieved?.isActive).toBe(false);
    });

    it('should delete room', () => {
      const room = service.createRoom(creatorId, 'Test Room', 'general');
      const deleted = service.deleteRoom(room.roomId);
      expect(deleted).toBe(true);

      const retrieved = service.getRoom(room.roomId);
      expect(retrieved).toBeNull();
    });
  });

  describe('AI Agent Management', () => {
    let roomId: string;

    beforeEach(() => {
      const room = service.createRoom(creatorId, 'Test Room', 'architecture');
      roomId = room.roomId;
    });

    it('should add AI agent to room', () => {
      const agent = service.addAgentToRoom(roomId, {
        name: 'Senior Architect',
        role: 'architect',
        voiceProfile: {
          pitch: 1.0,
          speed: 1.0,
          tone: 'professional',
        },
        appearance: {
          modelUrl: 'https://example.com/architect.glb',
          uniformColor: '#0066CC',
          uniformLabel: 'AI Architect',
          toolsHeld: ['blueprint', 'measuring_tape'],
          logoBackgroundUrl: 'https://example.com/logo.png',
        },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        capabilities: ['design', 'measure', 'analyze', 'collaborate'],
      });

      expect(agent).toBeDefined();
      expect(agent.agentId).toBeDefined();
      expect(agent.name).toBe('Senior Architect');
      expect(agent.role).toBe('architect');
      expect(agent.isActive).toBe(true);

      const room = service.getRoom(roomId);
      expect(room?.agents).toHaveLength(1);
    });

    it('should add multiple agents with different roles', () => {
      const architect = service.addAgentToRoom(roomId, {
        name: 'Architect',
        role: 'architect',
        voiceProfile: { pitch: 1.0, speed: 1.0, tone: 'professional' },
        appearance: {
          modelUrl: 'https://example.com/architect.glb',
          uniformColor: '#0066CC',
          uniformLabel: 'AI Architect',
          toolsHeld: ['blueprint'],
        },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        capabilities: ['design'],
      });

      const engineer = service.addAgentToRoom(roomId, {
        name: 'Engineer',
        role: 'engineer',
        voiceProfile: { pitch: 1.2, speed: 0.9, tone: 'technical' },
        appearance: {
          modelUrl: 'https://example.com/engineer.glb',
          uniformColor: '#FF6600',
          uniformLabel: 'AI Engineer',
          toolsHeld: ['wrench', 'calipers'],
        },
        position: { x: 2, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        capabilities: ['analyze', 'measure'],
      });

      const landscaper = service.addAgentToRoom(roomId, {
        name: 'Landscaper',
        role: 'landscaper',
        voiceProfile: { pitch: 0.9, speed: 1.1, tone: 'friendly' },
        appearance: {
          modelUrl: 'https://example.com/landscaper.glb',
          uniformColor: '#00AA00',
          uniformLabel: 'AI Landscaper',
          toolsHeld: ['shovel', 'rake'],
        },
        position: { x: 4, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        capabilities: ['design', 'measure'],
      });

      const room = service.getRoom(roomId);
      expect(room?.agents).toHaveLength(3);
      expect(room?.agents.some(a => a.role === 'architect')).toBe(true);
      expect(room?.agents.some(a => a.role === 'engineer')).toBe(true);
      expect(room?.agents.some(a => a.role === 'landscaper')).toBe(true);
    });
  });

  describe('Participant Management', () => {
    let roomId: string;

    beforeEach(() => {
      const room = service.createRoom(creatorId, 'Test Room', 'general');
      roomId = room.roomId;
    });

    it('should add participant to room', () => {
      const participant = service.joinRoom(roomId, 'user_123', 'John Doe');

      expect(participant).toBeDefined();
      expect(participant.userId).toBe('user_123');
      expect(participant.username).toBe('John Doe');
      expect(participant.role).toBe('editor');
      expect(participant.joinedAt).toBeInstanceOf(Date);

      const room = service.getRoom(roomId);
      expect(room?.participants).toHaveLength(1);
    });

    it('should add multiple participants', () => {
      service.joinRoom(roomId, 'user_1', 'Alice');
      service.joinRoom(roomId, 'user_2', 'Bob');
      service.joinRoom(roomId, 'user_3', 'Charlie');

      const participants = service.getRoomParticipants(roomId);
      expect(participants).toHaveLength(3);
    });

    it('should remove participant from room', () => {
      service.joinRoom(roomId, 'user_123', 'John Doe');
      const room1 = service.getRoom(roomId);
      expect(room1?.participants).toHaveLength(1);

      const left = service.leaveRoom(roomId, 'user_123');
      expect(left).toBe(true);

      const room2 = service.getRoom(roomId);
      expect(room2?.participants).toHaveLength(0);
    });
  });

  describe('Design Object Management', () => {
    let roomId: string;

    beforeEach(() => {
      const room = service.createRoom(creatorId, 'Test Room', 'architecture');
      roomId = room.roomId;
    });

    it('should add design object to room', () => {
      const obj = service.addDesignObject(roomId, 'user_123', {
        type: 'mesh',
        name: 'Building Foundation',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 10, y: 1, z: 10 },
        material: {
          color: '#808080',
          metallic: 0.1,
          roughness: 0.8,
        },
        geometry: {
          type: 'box',
          dimensions: { width: 10, height: 1, depth: 10 },
        },
      });

      expect(obj).toBeDefined();
      expect(obj.objectId).toBeDefined();
      expect(obj.name).toBe('Building Foundation');
      expect(obj.type).toBe('mesh');
      expect(obj.createdBy).toBe('user_123');

      const room = service.getRoom(roomId);
      expect(room?.designObjects).toHaveLength(1);
    });

    it('should update design object', () => {
      const obj = service.addDesignObject(roomId, 'user_123', {
        type: 'mesh',
        name: 'Original Name',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      });

      const updated = service.updateDesignObject(roomId, obj.objectId, 'user_123', {
        name: 'Updated Name',
        position: { x: 5, y: 5, z: 5 },
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.position).toEqual({ x: 5, y: 5, z: 5 });
    });

    it('should delete design object', () => {
      const obj = service.addDesignObject(roomId, 'user_123', {
        type: 'mesh',
        name: 'Test Object',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      });

      const room1 = service.getRoom(roomId);
      expect(room1?.designObjects).toHaveLength(1);

      const deleted = service.deleteDesignObject(roomId, obj.objectId, 'user_123');
      expect(deleted).toBe(true);

      const room2 = service.getRoom(roomId);
      expect(room2?.designObjects).toHaveLength(0);
    });
  });

  describe('Agent Actions', () => {
    let roomId: string;
    let agentId: string;

    beforeEach(() => {
      const room = service.createRoom(creatorId, 'Test Room', 'architecture');
      roomId = room.roomId;

      const agent = service.addAgentToRoom(roomId, {
        name: 'Test Agent',
        role: 'architect',
        voiceProfile: { pitch: 1.0, speed: 1.0, tone: 'professional' },
        appearance: {
          modelUrl: 'https://example.com/agent.glb',
          uniformColor: '#0066CC',
          uniformLabel: 'AI Agent',
          toolsHeld: [],
        },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        capabilities: ['move', 'rotate', 'place_object', 'measure', 'analyze'],
      });
      agentId = agent.agentId;
    });

    it('should execute move action', () => {
      const action = service.executeAgentAction(roomId, agentId, 'move', {
        targetPosition: { x: 5, y: 2, z: 3 },
      });

      expect(action).toBeDefined();
      expect(action.actionType).toBe('move');
      expect(action.result).toContain('moved');

      const room = service.getRoom(roomId);
      const agent = room?.agents.find(a => a.agentId === agentId);
      expect(agent?.position).toEqual({ x: 5, y: 2, z: 3 });
    });

    it('should execute rotate action', () => {
      const action = service.executeAgentAction(roomId, agentId, 'rotate', {
        targetRotation: { x: 0, y: 45, z: 0 },
      });

      expect(action.actionType).toBe('rotate');
      expect(action.result).toContain('rotated');

      const room = service.getRoom(roomId);
      const agent = room?.agents.find(a => a.agentId === agentId);
      expect(agent?.rotation).toEqual({ x: 0, y: 45, z: 0 });
    });

    it('should execute place_object action', () => {
      const action = service.executeAgentAction(roomId, agentId, 'place_object', {
        objectType: 'mesh',
        objectName: 'Placed Object',
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 2, y: 2, z: 2 },
      });

      expect(action.actionType).toBe('place_object');
      expect(action.result).toContain('placed');
      expect(action.targetObject).toBeDefined();

      const room = service.getRoom(roomId);
      expect(room?.designObjects).toHaveLength(1);
    });

    it('should execute measure action', () => {
      const obj1 = service.addDesignObject(roomId, 'user_123', {
        type: 'mesh',
        name: 'Object 1',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      });

      const obj2 = service.addDesignObject(roomId, 'user_123', {
        type: 'mesh',
        name: 'Object 2',
        position: { x: 3, y: 4, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      });

      const action = service.executeAgentAction(roomId, agentId, 'measure', {
        object1Id: obj1.objectId,
        object2Id: obj2.objectId,
      });

      expect(action.actionType).toBe('measure');
      expect(action.result).toContain('Distance');
      expect(action.result).toContain('5.00'); // Distance is 5 (3-4-5 triangle)
    });

    it('should execute analyze action', () => {
      const action = service.executeAgentAction(roomId, agentId, 'analyze', {
        analysisType: 'structural',
      });

      expect(action.actionType).toBe('analyze');
      expect(action.result).toContain('Analysis');
    });

    it('should execute suggest_modification action', () => {
      const action = service.executeAgentAction(roomId, agentId, 'suggest_modification', {
        title: 'Optimize Layout',
        description: 'Consider repositioning elements for better flow',
        affectedObjects: [],
        confidence: 85,
      });

      expect(action.actionType).toBe('suggest_modification');
      expect(action.result).toContain('Suggestion');
    });

    it('should track agent action history', () => {
      service.executeAgentAction(roomId, agentId, 'move', {
        targetPosition: { x: 1, y: 1, z: 1 },
      });
      service.executeAgentAction(roomId, agentId, 'rotate', {
        targetRotation: { x: 0, y: 90, z: 0 },
      });

      const history = service.getAgentActionHistory(agentId);
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Real-World Imagery Integration', () => {
    let roomId: string;

    beforeEach(() => {
      const room = service.createRoom(creatorId, 'Landscaping Project', 'landscaping');
      roomId = room.roomId;
    });

    it('should integrate real-world imagery', () => {
      const env = service.integrateRealWorldImagery(
        roomId,
        'https://example.com/landscape.jpg',
        0.1, // 0.1 meters per pixel
        { x: 0, y: 0, z: 0 }
      );

      expect(env.realWorldImagery).toBeDefined();
      expect(env.realWorldImagery?.imageUrl).toBe('https://example.com/landscape.jpg');
      expect(env.realWorldImagery?.scale).toBe(0.1);
    });
  });

  describe('Collaboration History', () => {
    let roomId: string;

    beforeEach(() => {
      const room = service.createRoom(creatorId, 'Test Room', 'general');
      roomId = room.roomId;
    });

    it('should track collaboration events', () => {
      service.joinRoom(roomId, 'user_1', 'Alice');
      service.addDesignObject(roomId, 'user_1', {
        type: 'mesh',
        name: 'Test Object',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      });

      const history = service.getCollaborationHistory(roomId);
      expect(history.length).toBeGreaterThan(0);
      expect(history.some(e => e.type === 'participant_joined')).toBe(true);
      expect(history.some(e => e.type === 'object_created')).toBe(true);
    });
  });

  describe('Room Statistics', () => {
    let roomId: string;

    beforeEach(() => {
      const room = service.createRoom(creatorId, 'Test Room', 'architecture');
      roomId = room.roomId;
    });

    it('should get room statistics', () => {
      service.addAgentToRoom(roomId, {
        name: 'Agent 1',
        role: 'architect',
        voiceProfile: { pitch: 1.0, speed: 1.0, tone: 'professional' },
        appearance: {
          modelUrl: 'https://example.com/agent.glb',
          uniformColor: '#0066CC',
          uniformLabel: 'AI Agent',
          toolsHeld: [],
        },
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        capabilities: [],
      });

      service.joinRoom(roomId, 'user_1', 'Alice');
      service.joinRoom(roomId, 'user_2', 'Bob');

      service.addDesignObject(roomId, 'user_1', {
        type: 'mesh',
        name: 'Object 1',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      });

      const stats = service.getRoomStats(roomId);

      expect(stats).toBeDefined();
      expect(stats?.totalAgents).toBe(1);
      expect(stats?.totalParticipants).toBe(2);
      expect(stats?.totalObjects).toBe(1);
      expect(stats?.isActive).toBe(true);
    });
  });
});
