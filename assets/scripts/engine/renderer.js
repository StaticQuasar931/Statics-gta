import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const SKY_GRADIENTS = {
  day: ['#7ec8ff', '#1a2a44'],
  dusk: ['#f9a26c', '#281638'],
  night: ['#080a16', '#111f3a'],
};

const TMP_VEC = new THREE.Vector3();
const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export class Renderer {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio ?? 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'game-canvas';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SKY_GRADIENTS.day[0]);

    this.camera = new THREE.PerspectiveCamera(64, 1, 0.1, 5000);
    this.camera.position.set(0, 260, 320);
    this.camera.lookAt(0, 0, 0);

    this.ambient = new THREE.AmbientLight('#88baff', 0.7);
    this.keyLight = new THREE.DirectionalLight('#ffffff', 0.65);
    this.keyLight.position.set(180, 360, 200);
    this.keyLight.castShadow = false;
    this.scene.add(this.ambient, this.keyLight);

    this.skyMode = 'day';
    this.scale = 1.8;

    this.staticGroup = new THREE.Group();
    this.entityGroup = new THREE.Group();
    this.scene.add(this.staticGroup, this.entityGroup);

    this.meshCache = new Map();
    this.textureCache = new Map();
    this.raycaster = new THREE.Raycaster();

    this.resizeObserver = new ResizeObserver(() => this._resize());
    this.resizeObserver.observe(this.container);
    this._resize();
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  setSky(mode) {
    if (!SKY_GRADIENTS[mode]) return;
    this.skyMode = mode;
    const [top] = SKY_GRADIENTS[mode];
    this.scene.background = new THREE.Color(top);
    this.ambient.intensity = mode === 'night' ? 0.35 : mode === 'dusk' ? 0.55 : 0.72;
    this.keyLight.intensity = mode === 'night' ? 0.25 : 0.65;
  }

  setScale(scale) {
    this.scale = scale;
  }

  buildStatic({ roads = [], buildings = [], shops = [], assets }) {
    while (this.staticGroup.children.length) {
      const child = this.staticGroup.children.pop();
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }

    const roadGeometry = new THREE.PlaneGeometry(60, 60);
    for (const road of roads) {
      const mesh = new THREE.Mesh(
        roadGeometry,
        new THREE.MeshStandardMaterial({ color: road.district.road, roughness: 0.9, metalness: 0.05 })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(road.x, 0.02, road.y);
      mesh.receiveShadow = true;
      this.staticGroup.add(mesh);
    }

    const buildingGeometry = new THREE.BoxGeometry(54, 90, 54);
    for (const building of buildings) {
      const height = 60 + (building.heightVariance ?? 0);
      const geometry = buildingGeometry.clone();
      geometry.scale(1, height / 90, 1);
      const texture = this._textureFromImage(assets.get(building.spriteKey));
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        color: building.district.building,
        emissive: building.district.accent,
        emissiveIntensity: 0.35,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(building.x, height / 2, building.y);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.staticGroup.add(mesh);
    }

    const shopGeometry = new THREE.CylinderGeometry(12, 12, 22, 24);
    for (const shop of shops) {
      const mesh = new THREE.Mesh(
        shopGeometry,
        new THREE.MeshStandardMaterial({ color: '#4df0ff', emissive: '#0a1a2f', emissiveIntensity: 0.6 })
      );
      mesh.position.set(shop.x, 11, shop.y);
      this.staticGroup.add(mesh);
    }
  }

  renderFrame({ target, heading = 0, vehicles = [], pedestrians = [], loot = [], bullets = [] }) {
    this._updateCamera(target, heading);
    this._updateEntities({ target, vehicles, pedestrians, loot, bullets });
    this.renderer.render(this.scene, this.camera);
  }

  screenToWorld(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(GROUND_PLANE, hit)) {
      return { x: hit.x, y: hit.z };
    }
    return null;
  }

  _updateCamera(target, heading) {
    if (!target) return;
    const chaseDistance = 340 / this.scale;
    const height = 210 / this.scale;
    TMP_VEC.set(
      target.x - Math.cos(heading) * chaseDistance,
      height,
      target.y - Math.sin(heading) * chaseDistance
    );
    this.camera.position.lerp(TMP_VEC, 0.14);
    this.camera.lookAt(target.x, 38, target.y);
  }

  _updateEntities({ target, vehicles, pedestrians, loot, bullets }) {
    this._syncMesh('player', target, { color: '#5df0ff', height: 32, width: 18, depth: 28 });
    vehicles.forEach((vehicle, idx) =>
      this._syncMesh(`vehicle-${idx}`, vehicle, { color: '#f59f65', height: 22, width: 32, depth: 64, texture: vehicle.image })
    );
    pedestrians.forEach((ped, idx) =>
      this._syncMesh(`ped-${idx}`, ped, { color: '#ffffff', height: 28, width: 16, depth: 16, texture: ped.image })
    );
    loot.forEach((cash, idx) => this._syncMesh(`loot-${idx}`, cash, { color: '#00ff9c', height: 12, width: 12, depth: 12 }));
    bullets.forEach((bullet, idx) =>
      this._syncMesh(`bullet-${idx}`, bullet, { color: '#ff9b6b', height: 4, width: 4, depth: 8, yOffset: 8 })
    );

    const activeKeys = new Set([
      'player',
      ...vehicles.map((_, idx) => `vehicle-${idx}`),
      ...pedestrians.map((_, idx) => `ped-${idx}`),
      ...loot.map((_, idx) => `loot-${idx}`),
      ...bullets.map((_, idx) => `bullet-${idx}`),
    ]);

    for (const [key, mesh] of this.meshCache.entries()) {
      if (!activeKeys.has(key)) {
        this.entityGroup.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.meshCache.delete(key);
      }
    }
  }

  _syncMesh(key, obj, { color, height, width, depth, texture, yOffset = 0 }) {
    if (!obj) return;
    let mesh = this.meshCache.get(key);
    if (!mesh) {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshStandardMaterial({
        color,
        map: texture ? this._textureFromImage(texture) : null,
        metalness: 0.1,
        roughness: 0.55,
        emissive: '#0d1828',
        emissiveIntensity: 0.25,
      });
      mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.meshCache.set(key, mesh);
      this.entityGroup.add(mesh);
    }

    mesh.position.set(obj.x, (height / 2 + yOffset) * 0.9, obj.y);
    if (obj.heading !== undefined) {
      mesh.rotation.y = obj.heading - Math.PI / 2;
    }
  }

  _textureFromImage(image) {
    if (!image) return null;
    if (this.textureCache.has(image)) return this.textureCache.get(image);
    const texture = image instanceof HTMLCanvasElement ? new THREE.CanvasTexture(image) : new THREE.Texture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    this.textureCache.set(image, texture);
    return texture;
  }

  _resize() {
    const { clientWidth, clientHeight } = this.container;
    const width = Math.max(1, clientWidth);
    const height = Math.max(1, clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
}
