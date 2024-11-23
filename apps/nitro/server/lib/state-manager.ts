type MousePosition = { x: number; y: number };

export class MouseStateManager {
  private static instance: MouseStateManager;
  private position: MousePosition = { x: 0, y: 0 };
  private listeners: ((pos: MousePosition) => void)[] = [];

  private constructor() {}

  static getInstance() {
    if (!MouseStateManager.instance) {
      MouseStateManager.instance = new MouseStateManager();
    }
    return MouseStateManager.instance;
  }

  getPosition() {
    return { ...this.position };
  }

  updatePosition(newPosition: MousePosition) {
    this.position = { ...newPosition };
    this.notifyListeners();
  }

  subscribe(listener: (pos: MousePosition) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.position));
  }
} 