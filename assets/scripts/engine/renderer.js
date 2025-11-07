import { rotateVec3, subVec3, normalizeVec3, dotVec3, shadeColor, mixColors } from './math.js';

const SKY_COLORS = {
  day: ['#0e1320', '#1b2540'],
  dusk: ['#1b0f29', '#0b101d'],
  night: ['#04060c', '#0b1528'],
};

export class Renderer {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'game-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);

    this.camera = {
      position: { x: 0, y: 80, z: 120 },
      rotation: { x: -0.35, y: 0, z: 0 },
      fov: 70,
      near: 1,
      far: 800,
    };

    this.sunDirection = normalizeVec3({ x: 0.6, y: 1, z: 0.2 });
    this.ambient = 0.4;
    this.skyMode = 'day';

    this.lastTimestamp = performance.now();
    this.width = 1;
    this.height = 1;

    this.resizeObserver = new ResizeObserver(() => this._resize());
    this.resizeObserver.observe(this.container);
    this._resize();
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.canvas.remove();
  }

  setCameraPosition(x, y, z) {
    this.camera.position.x = x;
    this.camera.position.y = y;
    this.camera.position.z = z;
  }

  setCameraRotation(x, y) {
    this.camera.rotation.x = x;
    this.camera.rotation.y = y;
  }

  setSky(mode) {
    if (SKY_COLORS[mode]) {
      this.skyMode = mode;
    }
  }

  setSunDirection(direction) {
    this.sunDirection = normalizeVec3(direction);
  }

  setAmbient(ambient) {
    this.ambient = ambient;
  }

  render(update) {
    const now = performance.now();
    const delta = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    update(delta);
    this._draw();
    return delta;
  }

  _resize() {
    const { clientWidth, clientHeight } = this.container;
    this.width = Math.max(1, clientWidth);
    this.height = Math.max(1, clientHeight);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  _drawSky() {
    const ctx = this.ctx;
    const [top, bottom] = SKY_COLORS[this.skyMode] ?? SKY_COLORS.day;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  _draw() {
    if (!this.scene) return;
    const ctx = this.ctx;
    this._drawSky();

    const { objects } = this.scene;
    const projectedFaces = [];
    const cam = this.camera;
    const fovScale = 1 / Math.tan((cam.fov * Math.PI) / 360);
    const aspect = this.width / this.height;

    const sinYaw = Math.sin(cam.rotation.y);
    const cosYaw = Math.cos(cam.rotation.y);
    const sinPitch = Math.sin(cam.rotation.x);
    const cosPitch = Math.cos(cam.rotation.x);

    for (const object of objects) {
      if (object.hidden) continue;
      const { mesh, position, rotation = { x: 0, y: 0, z: 0 }, scale = 1 } = object;
      const worldVertices = [];

      for (const vertex of mesh.vertices) {
        const scaled = {
          x: vertex.x * (typeof scale === 'number' ? scale : scale.x ?? 1),
          y: vertex.y * (typeof scale === 'number' ? scale : scale.y ?? 1),
          z: vertex.z * (typeof scale === 'number' ? scale : scale.z ?? 1),
        };
        const rotated = rotateVec3(scaled, rotation);
        worldVertices.push({
          x: rotated.x + position.x,
          y: rotated.y + position.y,
          z: rotated.z + position.z,
        });
      }

      for (const face of mesh.faces) {
        const indices = face.indices;
        const v0 = worldVertices[indices[0]];
        const v1 = worldVertices[indices[1]];
        const v2 = worldVertices[indices[2]];
        const edge1 = subVec3(v1, v0);
        const edge2 = subVec3(v2, v0);
        const normal = normalizeVec3({
          x: edge1.y * edge2.z - edge1.z * edge2.y,
          y: edge1.z * edge2.x - edge1.x * edge2.z,
          z: edge1.x * edge2.y - edge1.y * edge2.x,
        });

        const toCamera = normalizeVec3(subVec3(cam.position, v0));
        const facing = dotVec3(normal, toCamera);
        if (facing <= 0) continue;

        const light = Math.max(this.ambient, dotVec3(normal, this.sunDirection));
        const color = shadeColor(face.color, light);

        const projected = [];
        let clipped = false;
        let depthSum = 0;
        for (const index of indices) {
          const world = worldVertices[index];
          const relative = {
            x: world.x - cam.position.x,
            y: world.y - cam.position.y,
            z: world.z - cam.position.z,
          };

          // Apply yaw rotation
          const yawX = relative.x * cosYaw - relative.z * sinYaw;
          const yawZ = relative.x * sinYaw + relative.z * cosYaw;
          // Apply pitch rotation
          const pitchY = relative.y * cosPitch - yawZ * sinPitch;
          const pitchZ = relative.y * sinPitch + yawZ * cosPitch;

          if (pitchZ < cam.near) {
            clipped = true;
            break;
          }

          const ndcX = (yawX * fovScale) / (pitchZ * aspect);
          const ndcY = (pitchY * fovScale) / pitchZ;
          const screenX = this.width / 2 + ndcX * this.width / 2;
          const screenY = this.height / 2 - ndcY * this.height / 2;
          projected.push({ x: screenX, y: screenY });
          depthSum += pitchZ;
        }

        if (clipped) continue;
        const depth = depthSum / indices.length;
        projectedFaces.push({ points: projected, color, depth, emissive: face.emissive ?? 0 });
      }
    }

    projectedFaces.sort((a, b) => b.depth - a.depth);

    for (const face of projectedFaces) {
      ctx.beginPath();
      face.points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();
      ctx.fillStyle = face.color;
      ctx.fill();

      if (face.emissive > 0) {
        const gradient = ctx.createRadialGradient(
          face.points[0].x,
          face.points[0].y,
          0,
          face.points[0].x,
          face.points[0].y,
          60,
        );
        gradient.addColorStop(0, mixColors('#ffffff', face.color, 0.3));
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = face.emissive;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    if (this.scene.debugOverlay) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '12px monospace';
      let y = 16;
      for (const line of this.scene.debugOverlay) {
        ctx.fillText(line, 12, y);
        y += 14;
      }
    }
  }

  setScene(scene) {
    this.scene = scene;
  }
}
