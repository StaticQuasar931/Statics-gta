import THREE from './three.js';

export class Renderer {
  constructor(container, { enableShadows = true } = {}) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#10131a');
    this.scene.fog = new THREE.FogExp2('#0d1320', 0.003);

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 5000);
    this.camera.position.set(0, 120, 160);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, logarithmicDepthBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = enableShadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.mixers = new Set();
    this.postRenderCallbacks = new Set();

    this._setupLights();
    this._setupResponsiveSizing();
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight('#d7e1ff', '#1a2233', 0.8);
    hemi.position.set(0, 400, 0);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight('#ffffff', 1.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 1500;
    sun.shadow.camera.left = -600;
    sun.shadow.camera.right = 600;
    sun.shadow.camera.top = 600;
    sun.shadow.camera.bottom = -600;
    sun.position.set(400, 600, 400);
    this.scene.add(sun);

    this.sunLight = sun;
    this.skyLight = hemi;
  }

  _setupResponsiveSizing() {
    const resize = () => {
      const { clientWidth, clientHeight } = this.container;
      this.camera.aspect = clientWidth / clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(clientWidth, clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', resize);
    this.resize = resize;
    resize();
  }

  setBackgroundColor(color) {
    this.scene.background = new THREE.Color(color);
  }

  setFog({ color, density }) {
    if (color) {
      this.scene.fog.color = new THREE.Color(color);
    }
    if (typeof density === 'number') {
      this.scene.fog.density = density;
    }
  }

  add(object) {
    this.scene.add(object);
  }

  remove(object) {
    this.scene.remove(object);
  }

  addMixer(mixer) {
    this.mixers.add(mixer);
  }

  removeMixer(mixer) {
    this.mixers.delete(mixer);
  }

  onPostRender(callback) {
    this.postRenderCallbacks.add(callback);
    return () => this.postRenderCallbacks.delete(callback);
  }

  updateSunPosition({ azimuth, elevation }) {
    const radius = 1000;
    const elevRadians = THREE.MathUtils.degToRad(elevation);
    const azimuthRadians = THREE.MathUtils.degToRad(azimuth);
    const x = radius * Math.cos(elevRadians) * Math.sin(azimuthRadians);
    const y = radius * Math.sin(elevRadians);
    const z = radius * Math.cos(elevRadians) * Math.cos(azimuthRadians);
    this.sunLight.position.set(x, y, z);
  }

  render(updateCallback) {
    const delta = this.clock.getDelta();
    updateCallback(delta);
    for (const mixer of this.mixers) {
      mixer.update(delta);
    }
    this.renderer.render(this.scene, this.camera);
    for (const callback of this.postRenderCallbacks) {
      callback(delta);
    }
    return delta;
  }
}
