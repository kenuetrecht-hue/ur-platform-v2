/**
 * 3D Workspace Camera Controls and Object Manipulation
 * 
 * Handles camera movement, object selection, and manipulation in 3D space
 */

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface CameraState {
  position: Vector3;
  target: Vector3;
  up: Vector3;
  fov: number;
  near: number;
  far: number;
  mode: "orbit" | "firstperson" | "topdown";
}

interface ObjectTransform {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
}

class WorkspaceCameraControls {
  private cameraState: CameraState;
  private selectedObject: string | null = null;
  private dragStart: Vector3 | null = null;
  private isDragging: boolean = false;
  private rotationSpeed: number = 0.01;
  private zoomSpeed: number = 0.1;
  private panSpeed: number = 0.5;

  constructor() {
    this.cameraState = {
      position: { x: 5, y: 5, z: 5 },
      target: { x: 0, y: 0, z: 0 },
      up: { x: 0, y: 1, z: 0 },
      fov: 75,
      near: 0.1,
      far: 1000,
      mode: "orbit",
    };
  }

  public setCameraMode(mode: "orbit" | "firstperson" | "topdown"): void {
    this.cameraState.mode = mode;

    switch (mode) {
      case "orbit":
        this.cameraState.position = { x: 5, y: 5, z: 5 };
        this.cameraState.target = { x: 0, y: 0, z: 0 };
        break;
      case "firstperson":
        this.cameraState.position = { x: 0, y: 1.7, z: 0 };
        this.cameraState.target = { x: 0, y: 1.7, z: -1 };
        break;
      case "topdown":
        this.cameraState.position = { x: 0, y: 20, z: 0 };
        this.cameraState.target = { x: 0, y: 0, z: 0 };
        break;
    }
  }

  public rotateCameraOrbit(deltaX: number, deltaY: number): void {
    if (this.cameraState.mode !== "orbit") return;

    const { position, target } = this.cameraState;

    const dx = position.x - target.x;
    const dy = position.y - target.y;
    const dz = position.z - target.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    let theta = Math.atan2(dz, dx);
    let phi = Math.acos(dy / distance);

    theta += deltaX * this.rotationSpeed;
    phi += deltaY * this.rotationSpeed;

    phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));

    this.cameraState.position = {
      x: target.x + distance * Math.sin(phi) * Math.cos(theta),
      y: target.y + distance * Math.cos(phi),
      z: target.z + distance * Math.sin(phi) * Math.sin(theta),
    };
  }

  public zoomCamera(delta: number): void {
    const { position, target } = this.cameraState;

    const dx = position.x - target.x;
    const dy = position.y - target.y;
    const dz = position.z - target.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const newDistance = Math.max(1, distance - delta * this.zoomSpeed);
    const scale = newDistance / distance;

    this.cameraState.position = {
      x: target.x + dx * scale,
      y: target.y + dy * scale,
      z: target.z + dz * scale,
    };
  }

  public panCamera(deltaX: number, deltaY: number): void {
    const { position, target } = this.cameraState;

    const forward = this.normalize({
      x: target.x - position.x,
      y: target.y - position.y,
      z: target.z - position.z,
    });

    const right = this.normalize(
      this.cross(forward, this.cameraState.up)
    );

    const up = this.normalize(
      this.cross(right, forward)
    );

    const panAmount = this.panSpeed;
    const newTarget = {
      x: target.x + right.x * deltaX * panAmount - up.x * deltaY * panAmount,
      y: target.y + right.y * deltaX * panAmount - up.y * deltaY * panAmount,
      z: target.z + right.z * deltaX * panAmount - up.z * deltaY * panAmount,
    };

    const newPosition = {
      x: position.x + right.x * deltaX * panAmount - up.x * deltaY * panAmount,
      y: position.y + right.y * deltaX * panAmount - up.y * deltaY * panAmount,
      z: position.z + right.z * deltaX * panAmount - up.z * deltaY * panAmount,
    };

    this.cameraState.target = newTarget;
    this.cameraState.position = newPosition;
  }

  public selectObject(objectId: string): void {
    this.selectedObject = objectId;
  }

  public deselectObject(): void {
    this.selectedObject = null;
  }

  public moveObject(delta: Vector3): ObjectTransform {
    return {
      position: delta,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };
  }

  public rotateObject(delta: Vector3): ObjectTransform {
    return {
      position: { x: 0, y: 0, z: 0 },
      rotation: delta,
      scale: { x: 1, y: 1, z: 1 },
    };
  }

  public scaleObject(delta: Vector3): ObjectTransform {
    return {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: delta,
    };
  }

  public getCameraState(): CameraState {
    return { ...this.cameraState };
  }

  public getSelectedObject(): string | null {
    return this.selectedObject;
  }

  private normalize(v: Vector3): Vector3 {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) return { x: 0, y: 0, z: 0 };
    return {
      x: v.x / length,
      y: v.y / length,
      z: v.z / length,
    };
  }

  private cross(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  public onMouseDown(x: number, y: number): void {
    this.isDragging = true;
    this.dragStart = { x, y, z: 0 };
  }

  public onMouseMove(x: number, y: number): void {
    if (!this.isDragging || !this.dragStart) return;

    const deltaX = x - this.dragStart.x;
    const deltaY = y - this.dragStart.y;

    if (this.cameraState.mode === "orbit") {
      this.rotateCameraOrbit(deltaX, deltaY);
    } else {
      this.panCamera(deltaX, deltaY);
    }

    this.dragStart = { x, y, z: 0 };
  }

  public onMouseUp(): void {
    this.isDragging = false;
    this.dragStart = null;
  }

  public onMouseWheel(delta: number): void {
    this.zoomCamera(delta);
  }
}

export const workspaceCameraControls = new WorkspaceCameraControls();
