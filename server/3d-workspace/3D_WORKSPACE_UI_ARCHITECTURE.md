# 3D Workspace UI Architecture

## Overview

The 3D Workspace is a collaborative environment where construction professionals and AI specialists work together on blueprints and projects. Users can see AI avatars with their specialty tools, manipulate 3D objects, and watch real-time collaboration.

## Technology Stack

- **3D Rendering**: Babylon.js (React Native compatible via Expo)
- **Physics**: Babylon.js Physics Engine
- **Real-time Sync**: WebSockets via tRPC subscriptions
- **State Management**: Zustand for local state
- **Animations**: Babylon.js animations and Reanimated v4

## Scene Architecture

### Scene Hierarchy

```
Root Scene
├── Environment
│   ├── Grid floor
│   ├── Lighting (ambient + directional)
│   ├── Skybox
│   └── Background (user logo)
├── Blueprint Objects
│   ├── Walls
│   ├── Pipes/Electrical/HVAC
│   ├── Structural elements
│   └── Landscaping elements
├── AI Avatars
│   ├── Plumber Avatar
│   ├── Electrician Avatar
│   ├── ... (other AIs)
│   └── Landscaper Avatar
├── User Tools
│   ├── Selection box
│   ├── Measurement tools
│   └── Annotation tools
└── UI Overlay
    ├── Top bar (workspace name, participants)
    ├── Left panel (object list)
    ├── Right panel (properties)
    └── Bottom panel (AI chat/status)
```

## Data Structures

### Workspace State

```typescript
interface Workspace3D {
  id: string;
  name: string;
  createdBy: string;
  participants: User[];
  objects: SceneObject[];
  aiAvatars: AIAvatar[];
  camera: CameraState;
  lighting: LightingConfig;
  version: number;
  lastModified: Date;
}

interface SceneObject {
  id: string;
  type: 'wall' | 'pipe' | 'electrical' | 'hvac' | 'structural' | 'landscape';
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  material: Material;
  metadata: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  modifiedAt: Date;
}

interface AIAvatar {
  id: string;
  aiType: 'plumber' | 'electrician' | 'welder' | 'roofer' | 'dry_waller' | 'framer' | 'hvac' | 'landscaper' | 'coder' | '3d_printing' | 'content_creator';
  position: Vector3;
  rotation: Quaternion;
  animation: string; // current animation name
  tools: string[]; // tools being held
  status: 'idle' | 'working' | 'communicating' | 'analyzing';
  speechBubble?: string; // current message
  lastUpdate: Date;
}

interface CameraState {
  position: Vector3;
  target: Vector3;
  fov: number;
  zoom: number;
}

interface LightingConfig {
  ambient: {
    color: Color3;
    intensity: number;
  };
  directional: {
    direction: Vector3;
    intensity: number;
    shadowMap: boolean;
  };
}
```

## Component Structure

### Main Components

1. **Workspace3DScene** — Root component managing the Babylon scene
2. **SceneRenderer** — Handles 3D rendering and updates
3. **AIAvatarManager** — Manages all AI avatars and animations
4. **ObjectManipulator** — Handles object selection and transformation
5. **CollaborationManager** — Manages real-time sync with other users
6. **UIOverlay** — 2D UI on top of 3D scene

### Sub-Components

- **AIAvatar** — Individual AI avatar with animations and tools
- **SceneObject** — 3D object with materials and interactions
- **SelectionBox** — Visual feedback for selected objects
- **MeasurementTool** — Distance and angle measurements
- **AnnotationTool** — Add notes and markers to scene
- **AIStatusPanel** — Shows what each AI is doing
- **ChatPanel** — Chat with selected AI

## Rendering Pipeline

### Frame Update Loop

1. **Input Processing** — Handle user gestures (touch, drag, pinch)
2. **State Update** — Update object positions, rotations, animations
3. **Physics Simulation** — Run physics engine
4. **AI Logic** — Update AI avatar positions and animations
5. **Render** — Render scene to screen
6. **Sync** — Send updates to other users

### Performance Optimization

- **LOD (Level of Detail)** — Reduce geometry complexity for distant objects
- **Frustum Culling** — Only render visible objects
- **Instancing** — Reuse meshes for similar objects
- **Texture Atlasing** — Combine textures to reduce draw calls
- **Lazy Loading** — Load 3D models on demand

## AI Avatar System

### Avatar Components

Each AI avatar consists of:
- **Head** — With facial expressions
- **Body** — With uniform showing AI badge and specialty
- **Hands** — For gestures and tool holding
- **Tools** — Specialty tools relevant to their field
- **Name Tag** — Floating above head
- **Status Indicator** — Color-coded status (idle, working, etc.)

### Avatar Animations

- **Idle** — Standing with subtle movements
- **Working** — Specific to their specialty (welding, plumbing, etc.)
- **Communicating** — Gesturing while speaking
- **Analyzing** — Examining objects closely
- **Collaborating** — Working together with other AIs
- **Celebrating** — Success animations

### Avatar Interactions

Users can:
- Click on avatar to select it
- See what AI is currently working on
- Request assistance from specific AI
- Watch AI work on objects in real-time
- Hear AI voice (when voice chat enabled)

## Object Manipulation

### Selection

- **Single Select** — Tap object to select
- **Multi Select** — Hold Shift and tap multiple objects
- **Area Select** — Drag to select multiple objects in area
- **Deselect** — Tap empty space

### Transformation

- **Move** — Drag selected object
- **Rotate** — Two-finger rotate gesture
- **Scale** — Pinch gesture to scale
- **Snap to Grid** — Optional snapping for alignment

### Properties Panel

Shows and allows editing:
- Position (X, Y, Z coordinates)
- Rotation (Euler angles)
- Scale (uniform or per-axis)
- Material properties
- Custom metadata

## Real-time Collaboration

### Synchronization

- **Optimistic Updates** — Update locally immediately
- **Server Reconciliation** — Resolve conflicts with server
- **Operational Transformation** — Handle concurrent edits
- **Conflict Resolution** — Last-write-wins or custom logic

### Presence

- **User Cursors** — See where other users are looking
- **User Selections** — See what objects others have selected
- **User Avatars** — See other users' positions in scene
- **Activity Feed** — See what others are doing

## Blueprint Features

### Blueprint Creation

- **Grid-based Snapping** — Align objects to grid
- **Measurement Tools** — Measure distances and angles
- **Annotation Tools** — Add notes and dimensions
- **Layer System** — Organize objects by layer
- **Template Library** — Pre-made components

### Blueprint Export

- **3D Model Export** — Export as GLTF/GLB
- **2D Drawing Export** — Export orthographic views
- **PDF Report** — Generate PDF with blueprints and notes
- **DWG Export** — Export to AutoCAD format

## Photo-to-3D Integration

### Workflow

1. User uploads photo
2. AI analyzes photo
3. AI generates 3D model
4. Model appears in workspace
5. User can edit and refine
6. Model saved to workspace

### Features

- **Auto-Detection** — Automatically identify objects in photo
- **Dimension Extraction** — Extract measurements from photo
- **Material Recognition** — Identify materials in photo
- **Issue Highlighting** — Mark problems found in photo
- **Before/After View** — Compare original photo with 3D model

## Performance Targets

- **Frame Rate** — 60 FPS on modern devices
- **Load Time** — < 2 seconds for workspace
- **Object Count** — Support 1000+ objects
- **User Count** — Support 10+ concurrent users
- **Network Latency** — < 100ms for real-time sync

## Security Considerations

- **Access Control** — Only workspace members can view/edit
- **Audit Trail** — Log all changes with user attribution
- **Data Encryption** — Encrypt workspace data in transit and at rest
- **Concurrent Edit Conflicts** — Prevent data corruption
- **Rate Limiting** — Prevent abuse of real-time updates

## Testing Strategy

### Unit Tests

- Object transformation calculations
- Conflict resolution logic
- State management

### Integration Tests

- Multi-user collaboration
- Real-time synchronization
- Photo-to-3D conversion

### Performance Tests

- Frame rate under load
- Memory usage
- Network bandwidth
- Concurrent user scaling

### User Testing

- Gesture recognition accuracy
- UI intuitiveness
- Performance on various devices
- Accessibility features

## Future Enhancements

- **VR Support** — Full VR experience with hand tracking
- **AR Preview** — Preview 3D models in real world
- **AI Collaboration** — AIs automatically work on related tasks
- **Voice Commands** — Control workspace with voice
- **Gesture Recognition** — Complex multi-touch gestures
- **Physics Simulation** — Realistic physics for structural analysis
- **Material Library** — Extensive material database
- **Cost Estimation** — Automatic cost calculation from models
- **Timeline Animation** — Animate construction process over time
