const MOBILE_BREAKPOINT = 840;

export class InputManager {
  constructor(target = window, pointerElement = null) {
    this.target = target;
    this.pointerElement = pointerElement;
    this.keysDown = new Set();
    this.keysPressed = new Set();
    this.pointer = { x: 0, y: 0, down: false };
    this.listeners = new Map();
    this.touchMode = matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
    this.pointerLocked = false;
    this.pointerAnchor = { x: 0, y: 0 };
    this._bind();
  }

  _bind() {
    const down = (event) => {
      this.keysDown.add(event.key.toLowerCase());
      this.keysPressed.add(event.key.toLowerCase());
    };

    const up = (event) => {
      this.keysDown.delete(event.key.toLowerCase());
    };

    const move = (event) => {
      const locked = document.pointerLockElement === this.pointerElement;
      if (locked) {
        const rect = this.pointerElement?.getBoundingClientRect();
        if (!rect) return;
        this.pointerLocked = true;
        this.pointer.x = Math.min(Math.max(rect.left, this.pointer.x + (event.movementX ?? 0)), rect.right);
        this.pointer.y = Math.min(Math.max(rect.top, this.pointer.y + (event.movementY ?? 0)), rect.bottom);
      } else {
        this.pointerLocked = false;
        this.pointer.x = event.clientX;
        this.pointer.y = event.clientY;
      }
    };

    const pointerDown = (event) => {
      this.pointer.down = true;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.keysPressed.add('pointer');
      if (this.pointerElement && document.pointerLockElement !== this.pointerElement) {
        this.requestPointerLock();
      }
    };

    const pointerUp = () => {
      this.pointer.down = false;
    };

    const touchStart = (event) => {
      this.pointer.down = true;
      const touch = event.touches[0];
      if (touch) {
        this.pointer.x = touch.clientX;
        this.pointer.y = touch.clientY;
      }
      this.keysPressed.add('touch');
    };

    const touchMove = (event) => {
      const touch = event.touches[0];
      if (touch) {
        this.pointer.x = touch.clientX;
        this.pointer.y = touch.clientY;
      }
    };

    const touchEnd = () => {
      this.pointer.down = false;
    };

    this._down = down;
    this._up = up;
    this._move = move;
    this._pointerDown = pointerDown;
    this._pointerUp = pointerUp;
    this._touchStart = touchStart;
    this._touchMove = touchMove;
    this._touchEnd = touchEnd;

    this.target.addEventListener('keydown', down);
    this.target.addEventListener('keyup', up);
    this.target.addEventListener('mousemove', move);
    this.target.addEventListener('pointerdown', pointerDown);
    this.target.addEventListener('pointerup', pointerUp);
    this.target.addEventListener('touchstart', touchStart, { passive: true });
    this.target.addEventListener('touchmove', touchMove, { passive: true });
    this.target.addEventListener('touchend', touchEnd);

    this._lockChange = () => {
      const locked = document.pointerLockElement === this.pointerElement;
      this.pointerLocked = locked;
      if (locked) {
        const rect = this.pointerElement?.getBoundingClientRect();
        if (rect) {
          this.pointer.x = rect.left + rect.width / 2;
          this.pointer.y = rect.top + rect.height / 2;
          this.pointerAnchor = { x: this.pointer.x, y: this.pointer.y };
        }
      }
    };
    document.addEventListener('pointerlockchange', this._lockChange);
  }

  resetFrame() {
    this.keysPressed.clear();
  }

  isDown(key) {
    return this.keysDown.has(key.toLowerCase());
  }

  wasPressed(key) {
    return this.keysPressed.has(key.toLowerCase());
  }

  addListener(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
    return () => this.removeListener(type, callback);
  }

  emit(type, payload) {
    const handlers = this.listeners.get(type);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(payload);
    }
  }

  removeListener(type, callback) {
    const handlers = this.listeners.get(type);
    if (!handlers) return;
    handlers.delete(callback);
  }

  destroy() {
    this.target.removeEventListener('keydown', this._down);
    this.target.removeEventListener('keyup', this._up);
    this.target.removeEventListener('mousemove', this._move);
    this.target.removeEventListener('pointerdown', this._pointerDown);
    this.target.removeEventListener('pointerup', this._pointerUp);
    this.target.removeEventListener('touchstart', this._touchStart);
    this.target.removeEventListener('touchmove', this._touchMove);
    this.target.removeEventListener('touchend', this._touchEnd);
    document.removeEventListener('pointerlockchange', this._lockChange);
    this.listeners.clear();
  }

  requestPointerLock() {
    if (this.pointerElement?.requestPointerLock) {
      this.pointerElement.requestPointerLock();
    }
  }
}
