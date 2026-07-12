# 3D Collaborative Workspace - Architecture Design

## Overview

The 3D Collaborative Workspace is the central hub where all 10 AI construction specialists work together with users to design, plan, and troubleshoot construction projects. Multiple users can collaborate in real-time within a shared 3D environment.

## Core Components

### 1. 3D Scene Management
- **Three.js/Babylon.js** for 3D rendering
- **WebGL** for cross-platform compatibility
- **Real-time synchronization** via WebSockets
- **State management** for 3D objects and positions

### 2. Multi-User Synchronization
- **WebSocket server** for real-time updates
- **Operational Transformation (OT)** for conflict resolution
- **User presence tracking** (avatars, cursors)
- **Activity history** and undo/redo

### 3. Blueprint System
- **2D/3D blueprint creation**
- **Layer management** (plumbing, electrical, structural, etc.)
- **Measurement tools**
- **Annotation system**
- **Export/import** (PDF, DWG, etc.)

### 4. AI Avatar System
- **Distinct avatars** for each AI specialist
- **Realistic animations**
- **Tool holding** (wrenches, hammers, etc.)
- **Speech bubbles** for communication
- **Gesture recognition** for actions

### 5. Spatial Audio
- **3D audio positioning**
- **Voice chat** between users and AIs
- **Ambient sounds** (construction noises)
- **Audio mixing** for multiple speakers

### 6. Collaboration Features
- **Real-time chat** in 3D space
- **Annotation tools** (drawing, highlighting)
- **Permission system** (view, edit, admin)
- **Version control** for designs
- **Collaboration history**

## Database Schema

```sql
-- 3D Workspaces
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT,
  description TEXT,
  thumbnail TEXT,
  isPublic BOOLEAN DEFAULT false,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

-- Workspace Members
CREATE TABLE workspace_members (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL,
  userId TEXT NOT NULL,
  role TEXT, -- "owner", "editor", "viewer"
  joinedAt TIMESTAMP
);

-- 3D Objects
CREATE TABLE workspace_objects (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL,
  objectType TEXT, -- "wall", "pipe", "wire", "fixture", etc.
  position JSON, -- {x, y, z}
  rotation JSON, -- {x, y, z}
  scale JSON, -- {x, y, z}
  properties JSON, -- Material, color, dimensions, etc.
  createdBy TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

-- Blueprints
CREATE TABLE blueprints (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL,
  name TEXT,
  description TEXT,
  layers JSON, -- Array of layers
  measurements JSON,
  annotations JSON,
  version INTEGER,
  createdBy TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

-- AI Avatars in Workspace
CREATE TABLE workspace_ai_avatars (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL,
  aiType TEXT, -- "plumber", "electrician", etc.
  position JSON, -- {x, y, z}
  rotation JSON,
  isActive BOOLEAN,
  currentTask TEXT,
  joinedAt TIMESTAMP
);

-- Collaboration Events
CREATE TABLE collaboration_events (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL,
  eventType TEXT, -- "object_created", "object_modified", "chat", etc.
  userId TEXT,
  aiId TEXT,
  data JSON,
  timestamp TIMESTAMP
);

-- Workspace Snapshots (for undo/redo)
CREATE TABLE workspace_snapshots (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL,
  snapshotData JSON,
  createdBy TEXT,
  createdAt TIMESTAMP
);
```

## API Endpoints (tRPC)

### Workspace Management
- `createWorkspace` - Create new 3D workspace
- `getWorkspace` - Retrieve workspace data
- `updateWorkspace` - Update workspace properties
- `deleteWorkspace` - Delete workspace
- `listWorkspaces` - List user's workspaces
- `shareWorkspace` - Share with other users
- `leaveWorkspace` - Leave shared workspace

### Real-Time Synchronization
- `subscribeToWorkspace` - Subscribe to real-time updates (WebSocket)
- `updateObject` - Update 3D object position/rotation/properties
- `createObject` - Create new 3D object
- `deleteObject` - Delete 3D object
- `broadcastEvent` - Broadcast event to all users

### Blueprint Operations
- `createBlueprint` - Create new blueprint
- `getBlueprint` - Retrieve blueprint
- `updateBlueprint` - Update blueprint
- `addLayer` - Add blueprint layer
- `removeLayer` - Remove blueprint layer
- `addAnnotation` - Add annotation to blueprint
- `exportBlueprint` - Export blueprint (PDF, DWG, etc.)

### AI Avatar Management
- `addAIAvatar` - Add AI specialist to workspace
- `removeAIAvatar` - Remove AI specialist
- `updateAIPosition` - Update AI avatar position
- `getAIStatus` - Get AI current task/status
- `requestAIAssistance` - Request help from specific AI

### Collaboration
- `sendChatMessage` - Send message in 3D space
- `getChatHistory` - Get conversation history
- `addAnnotation` - Add drawing/highlighting
- `getCollaborationHistory` - Get activity log
- `createSnapshot` - Save workspace snapshot
- `restoreSnapshot` - Restore from snapshot

### Permissions
- `addMember` - Add user to workspace
- `removeMember` - Remove user from workspace
- `updateMemberRole` - Change user role
- `getMemberList` - Get all workspace members

## Real-Time Synchronization Flow

```
User Action (e.g., move object)
    ↓
Client sends update via WebSocket
    ↓
Server receives update
    ↓
Server applies Operational Transformation (OT)
    ↓
Server broadcasts to all connected clients
    ↓
All clients receive and render update
    ↓
Database persists change
```

## 3D Object Types

| Type | Description | Properties |
|------|-------------|-----------|
| Wall | Structural wall | Length, height, material, color |
| Pipe | Plumbing pipe | Diameter, material, length, direction |
| Wire | Electrical wire | Gauge, color, length, voltage |
| Fixture | Sink, toilet, outlet, etc. | Type, brand, position |
| Duct | HVAC ductwork | Diameter, material, direction |
| Beam | Structural beam | Material, dimensions, load capacity |
| Door | Door opening | Width, height, swing direction |
| Window | Window opening | Width, height, style |
| Annotation | Drawing/text | Content, position, color |

## AI Avatar Specifications

Each AI avatar has:
- **Unique 3D model** (realistically animated)
- **Uniform with "AI" badge** and specialty field
- **Tools relevant to specialty** (held in hand)
- **Distinct voice** (senior veteran tone)
- **Speech bubbles** for communication
- **Animation set** (gestures, movements)
- **User's logo in background**

## Performance Optimization

- **Level of Detail (LOD)** for complex objects
- **Frustum culling** to render only visible objects
- **Object pooling** for frequently created/destroyed objects
- **Compressed mesh data** for network efficiency
- **Delta compression** for position updates
- **Spatial indexing** for fast object lookup

## Security Considerations

- **Authentication** required to access workspaces
- **Authorization** based on user roles
- **Input validation** for all 3D object properties
- **Rate limiting** on API endpoints
- **Audit logging** of all modifications
- **Data encryption** in transit and at rest

## Scalability

- **Horizontal scaling** with load balancing
- **Database replication** for high availability
- **WebSocket server clustering** with Redis pub/sub
- **CDN for 3D assets** (models, textures)
- **Workspace archiving** for old/inactive workspaces

## Future Enhancements

- **AR integration** to view 3D models in real world
- **VR support** for immersive collaboration
- **Mobile app support** for on-site access
- **AI-powered suggestions** for design improvements
- **Cost estimation** based on 3D model
- **Material ordering** integration
- **Contractor marketplace** integration
- **Building code compliance** checking
