export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = new Map();
        this.presses = new Set();
        this.pointer = { x: canvas.width / 2, y: canvas.height / 2, down: false };
        this.primaryDownHandlers = new Set();
        this.primaryUpHandlers = new Set();
        this.boundKeyDown = (event) => this.onKeyDown(event);
        this.boundKeyUp = (event) => this.onKeyUp(event);
        this.boundPointerDown = (event) => this.onPointerDown(event);
        this.boundPointerUp = (event) => this.onPointerUp(event);
        this.boundPointerMove = (event) => this.onPointerMove(event);
    }

    attach() {
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
        this.canvas.addEventListener('mousedown', this.boundPointerDown);
        window.addEventListener('mouseup', this.boundPointerUp);
        window.addEventListener('mousemove', this.boundPointerMove);
    }

    detach() {
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);
        this.canvas.removeEventListener('mousedown', this.boundPointerDown);
        window.removeEventListener('mouseup', this.boundPointerUp);
        window.removeEventListener('mousemove', this.boundPointerMove);
    }

    onKeyDown(event) {
        if (!event.repeat) {
            this.presses.add(event.code);
        }
        this.keys.set(event.code, true);
    }

    onKeyUp(event) {
        this.keys.set(event.code, false);
        this.presses.delete(event.code);
    }

    onPointerDown(event) {
        if (event.button === 0) {
            this.pointer.down = true;
            this.updatePointerPosition(event);
            this.primaryDownHandlers.forEach((handler) => handler(this.pointer));
        }
    }

    onPointerUp(event) {
        if (event.button === 0) {
            this.pointer.down = false;
            this.updatePointerPosition(event);
            this.primaryUpHandlers.forEach((handler) => handler(this.pointer));
        }
    }

    onPointerMove(event) {
        this.updatePointerPosition(event);
    }

    updatePointerPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
        this.pointer.y = ((event.clientY - rect.top) / rect.height) * this.canvas.height;
    }

    isKeyDown(code) {
        return this.keys.get(code) === true;
    }

    consume(code) {
        if (this.presses.has(code)) {
            this.presses.delete(code);
            return true;
        }
        return false;
    }

    onPrimaryDown(handler) {
        this.primaryDownHandlers.add(handler);
        return () => this.primaryDownHandlers.delete(handler);
    }

    onPrimaryUp(handler) {
        this.primaryUpHandlers.add(handler);
        return () => this.primaryUpHandlers.delete(handler);
    }
}
