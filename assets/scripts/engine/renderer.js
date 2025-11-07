const SKY_GRADIENTS = {
  day: ['#7ec8ff', '#1a2a44'],
  dusk: ['#f9a26c', '#281638'],
  night: ['#080a16', '#111f3a'],
};

export class Renderer {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'game-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);

    this.scale = 1.8; // pixels per world unit
    this.skyMode = 'day';
    this.lastTimestamp = performance.now();

    this.resizeObserver = new ResizeObserver(() => this._resize());
    this.resizeObserver.observe(this.container);
    this._resize();
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.canvas.remove();
  }

  setSky(mode) {
    if (SKY_GRADIENTS[mode]) {
      this.skyMode = mode;
    }
  }

  setScale(scale) {
    this.scale = scale;
  }

  renderFrame(camera, drawScene) {
    const now = performance.now();
    const delta = Math.min((now - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = now;

    this._clear();
    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(this.scale, this.scale);
    this.ctx.translate(-camera.x, -camera.y);
    drawScene(this.ctx, delta);
    this.ctx.restore();

    return delta;
  }

  _clear() {
    const ctx = this.ctx;
    const [top, bottom] = SKY_GRADIENTS[this.skyMode] ?? SKY_GRADIENTS.day;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  _resize() {
    const { clientWidth, clientHeight } = this.container;
    this.width = Math.max(1, clientWidth);
    this.height = Math.max(1, clientHeight);
    const ratio = window.devicePixelRatio ?? 1;
    this.canvas.width = this.width * ratio;
    this.canvas.height = this.height * ratio;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
  }
}
