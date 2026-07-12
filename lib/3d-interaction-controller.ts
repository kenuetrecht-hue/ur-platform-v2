/**
 * 3D Interaction Controller
 * 
 * Handles real-time interactions in the 3D environment:
 * - Object selection and highlighting
 * - Camera controls (orbit, first-person, top-down)
 * - Gesture recognition (pinch, rotate, pan)
 * - AI specialist interactions
 * - Collaborative features
 */

export interface InteractionState {
  selectedObject: string | null;
  cameraMode: "orbit" | "firstperson" | "topdown";
  isAnimating: boolean;
  collaborators: string[];
  selectedTools: string[];
}

export interface GestureInput {
  type: "pinch" | "rotate" | "pan" | "tap" | "longpress";
  position: { x: number; y: number };
  delta?: { x: number; y: number };
  scale?: number;
  rotation?: number;
}

export class InteractionController {
  private state: InteractionState;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.state = {
      selectedObject: null,
      cameraMode: "orbit",
      isAnimating: false,
      collaborators: [],
      selectedTools: [],
    };
  }

  /**
   * Handle gesture input from user
   */
  handleGesture(gesture: GestureInput): void {
    switch (gesture.type) {
      case "tap":
        this.handleTap(gesture);
        break;
      case "pinch":
        this.handlePinch(gesture);
        break;
      case "rotate":
        this.handleRotate(gesture);
        break;
      case "pan":
        this.handlePan(gesture);
        break;
      case "longpress":
        this.handleLongPress(gesture);
        break;
    }
  }

  /**
   * Handle tap gesture (select object)
   */
  private handleTap(gesture: GestureInput): void {
    this.state.selectedObject = `object_${gesture.position.x}_${gesture.position.y}`;
    this.emit("objectSelected", this.state.selectedObject);
  }

  /**
   * Handle pinch gesture (zoom)
   */
  private handlePinch(gesture: GestureInput): void {
    if (gesture.scale) {
      const zoomFactor = gesture.scale > 1 ? 1.1 : 0.9;
      this.emit("cameraZoom", zoomFactor);
    }
  }

  /**
   * Handle rotate gesture
   */
  private handleRotate(gesture: GestureInput): void {
    if (gesture.rotation) {
      this.emit("cameraRotate", gesture.rotation);
    }
  }

  /**
   * Handle pan gesture (move camera)
   */
  private handlePan(gesture: GestureInput): void {
    if (gesture.delta) {
      this.emit("cameraPan", gesture.delta);
    }
  }

  /**
   * Handle long press gesture (context menu)
   */
  private handleLongPress(gesture: GestureInput): void {
    this.emit("contextMenu", gesture.position);
  }

  /**
   * Switch camera mode
   */
  switchCameraMode(mode: "orbit" | "firstperson" | "topdown"): void {
    this.state.cameraMode = mode;
    this.emit("cameraModeChanged", mode);
  }

  /**
   * Select an AI specialist
   */
  selectAI(aiId: string): void {
    this.state.selectedObject = aiId;
    this.emit("aiSelected", aiId);
  }

  /**
   * Start collaboration with other users
   */
  startCollaboration(userId: string): void {
    if (!this.state.collaborators.includes(userId)) {
      this.state.collaborators.push(userId);
      this.emit("collaborationStarted", userId);
    }
  }

  /**
   * End collaboration
   */
  endCollaboration(userId: string): void {
    this.state.collaborators = this.state.collaborators.filter(
      (id) => id !== userId
    );
    this.emit("collaborationEnded", userId);
  }

  /**
   * Select tool for interaction
   */
  selectTool(toolId: string): void {
    if (!this.state.selectedTools.includes(toolId)) {
      this.state.selectedTools.push(toolId);
      this.emit("toolSelected", toolId);
    }
  }

  /**
   * Deselect tool
   */
  deselectTool(toolId: string): void {
    this.state.selectedTools = this.state.selectedTools.filter(
      (id) => id !== toolId
    );
    this.emit("toolDeselected", toolId);
  }

  /**
   * Start animation
   */
  startAnimation(animationId: string, duration: number): void {
    this.state.isAnimating = true;
    this.emit("animationStarted", { animationId, duration });

    setTimeout(() => {
      this.state.isAnimating = false;
      this.emit("animationEnded", animationId);
    }, duration);
  }

  /**
   * Get current state
   */
  getState(): InteractionState {
    return { ...this.state };
  }

  /**
   * Register event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Unregister event listener
   */
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }
}

/**
 * Create gesture recognizer for mobile
 */
export class MobileGestureRecognizer {
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartDistance = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private element: HTMLElement, private controller: InteractionController) {
    this.setupListeners();
  }

  private setupListeners(): void {
    this.element.addEventListener("touchstart", (e) => this.onTouchStart(e));
    this.element.addEventListener("touchmove", (e) => this.onTouchMove(e));
    this.element.addEventListener("touchend", (e) => this.onTouchEnd(e));
    this.element.addEventListener("mousedown", (e) => this.onMouseDown(e));
    this.element.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.element.addEventListener("mouseup", (e) => this.onMouseUp(e));
    this.element.addEventListener("wheel", (e) => this.onWheel(e));
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;

      // Start long press timer
      this.longPressTimer = setTimeout(() => {
        this.controller.handleGesture({
          type: "longpress",
          position: { x: this.touchStartX, y: this.touchStartY },
        });
      }, 500);
    } else if (e.touches.length === 2) {
      this.touchStartDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - this.touchStartX;
      const deltaY = e.touches[0].clientY - this.touchStartY;

      this.controller.handleGesture({
        type: "pan",
        position: { x: e.touches[0].clientX, y: e.touches[0].clientY },
        delta: { x: deltaX, y: deltaY },
      });
    } else if (e.touches.length === 2) {
      const distance = this.getTouchDistance(e.touches[0], e.touches[1]);
      const scale = distance / this.touchStartDistance;

      this.controller.handleGesture({
        type: "pinch",
        position: {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        },
        scale,
      });
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (e.buttons === 1) {
      const deltaX = e.clientX - this.touchStartX;
      const deltaY = e.clientY - this.touchStartY;

      this.controller.handleGesture({
        type: "pan",
        position: { x: e.clientX, y: e.clientY },
        delta: { x: deltaX, y: deltaY },
      });
    }
  }

  private onMouseUp(e: MouseEvent): void {
    this.controller.handleGesture({
      type: "tap",
      position: { x: e.clientX, y: e.clientY },
    });
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 0.9 : 1.1;

    this.controller.handleGesture({
      type: "pinch",
      position: { x: e.clientX, y: e.clientY },
      scale,
    });
  }

  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
